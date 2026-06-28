import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit, Trash2, Tag, Loader2, Upload, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import {
  getCatalogCategories,
  getCatalogProducts,
  createCatalogCategory,
  updateCatalogCategory,
  deleteCatalogCategory,
  type BackendCategory,
  type BackendProduct,
} from "../../../lib/api";

export function AdminCategories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category_type: "food" as "food" | "non_food",
    is_active: true,
  });

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const loadData = async () => {
    try {
      const [categoryData, productData] = await Promise.all([
        getCatalogCategories(),
        getCatalogProducts(),
      ]);
      setCategories(categoryData);
      setProducts(productData.results || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load catalog data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryProductCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach((p) => {
      if (p.category?.id) {
        counts[p.category.id] = (counts[p.category.id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === "all" || c.category_type === typeFilter;
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && c.is_active) || 
        (statusFilter === "inactive" && !c.is_active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [categories, searchQuery, typeFilter, statusFilter]);

  const resetForm = () => {
    setFormData({
      name: "",
      category_type: "food",
      is_active: true,
    });
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleEditClick = (category: BackendCategory) => {
    setEditingCategoryId(category.id);
    setFormData({
      name: category.name,
      category_type: category.category_type,
      is_active: category.is_active,
    });
    setSelectedFile(null);
    setImagePreview(category.image_url || null);
    setIsAddDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Image must be under 5MB. File is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDelete = async (categoryId: number, categoryName: string) => {
    const hasProducts = (categoryProductCounts[categoryId] || 0) > 0;
    const confirmMessage = hasProducts 
      ? `Category "${categoryName}" has ${categoryProductCounts[categoryId]} linked products. Deleting it will automatically DEACTIVATE it instead. Do you want to proceed?`
      : `Are you sure you want to delete category "${categoryName}"?`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      const response = await deleteCatalogCategory(categoryId);
      if (response && response.detail) {
        toast.info(response.detail);
        loadData();
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
        toast.success("Category deleted successfully");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete category";
      toast.error(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("name", formData.name.trim());
      data.append("category_type", formData.category_type);
      data.append("is_active", String(formData.is_active));
      if (selectedFile) {
        data.append("image", selectedFile);
      }

      if (editingCategoryId) {
        const updatedCategory = await updateCatalogCategory(editingCategoryId, data);
        setCategories((prev) => prev.map((c) => c.id === editingCategoryId ? updatedCategory : c));
        toast.success("Category updated successfully");
      } else {
        const newCategory = await createCatalogCategory(data);
        setCategories((prev) => [newCategory, ...prev]);
        toast.success("Category created successfully");
      }
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save category";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-slate-500 font-semibold animate-pulse">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Categories</h1>
          <p className="text-slate-500 font-medium">Manage and organize your store's catalog collections.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => { setEditingCategoryId(null); resetForm(); setIsAddDialogOpen(true); }}
              className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] w-full md:max-w-xl p-0 rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
            <div className="bg-primary p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">
                  {editingCategoryId ? "Edit Category" : "New Category"}
                </DialogTitle>
                <p className="text-white/70 text-sm font-medium">Configure category names, classifications, and visibility settings.</p>
              </DialogHeader>
            </div>
            <form className="p-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-400">Category Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. M1V2"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_type" className="text-xs font-black uppercase tracking-widest text-slate-400">Classification Type</Label>
                  <Select
                    value={formData.category_type}
                    onValueChange={(value: "food" | "non_food") => setFormData((prev) => ({ ...prev, category_type: value }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-[15px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="food" className="rounded-lg">Vehicle</SelectItem>
                      <SelectItem value="non_food" className="rounded-lg">Spare Parts</SelectItem>
      
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-black uppercase tracking-widest text-slate-400">Status</Label>
                  <Select
                    value={formData.is_active ? "active" : "inactive"}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, is_active: value === "active" }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-[15px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="active" className="rounded-lg">Active (Visible)</SelectItem>
                      <SelectItem value="inactive" className="rounded-lg">Inactive (Hidden)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Category Image (Optional)</Label>
                  <div className="flex gap-3">
                    {imagePreview ? (
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                        <img src={imagePreview} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setImagePreview(null); }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all group">
                        <Upload className="w-5 h-5 text-slate-300 group-hover:text-primary mb-1" />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-primary uppercase">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                    )}
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 leading-tight">
                        Optional image to display on category cards. Max 5MB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="flex-1 h-12 rounded-xl font-bold border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Category"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-[2rem] border border-slate-200/50 shadow-xl shadow-slate-100/40">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by category name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-slate-50 border-slate-100 hover:border-slate-200 focus:bg-white transition-all rounded-xl text-[15px]"
          />
        </div>

        <div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 hover:border-slate-200 focus:bg-white transition-all text-[15px] text-slate-600 font-medium">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="food">Vehicles</SelectItem>
              <SelectItem value="non_food">Spare Parts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 hover:border-slate-200 focus:bg-white transition-all text-[15px] text-slate-600 font-medium">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active (Visible)</SelectItem>
              <SelectItem value="inactive">Inactive (Hidden)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="bg-white border border-slate-200/50 rounded-[2.5rem] p-16 text-center shadow-xl shadow-slate-100/40">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <Tag className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">No categories found</h3>
          <p className="text-slate-500 font-semibold max-w-sm mx-auto">
            Try adjusting your search queries or filter settings, or add a brand new category to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/50 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-100/40">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Category Name</th>
                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Slug ID</th>
                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Classification</th>
                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Products Link</th>
                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.map((category) => {
                  const productCount = categoryProductCounts[category.id] || 0;
                  return (
                    <tr key={category.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          {category.image_url ? (
                            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shadow-sm group-hover:scale-110 transition-transform">
                              <img
                                src={category.image_url.replace("/upload/", "/upload/f_auto,q_auto,w_64/")}
                                alt={category.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <Tag className="w-4.5 h-4.5" />
                            </div>
                          )}
                          <span className="font-extrabold text-[15px] text-slate-900">{category.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 font-semibold text-slate-500 text-sm">{category.slug}</td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                          category.category_type === "food"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50"
                            : "bg-amber-50 text-amber-600 border border-amber-100/50"
                        }`}>
                          {category.category_type === "food" ? "Vehicle" : "Spare Parts" }
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold ${
                          productCount > 0 
                            ? "bg-slate-100 text-slate-700 font-extrabold" 
                            : "bg-slate-50 text-slate-400 font-medium"
                        }`}>
                          {productCount} {productCount === 1 ? "product" : "products"}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            category.is_active 
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                              : "bg-slate-300"
                          }`} />
                          <span className="text-sm font-extrabold text-slate-600">
                            {category.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditClick(category)}
                            className="w-9 h-9 rounded-xl border-slate-200 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all"
                            title="Edit Category"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(category.id, category.name)}
                            className="w-9 h-9 rounded-xl border-slate-200 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
