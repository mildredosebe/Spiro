import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Upload, X, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import {
  createCatalogProduct,
  updateCatalogProduct, 
  deleteCatalogProduct,
  deleteProductImage,
  type BackendProduct,
} from "../../../lib/api";
import { ProductImage } from "../../../lib/catalog/types";
import { usePaginatedProducts, useCatalogCategories } from "../../../lib/hooks";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function AdminProducts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    category_id: "",
    description: "",
    image_url: "",
    is_active: true,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  
  const [existingGalleryImages, setExistingGalleryImages] = useState<ProductImage[]>([]);

  // Debounce search — resets to page 1 on change
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { products, totalCount, totalPages, loading, revalidate } =
    usePaginatedProducts(page, debouncedSearch);
  const { categories: rawCategories } = useCatalogCategories();
  const categories = rawCategories.filter((c) => c.is_active);

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      stock: "",
      category_id: "",
      description: "",
      image_url: "",
      is_active: true,
    });
    setSelectedFile(null);
    setImagePreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setExistingGalleryImages([]);
  };

  const handleDelete = async (productId: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this product? If it has orders, it will be deactivated instead.");
    if (!confirmed) return;

    try {
      await deleteCatalogProduct(productId);
      revalidate();
      toast.success("Product processed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete product";
      toast.error(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.category_id) {
      toast.error("Please select a category");
      return;
    }

    if (Number(formData.price) < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("name", formData.name.trim());
      data.append("description", formData.description.trim());
      data.append("price", formData.price);
      data.append("stock", formData.stock);
      data.append("category_id", formData.category_id);
      data.append("is_active", String(formData.is_active));
      
      if (selectedFile) {
        data.append("image", selectedFile);
      }

      galleryFiles.forEach((file) => {
        data.append("gallery", file);
      });

      if (editingProductId) {
        await updateCatalogProduct(editingProductId, data);
        toast.success("Product updated");
      } else {
        await createCatalogProduct(data);
        toast.success("Product added");
      }
      revalidate();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save product";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (product: BackendProduct) => {
    setEditingProductId(product.id);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category_id: product.category.id.toString(),
      description: product.description,
      image_url: product.image_url,
      is_active: product.is_active,
    });
    setSelectedFile(null);
    setImagePreview(product.image_url);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setExistingGalleryImages(product.gallery || []);
    setIsAddDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Primary image must be under 5MB. File is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Gallery image "${file.name}" exceeds 5MB limit and was skipped.`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      setGalleryFiles((prev) => [...prev, ...validFiles]);
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setGalleryPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeNewGalleryImage = (index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingGalleryImage = async (imageId: number) => {
    if (!editingProductId) return;
    setDeletingImageId(imageId);
    try {
      await deleteProductImage(editingProductId, imageId);
      setExistingGalleryImages((prev) => prev.filter((img) => img.id !== imageId));
      revalidate();
      toast.success("Gallery image deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete image";
      toast.error(message);
    } finally {
      setDeletingImageId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Products</h1>
          <p className="text-slate-500 font-medium">
            {loading ? "Loading..." : `${totalCount} products in your catalog.`}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => { setEditingProductId(null); resetForm(); setIsAddDialogOpen(true); }}
              className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] w-full lg:max-w-6xl p-0 rounded-[2.5rem] border-none shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-primary p-8 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">{editingProductId ? "Edit Product" : "New Product"}</DialogTitle>
                <p className="text-white/70 text-sm font-medium">Fill in the details to update your catalog.</p>
              </DialogHeader>
            </div>
            <form className="p-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-400">Product Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Premium Avocado"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-xs font-black uppercase tracking-widest text-slate-400">Price (KSh)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock" className="text-xs font-black uppercase tracking-widest text-slate-400">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-black uppercase tracking-widest text-slate-400">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger id="category" className="h-12 rounded-xl bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-slate-400">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell customers about this product..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="rounded-xl bg-slate-50 border-slate-200 min-h-[100px]"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Product Images (Max 5MB each)</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-slate-400 uppercase">Primary Image</Label>
                      <div className="flex gap-3">
                        {imagePreview ? (
                          <div className="relative w-32 h-32 rounded-3xl overflow-hidden border-2 border-primary shadow-lg group">
                            <img src={imagePreview} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => { setSelectedFile(null); setImagePreview(null); }}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                            >
                              <X className="w-6 h-6 text-white" />
                            </button>
                          </div>
                        ) : (
                          <label className="w-32 h-32 rounded-3xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all group">
                            <Upload className="w-6 h-6 text-slate-300 group-hover:text-primary mb-2" />
                            <span className="text-[10px] font-black text-slate-400 group-hover:text-primary uppercase">Upload</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                          </label>
                        )}
                        <div className="flex-1 space-y-2">
                           <p className="text-[10px] font-bold text-slate-400 leading-tight">Displayed as the main product card image.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-slate-400 uppercase">Gallery (Multiple)</Label>
                      <div className="flex flex-wrap gap-2">
                        {/* Existing images */}
                        {existingGalleryImages.map((img) => (
                          <div key={img.id} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 group">
                            <img src={img.image_url} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeExistingGalleryImage(img.id)}
                              disabled={deletingImageId === img.id}
                              className="absolute inset-0 bg-rose-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all disabled:opacity-100 disabled:bg-rose-500/50"
                            >
                              {deletingImageId === img.id ? (
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              ) : (
                                <X className="w-4 h-4 text-white" />
                              )}
                            </button>
                          </div>
                        ))}
                        
                        {/* New preview images */}
                        {galleryPreviews.map((url, idx) => (
                          <div key={`new-${idx}`} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-primary/50 group">
                            <img src={url} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeNewGalleryImage(idx)}
                              className="absolute inset-0 bg-rose-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                            <div className="absolute bottom-0 inset-x-0 bg-primary/80 text-[8px] text-white font-bold text-center py-0.5">NEW</div>
                          </div>
                        ))}

                        <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 flex items-center justify-center cursor-pointer transition-all group">
                          <Plus className="w-5 h-5 text-slate-300 group-hover:text-primary" />
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleGalleryChange} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="is_active"
                    className="w-5 h-5 rounded-lg border-slate-300 text-primary focus:ring-primary cursor-pointer transition-all"
                    checked={formData.is_active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <Label htmlFor="is_active" className="text-sm font-bold text-slate-700 cursor-pointer">
                    Visible in Storefront
                  </Label>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <Button type="submit" className="flex-1 h-14 rounded-2xl font-black shadow-lg" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                    </span>
                  ) : (
                    editingProductId ? "Save Changes" : "Create Product"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 px-8 rounded-2xl font-bold"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search products by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-16 pl-14 pr-8 bg-white border-slate-200/60 rounded-[1.5rem] shadow-sm text-lg font-medium focus:ring-4 focus:ring-primary/5 transition-all"
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em] border-b border-slate-100">
                <th className="py-6 px-8">Product Details</th>
                <th className="py-6 px-8">Category</th>
                <th className="py-6 px-8">Price</th>
                <th className="py-6 px-8">Inventory</th>
                <th className="py-6 px-8">Status</th>
                <th className="py-6 px-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map((product) => (
                <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-sm border border-slate-200 shrink-0">
                        <img
                          src={product.image_url ? product.image_url.replace("/upload/", "/upload/f_auto,q_auto,w_64/") : "https://images.unsplash.com/photo-1542838132-92c53300491e?w=64&h=64&fit=crop"}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 leading-tight mb-1">{product.name}</p>
                        <p className="text-xs text-slate-400 font-medium line-clamp-1 max-w-[200px]">
                          {product.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-8">
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
                      {product.category.name}
                    </span>
                  </td>
                  <td className="py-6 px-8">
                    <span className="font-black text-slate-900">KSh {Number(product.price).toFixed(2)}</span>
                  </td>
                  <td className="py-6 px-8">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-0.5">
                        <span className={product.stock < 10 ? "text-rose-500" : "text-emerald-500"}>
                          {product.stock} Units
                        </span>
                      </div>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${product.stock < 10 ? "bg-rose-500" : "bg-emerald-500"}`} 
                          style={{ width: `${Math.min(product.stock, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-8">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      product.is_active 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${product.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {product.is_active ? "Active" : "Inactive"}
                    </div>
                  </td>
                  <td className="py-6 px-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleEditClick(product)}
                        className="w-10 h-10 rounded-xl hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(product.id)}
                        className="w-10 h-10 rounded-xl hover:bg-destructive/10 hover:text-destructive text-slate-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Search className="w-8 h-8" />
                      </div>
                      <p className="text-slate-500 font-bold">No products found</p>
                      <Button variant="link" onClick={() => setSearchQuery("")} className="text-primary font-bold">Clear filters</Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-900">{(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)}</span>
              {" "}of <span className="font-bold text-slate-900">{totalCount}</span> products
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl font-bold"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  typeof item === "string" ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-bold">…</span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === page ? "default" : "outline"}
                      size="sm"
                      className={`rounded-xl w-10 font-bold ${
                        item === page ? "shadow-md" : ""
                      }`}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </Button>
                  )
                )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl font-bold"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
