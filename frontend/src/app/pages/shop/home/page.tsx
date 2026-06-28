import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, Zap, X, ShoppingBag, BatteryCharging, ArrowRight } from "lucide-react";
import { Product } from "../../../lib/types";
import { Button } from "../../../components/ui/button";
import { type BackendProduct, isAuthenticated } from "../../../lib/api";
import { useCatalogProducts, useCatalogCategories, useDailyProducts } from "../../../lib/hooks";
import { AddToCartButton } from "../../../components/AddToCartButton";
import { motion, AnimatePresence } from "motion/react";

// ---------------------------------------------------------------------------Button 
// Helpers
// ---------------------------------------------------------------------------

function cloudinaryOptimised(url: string, width: number): string {
  if (!url) return "";
  if (url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
  }
  return url;
}

function toKsh(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function toProduct(item: BackendProduct): Product {
  return {
    id: String(item.id),
    name: item.name,
    price: Number(item.price),
    description: item.description,
    image:
      item.image_url ||
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80",
    category: item.category.slug,
    rating: Number(item.average_rating ?? 0),
    reviews: Number(item.reviews_count ?? 0),
    stock: item.stock,
  };
}

// ---------------------------------------------------------------------------
// Hero Section
// ---------------------------------------------------------------------------

function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl animate-fade-up" style={{ minHeight: "280px" }}>
      <img
        src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1600&q=80"
        alt="Spiro electric motorcycle"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f5132]/95 via-[#0f5132]/75 to-[#0f5132]/20" />

      <div className="relative z-10 flex h-full flex-col justify-center gap-4 p-6 md:p-10 max-w-xl">
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#f4c430] px-3 py-1 text-xs font-bold text-[#0f5132]">
          <Zap className="w-3.5 h-3.5" /> Now in stock
        </span>

        <h1 className="text-2xl md:text-4xl font-black text-white leading-tight [font-family:'Sora','Segoe_UI',sans-serif]">
          Ride electric.
          <br />
          Go further, spend less.
        </h1>

        <p className="text-sm md:text-base text-white/85 font-medium max-w-md">
          Shop Spiro electric motorcycles and genuine spare parts, with Swap &amp; Go battery exchange to keep you on the road.
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          <Link to="/categories">
            <Button className="h-11 px-6 rounded-full bg-[#f4c430] text-[#0f5132] font-bold hover:bg-[#f4c430]/90 btn-glow transition-all">
              Shop Motorcycles <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
          </Link>
          <Link to="/categories">
            <Button
              variant="outline"
              className="h-11 px-6 rounded-full border-2 border-white/60 bg-white/10 text-white hover:bg-white/20 font-semibold transition-all"
            >
              Shop Parts
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-4 pt-2 text-white/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-[#f4c430]" /> Up to 85 km/h
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <BatteryCharging className="w-3.5 h-3.5 text-[#f4c430]" /> Swap &amp; Go batteries
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Product Card (extracted for reuse across rows)
// ---------------------------------------------------------------------------

interface ProductCardProps {
  product: Product;
  index: number;
}

function ProductCard({ product, index }: ProductCardProps) {
  return (
    <div
      className="group rounded-xl bg-white border border-border/50 card-lift overflow-hidden flex flex-col"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <Link
        to={`/product/${product.id}`}
        className="block relative overflow-hidden bg-[#f7f8fb]"
      >
        <img
          src={cloudinaryOptimised(product.image, 300)}
          alt={product.name}
          className="aspect-square w-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </Link>
      <div className="p-2 flex flex-col flex-1">
        <Link to={`/product/${product.id}`} className="block mb-1.5">
          <p className="line-clamp-2 text-xs font-semibold text-primary leading-snug mb-1 group-hover:text-primary/80 transition-colors">
            {product.name}
          </p>
          <p className="text-sm font-black text-primary tracking-tight">
            {toKsh(product.price)}
          </p>
        </Link>
        <div className="mt-auto pt-1">
          <AddToCartButton product={product} fullWidth />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category Row
// ---------------------------------------------------------------------------

interface CategoryRowProps {
  categoryName: string;
  categorySlug: string;
  products: Product[];
  rowIndex: number;
}

function CategoryRow({
  categoryName,
  categorySlug,
  products,
  rowIndex,
}: CategoryRowProps) {
  return (
    <section
      className="animate-fade-up"
      style={{ animationDelay: `${0.1 + rowIndex * 0.08}s` }}
    >
      {/* Row header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-primary">{categoryName}</h2>
        <Link
          to={`/categories/${categorySlug}`}
          className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          See All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 4-column product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-2">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader for a single row
// ---------------------------------------------------------------------------

function CategoryRowSkeleton() {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="shimmer h-4 w-32 rounded-full" />
        <div className="shimmer h-3 w-12 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-white border border-border/40 p-2 space-y-2"
          >
            <div className="shimmer aspect-square rounded-lg" />
            <div className="shimmer h-3 rounded-full w-3/4" />
            <div className="shimmer h-3 rounded-full w-1/2" />
            <div className="shimmer h-7 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Max number of category rows shown on the homepage
// ---------------------------------------------------------------------------
const MAX_ROWS = 4;
const PRODUCTS_PER_ROW = 4;

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

export function Home() {
  const navigate = useNavigate();
  const { products: dailyProducts, loading: loadingDailyProducts } = useDailyProducts();
  const { products: backendProducts, loading: loadingProducts } = useCatalogProducts();
  const { categories: backendCategories, loading: loadingCategories } = useCatalogCategories();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      const timer = setTimeout(() => setShowWelcome(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissWelcome = () => setShowWelcome(false);

  // ── Active daily products ──────────────────────────────────────────────────
  const activeDailyProducts = useMemo(
    () => dailyProducts.filter((item) => item.is_active),
    [dailyProducts]
  );

  const activeBackendProducts = useMemo(
    () => backendProducts.filter((item) => item.is_active),
    [backendProducts]
  );

  // ── Group daily products by category, top-up & overflow to fill MAX_ROWS ──
  // Strategy:
  // 1. Seed each category row from daily products.
  // 2. Top-up each row from the full catalog until it has PRODUCTS_PER_ROW.
  // 3. Show ALL category rows (even partially filled ones if catalog is thin).
  // 4. If total rows < MAX_ROWS, generate "More [Category]" overflow rows
  //    from the richest categories (most remaining unseen products) until
  //    we reach MAX_ROWS — so the page always looks stocked.
  const categoryRows = useMemo(() => {
    // Build per-slug catalog index
    const catalogBySlug = new Map<string, BackendProduct[]>();
    for (const item of activeBackendProducts) {
      if (!item.is_active) continue;
      const slug = item.category.slug;
      if (!catalogBySlug.has(slug)) catalogBySlug.set(slug, []);
      catalogBySlug.get(slug)!.push(item);
    }

    // Track which product IDs we've already shown per slug (dedup across rows)
    const shownBySlug = new Map<string, Set<string>>();

    // Seed rows from daily products
    const rowMap = new Map<
      string,
      { slug: string; name: string; products: Product[] }
    >();

    for (const item of activeDailyProducts) {
      const { slug, name } = item.category;
      if (!rowMap.has(slug)) {
        rowMap.set(slug, { slug, name, products: [] });
        shownBySlug.set(slug, new Set());
      }
      const row = rowMap.get(slug)!;
      const seen = shownBySlug.get(slug)!;
      if (row.products.length < PRODUCTS_PER_ROW && !seen.has(String(item.id))) {
        row.products.push(toProduct(item));
        seen.add(String(item.id));
      }
    }

    // Top-up short rows from the full catalog
    for (const row of rowMap.values()) {
      if (row.products.length >= PRODUCTS_PER_ROW) continue;
      const seen = shownBySlug.get(row.slug)!;
      for (const extra of catalogBySlug.get(row.slug) ?? []) {
        if (row.products.length >= PRODUCTS_PER_ROW) break;
        if (!seen.has(String(extra.id))) {
          row.products.push(toProduct(extra));
          seen.add(String(extra.id));
        }
      }
    }

    // Build the final list — include all category rows (even partial ones)
    const rows: { slug: string; name: string; products: Product[] }[] = [
      ...rowMap.values(),
    ].slice(0, MAX_ROWS);

    // ── Overflow rows ──────────────────────────────────────────────────────
    // If we still need more rows, keep pulling the next batch of products
    // from the categories (in order) that have remaining unseen items.
    if (rows.length < MAX_ROWS) {
      // Build ordered list of slugs that have remaining catalog products
      const slugOrder = [...rowMap.keys()];

      let attempt = 0;
      while (rows.length < MAX_ROWS && attempt < slugOrder.length * MAX_ROWS) {
        const slug = slugOrder[attempt % slugOrder.length];
        attempt++;

        const seen = shownBySlug.get(slug) ?? new Set<string>();
        const catProducts = catalogBySlug.get(slug) ?? [];
        const batch: Product[] = [];

        for (const item of catProducts) {
          if (batch.length >= PRODUCTS_PER_ROW) break;
          if (!seen.has(String(item.id))) {
            const p = toProduct(item);
            batch.push(p);
            seen.add(p.id);
          }
        }

        if (batch.length > 0) {
          shownBySlug.set(slug, seen);
          const catName = rowMap.get(slug)!.name;
          rows.push({ slug, name: `More ${catName}`, products: batch });
        }
      }
    }

    return rows;
  }, [activeDailyProducts, activeBackendProducts]);

  // ── Sidebar categories ────────────────────────────────────────────────────
  const categoriesWithProducts = useMemo(() => {
    const categoryCounts = new Map<number, number>();
    const categoryImages = new Map<number, string>();

    activeBackendProducts.forEach((product) => {
      const category = product.category;
      if (!category?.id || !category.is_active) return;
      categoryCounts.set(category.id, (categoryCounts.get(category.id) || 0) + 1);
      if (!categoryImages.has(category.id) && product.image_url) {
        categoryImages.set(category.id, product.image_url);
      }
    });

    return backendCategories
      .filter(
        (category) =>
          category.is_active && (categoryCounts.get(category.id) || 0) > 0
      )
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image:
          category.image_url ||
          categoryImages.get(category.id) ||
          "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=150&h=150&fit=crop",
      }));
  }, [activeBackendProducts, backendCategories]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white pb-24 md:pb-10">

      {/* ── Welcome Modal ── */}
      <AnimatePresence>
        {showWelcome && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dismissWelcome}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white"
            >
              <button
                onClick={dismissWelcome}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 text-primary/60 hover:bg-black/10 hover:text-primary transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="h-32 bg-gradient-to-br from-[#0f5132] to-[#1f8a52] relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80')] opacity-20 bg-cover bg-center mix-blend-overlay" />
                <div className="absolute w-40 h-40 bg-[#f4c430]/20 rounded-full blur-2xl top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center relative z-10 rotate-3">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                </div>
              </div>

              <div className="p-6 md:p-8 text-center">
                <h2 className="text-2xl font-black text-primary mb-3">
                  Welcome to Spiro! 👋
                </h2>
                <p className="text-muted-foreground font-medium mb-6 leading-relaxed text-sm">
                  Your destination for electric motorcycles, genuine spare
                  parts, and fast delivery in Nairobi. Join thousands of
                  riders already on the road with Spiro.
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    className="w-full h-12 rounded-xl bg-[#f4c430] text-primary hover:bg-[#f4c430]/90 font-bold text-base shadow-lg shadow-[#f4c430]/20 btn-glow"
                    onClick={() => {
                      dismissWelcome();
                      navigate("/signup");
                    }}
                  >
                    Create Free Account
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl font-bold border-2 border-border hover:bg-secondary hover:text-primary transition-colors"
                    onClick={dismissWelcome}
                  >
                    View Our Products
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-6 font-semibold">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="mx-auto w-full max-w-[1600px] px-3 py-3 md:px-5 md:py-4">
        <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,4.5fr)_minmax(0,1fr)] gap-4">

          {/* ── Left Sidebar — Desktop ── */}
          <div className="hidden xl:flex xl:flex-col space-y-3">
            <section className="bg-white rounded-xl p-3 border border-border/60 animate-fade-up">
              <h2 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                Shop by Category
              </h2>
              <div className="space-y-0.5">
                {loadingCategories || loadingProducts ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <div className="shimmer w-7 h-7 rounded-lg" />
                      <div className="shimmer h-3 rounded-full w-2/3" />
                    </div>
                  ))
                ) : categoriesWithProducts.length === 0 ? (
                  <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                    No active categories yet.
                  </p>
                ) : (
                  categoriesWithProducts.map((item) => (
                    <Link
                      key={item.id}
                      to={`/categories/${item.slug}`}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-border/30">
                        <img
                          src={cloudinaryOptimised(item.image, 60)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-semibold text-xs text-primary/80 group-hover:text-primary transition-colors truncate">
                        {item.name}
                      </span>
                      <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ── Main Center Feed ── */}
          <div className="flex flex-col space-y-5">

            {/* ── Hero Section ── */}
            <HeroSection />

            {/* Mobile Categories */}
            <section className="xl:hidden animate-fade-up stagger-2">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-primary">
                  Shop by Category
                </h2>
                <Link
                  to="/categories"
                  className="text-xs font-semibold text-primary/70 hover:text-primary flex items-center gap-0.5 transition-colors"
                >
                  All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {(loadingCategories || loadingProducts
                  ? [...Array(6)]
                  : categoriesWithProducts
                ).map((item, i) => (
                  <Link
                    key={
                      loadingCategories || loadingProducts ? `cat-${i}` : item.id
                    }
                    to={
                      loadingCategories || loadingProducts
                        ? "#"
                        : `/categories/${item.slug}`
                    }
                  >
                    <div
                      className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/50 p-2 text-center card-lift bg-white cursor-pointer"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-border/30">
                        {loadingCategories || loadingProducts ? (
                          <div className="shimmer w-full h-full" />
                        ) : (
                          <img
                            src={cloudinaryOptimised(item.image, 80)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-primary/80 leading-tight">
                        {loadingCategories || loadingProducts ? "..." : item.name}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* ── Category Rows ── */}
            {loadingDailyProducts ? (
              // Show skeleton rows while loading
              [...Array(MAX_ROWS)].map((_, i) => (
                <CategoryRowSkeleton key={i} />
              ))
            ) : categoryRows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No products available yet.
              </p>
            ) : (
              categoryRows.map((row, rowIndex) => (
                <CategoryRow
                  key={`${row.slug}-${rowIndex}`}
                  categoryName={row.name}
                  categorySlug={row.slug}
                  products={row.products}
                  rowIndex={rowIndex}
                />
              ))
            )}

            {/* ── See All Products CTA ── */}
            {!loadingDailyProducts && categoryRows.length > 0 && (
              <div className="flex justify-center pt-1 animate-fade-up">
                <Link to="/categories">
                  <Button
                    variant="outline"
                    className="h-10 px-6 rounded-full font-bold border-2 border-primary/20 hover:bg-secondary hover:border-primary/40 transition-all text-sm"
                  >
                    Browse All Products <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}

            {/* ── Promo Banner ── */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f5132] to-[#1f8a52] p-4 animate-fade-up">
              <img
                src="https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?auto=format&fit=crop&w=800&q=80"
                alt="Spiro spare parts"
                className="absolute inset-0 h-full w-full object-cover opacity-15"
              />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black text-white leading-tight">
                    Genuine Spares
                  </p>
                  <p className="text-xs font-medium text-[#f4c430]">
                    Keep your Spiro running with original parts.
                  </p>
                </div>
                <Link to="/categories" className="shrink-0">
                  <Button className="h-8 px-4 rounded-full bg-[#f4c430] text-primary font-bold hover:bg-[#f4c430]/90 text-xs btn-glow transition-all whitespace-nowrap">
                    Shop Parts <ChevronRight className="ml-0.5 w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </section>
          </div>

          {/* ── Right Sidebar — Desktop ── */}
          <div className="hidden xl:flex xl:flex-col space-y-3">
            <section
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 p-4 animate-fade-up stagger-1 flex flex-col justify-end"
              style={{ minHeight: "180px" }}
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=400&q=80')] opacity-25 bg-cover bg-center" />
              <div className="relative z-10">
                <span className="inline-block bg-white/20 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5 border border-white/20">
                  Special Offer
                </span>
                <h3 className="text-base font-black text-white leading-tight mb-1">
                  Swap &amp; Go
                  <br />
                  Batteries
                </h3>
                <p className="text-[11px] text-white/90 mb-2 font-medium">
                  Skip the wait — swap your battery in minutes.
                </p>
                <Link to="/categories">
                  <Button className="w-full bg-white text-green-700 hover:bg-white/90 font-bold text-xs h-7">
                    Find a Station
                  </Button>
                </Link>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-xl bg-primary p-4 animate-fade-up stagger-2">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary/40" />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#f4c430] mb-2 bg-[#f4c430]/10 px-2 py-0.5 rounded-full border border-[#f4c430]/20">
                  <Zap className="w-2.5 h-2.5" /> New Riders
                </span>
                <h3 className="text-sm font-black text-white leading-tight mb-1">
                  Get Riding Today
                </h3>
                <p className="text-[11px] text-white/80 mb-2.5 font-medium">
                  Electric motorcycles delivered to your door.
                </p>
                <div className="flex gap-1.5">
                  <Link to="/categories" className="flex-1">
                    <Button className="w-full h-7 rounded-full bg-[#f4c430] text-primary font-bold hover:bg-[#f4c430]/90 btn-glow transition-all text-xs">
                      Shop Now
                    </Button>
                  </Link>
                  <Link to="/categories" className="flex-1">
                    <Button
                      variant="ghost"
                      className="w-full h-7 rounded-full text-white hover:bg-white/10 border border-white/20 font-semibold transition-all text-xs"
                    >
                      Deals <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}