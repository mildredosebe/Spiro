import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { SlidersHorizontal, LayoutGrid, Check, Search } from "lucide-react";
import { ProductCard } from "../../../components/ProductCard";
import { Product } from "../../../lib/types";
import { Button } from "../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Slider } from "../../../components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../../components/ui/sheet";
import { type BackendCategory, type BackendProduct } from "../../../lib/api";
import { useInfiniteProducts, useCatalogCategories } from "../../../lib/hooks";

interface CategoryPill {
  id: string;
  name: string;
}

export function Categories() {
  const { categoryId } = useParams();
  const [selectedCategory, setSelectedCategory] = useState(categoryId || "all");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [sortBy, setSortBy] = useState("popularity");
  
  const orderingMap: Record<string, string> = {
    "popularity": "popularity",
    "price-low": "price",
    "price-high": "-price",
    "rating": "rating",
  };

  const {
    products: backendProducts,
    totalCount,
    hasMore,
    loadMore,
    loading: loadingProducts,
    loadingMore,
  } = useInfiniteProducts({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    ordering: orderingMap[sortBy],
    price_min: priceRange[0] > 0 ? priceRange[0] : undefined,
    price_max: priceRange[1] < 5000 ? priceRange[1] : undefined,
  });

  const { categories: backendCategories, loading: loadingCategories } = useCatalogCategories();

  const toProduct = (item: BackendProduct): Product => ({
    id: String(item.id),
    name: item.name,
    price: Number(item.price),
    description: item.description,
    image: item.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    category: item.category.slug,
    rating: Number(item.average_rating ?? 0),
    reviews: Number(item.reviews_count ?? 0),
    stock: item.stock,
  });

  const products = useMemo(() => backendProducts.filter((p) => p.is_active).map(toProduct), [backendProducts]);

  const categories = useMemo(() => {
    return backendCategories
      .filter((item) => item.is_active)
      .map((item) => ({ id: item.slug, name: item.name }));
  }, [backendCategories]);
  
  const loading = loadingProducts || loadingCategories;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-12 animate-fade-in">
      {/* ── Header Area ─────────────────────────── */}
      <div className="bg-white border-b border-border/50 sticky top-[68px] z-30 shadow-[0_4px_20px_-10px_rgba(11,46,89,0.05)]">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Title & Count */}
            <div className="flex items-center justify-between md:justify-start gap-4">
              <h1 className="text-2xl md:text-3xl font-black text-primary flex items-center gap-2">
                <LayoutGrid className="w-6 h-6 text-[#f4c430]" />
                Explore
              </h1>
              {!loading && (
                <span className="bg-secondary text-primary font-bold text-xs px-3 py-1 rounded-full border border-border/60">
                  {totalCount} items
                </span>
              )}
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="rounded-full font-bold border-primary/20 hover:bg-secondary hover:text-primary transition-all text-sm h-10 px-5 gap-2">
                    <SlidersHorizontal className="w-4 h-4" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:max-w-[400px] rounded-l-[2rem] border-l-0 shadow-2xl">
                  <SheetHeader className="mb-8">
                    <SheetTitle className="text-2xl font-black text-primary">Filter Products</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-base font-bold text-primary">Price Range</label>
                        <span className="text-sm font-semibold text-primary/70">
                          KSh {priceRange[0]} - KSh {priceRange[1]}
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={5000}
                        step={100}
                        value={priceRange}
                        onValueChange={setPriceRange}
                        className="py-4"
                      />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-10 rounded-full font-bold border-primary/20 bg-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl border-border/50">
                  <SelectItem value="popularity" className="font-semibold rounded-xl">Most Popular</SelectItem>
                  <SelectItem value="price-low" className="font-semibold rounded-xl">Price: Low to High</SelectItem>
                  <SelectItem value="price-high" className="font-semibold rounded-xl">Price: High to Low</SelectItem>
                  <SelectItem value="rating" className="font-semibold rounded-xl">Top Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Pills */}
          <div className="mt-4 md:mt-5 flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-hide px-0.5">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 h-10 px-5 rounded-full text-sm font-bold transition-all ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2"
                  : "bg-secondary text-primary hover:bg-secondary/80 border border-border/50"
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 h-10 px-5 rounded-full text-sm font-bold transition-all ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2"
                    : "bg-white text-primary hover:bg-secondary/80 border border-border/60"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Mobile Filters */}
          <div className="flex md:hidden items-center gap-2 mt-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 rounded-xl font-bold h-10 bg-white">
                  <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[2rem] h-[50vh]">
                <SheetHeader className="mb-6 text-left">
                  <SheetTitle className="text-xl font-black text-primary">Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold mb-3 flex justify-between">
                      Price Range
                      <span className="text-primary/70">KSh {priceRange[0]} - {priceRange[1]}</span>
                    </label>
                    <Slider min={0} max={5000} step={100} value={priceRange} onValueChange={setPriceRange} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="flex-1 rounded-xl font-bold h-10 bg-white">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="popularity" className="font-semibold">Popular</SelectItem>
                <SelectItem value="price-low" className="font-semibold">Price: Low</SelectItem>
                <SelectItem value="price-high" className="font-semibold">Price: High</SelectItem>
                <SelectItem value="rating" className="font-semibold">Top Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Products Grid ───────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 py-4 md:py-6">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="rounded-xl bg-white border border-border/40 p-2 space-y-2">
                <div className="shimmer aspect-square rounded-lg" />
                <div className="shimmer h-3 rounded-full w-3/4" />
                <div className="shimmer h-3 rounded-full w-1/2" />
                <div className="shimmer h-7 rounded-lg" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-[2rem] border border-border/50 shadow-sm px-4">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-primary/30" />
            </div>
            <h3 className="text-2xl font-black text-primary mb-2">No products found</h3>
            <p className="text-muted-foreground font-medium max-w-sm">
              We couldn't find anything matching your current filters. Try adjusting the price range or category.
            </p>
            <Button 
              onClick={() => { setSelectedCategory("all"); setPriceRange([0, 5000]); }}
              className="mt-6 rounded-full font-bold px-8 h-12 bg-primary text-white hover:bg-primary/90"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {products.map((product, i) => (
                <div key={product.id} className="animate-fade-up" style={{ animationDelay: `${(i % 10) * 0.05}s` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
            
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-8 flex justify-center h-20">
              {loadingMore && (
                <div className="flex items-center gap-3 text-primary/60">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm font-semibold">Loading more products...</span>
                </div>
              )}
              {!hasMore && products.length > 0 && (
                <p className="text-xs text-muted-foreground font-medium">
                  You've seen all {totalCount} products
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
