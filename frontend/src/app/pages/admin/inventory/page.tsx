import { useEffect, useMemo, useState } from "react";
import { Search, AlertTriangle, Package } from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";
import { toast } from "sonner";
import { getCatalogProducts, type BackendProduct } from "../../../lib/api";

export function AdminInventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    try {
      const data = await getCatalogProducts({ page_size: 1000 });
      setProducts(data.results || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load inventory";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    const intervalId = window.setInterval(loadProducts, 8000);
    const handleFocus = loadProducts;
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [products, searchQuery]
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const lowStockProducts = useMemo(() => products.filter((p) => p.stock < 20), [products]);
  const totalStock = useMemo(() => products.reduce((sum, p) => sum + p.stock, 0), [products]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-slate-500 font-medium">Monitor stock levels and warehouse health.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Tracked SKUs", value: products.length, color: "text-slate-900", bg: "bg-slate-100" },
          { label: "Total Units", value: totalStock.toLocaleString(), color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Low Stock Items", value: lowStockProducts.length, color: "text-rose-600", bg: "bg-rose-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{s.label}</p>
            <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-rose-50/50 rounded-[2.5rem] p-8 border border-rose-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-rose-900 leading-none mb-1">Critical Alerts</h2>
              <p className="text-rose-600 text-xs font-bold uppercase tracking-wider">Replenishment required immediately</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-rose-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100">
                    <img src={product.image_url || "/placeholder.jpg"} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 leading-none mb-1">{product.name}</p>
                    <p className="text-rose-600 text-[10px] font-black uppercase tracking-wider">{product.stock} units remaining</p>
                  </div>
                </div>
                <Button size="sm" className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 h-9 font-bold">Restock</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search warehouse by SKU name..."
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
                <th className="py-6 px-8">Product Name</th>
                <th className="py-6 px-8">Category</th>
                <th className="py-6 px-8">Stock Balance</th>
                <th className="py-6 px-8">Status</th>
                <th className="py-6 px-8 text-right">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedProducts.map((product) => {
                const stockStatus = product.stock === 0 ? "OUT" : product.stock < 10 ? "CRITICAL" : product.stock < 20 ? "LOW" : "GOOD";
                const barColor = stockStatus === "OUT" ? "bg-rose-500" : stockStatus === "CRITICAL" ? "bg-amber-500" : stockStatus === "LOW" ? "bg-indigo-500" : "bg-emerald-500";
                
                return (
                  <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                          <img src={product.image_url || "/placeholder.jpg"} className="w-full h-full object-cover" />
                        </div>
                        <p className="font-black text-slate-900">{product.name}</p>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {product.category.name}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-900">{product.stock} Units</span>
                          <span className="text-slate-400">{Math.min(product.stock, 100)}%</span>
                        </div>
                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${Math.min(product.stock, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        stockStatus === "OUT" ? "bg-rose-50 text-rose-600" : stockStatus === "CRITICAL" ? "bg-amber-50 text-amber-600" : stockStatus === "LOW" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                           stockStatus === "OUT" ? "bg-rose-500" : stockStatus === "CRITICAL" ? "bg-amber-500" : stockStatus === "LOW" ? "bg-indigo-500" : "bg-emerald-500"
                        }`} />
                        {stockStatus === "OUT" ? "Out of Stock" : stockStatus === "CRITICAL" ? "Critical" : stockStatus === "LOW" ? "Low Stock" : "Healthy"}
                      </div>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <Button variant="ghost" size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-100">Logs</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-white">
            <p className="text-sm font-medium text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredProducts.length)}</span>
              {" "}of <span className="font-bold text-slate-900">{filteredProducts.length}</span> products
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="rounded-xl font-bold" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
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
                    <Button key={item} variant={item === page ? "default" : "outline"} size="sm" className={`rounded-xl w-10 font-bold ${item === page ? "shadow-md" : ""}`} onClick={() => setPage(item as number)}>{item}</Button>
                  )
                )}
              <Button variant="outline" size="sm" className="rounded-xl font-bold" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
