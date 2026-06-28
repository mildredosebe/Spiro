import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Heart, MessageSquare, Search, ShoppingCart, Star, ChevronDown, Check } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge";
import { getCart, upsertCartItem, type BackendProductReview } from "../../../lib/api";
import { Product } from "../../../lib/types";
import { useCartState, useProduct } from "../../../lib/hooks";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "../../../components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "../../../components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "motion/react";

export function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { product: backendProduct, loading } = useProduct(productId);
  const { cartItems, cartCount } = useCartState();

  const product = useMemo<Product | null>(() => {
    if (!backendProduct) return null;
    const item = backendProduct;
    return {
      id: String(item.id),
      name: item.name,
      price: Number(item.price),
      description: item.description,
      image: item.image_url || "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80",
      category: item.category.slug,
      rating: Number(item.average_rating ?? 0),
      reviews: Number(item.reviews_count ?? 0),
      stock: item.stock,
      recentReviews: (item.recent_reviews || []).map((review: BackendProductReview) => ({
        id: review.id,
        rating: review.rating,
        review: review.review,
        reviewerName: review.reviewer_name,
        createdAt: review.created_at,
      })),
      colors: (item as any).colors,
      sizes: (item as any).sizes,
      gallery: item.gallery || [],
    };
  }, [backendProduct]);

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    
    setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Synchronize quantity selection state with active cart quantities
  useEffect(() => {
    if (product && cartItems) {
      const cartItem = cartItems.find((item) => Number(item.product) === Number(product.id));
      setQuantity(cartItem ? cartItem.quantity : 1);
    }
  }, [product?.id, cartItems]);

  function cloudinaryOptimised(url: string, width: number): string {
    if (!url) return "";
    if (url.includes("/upload/")) {
      return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
    }
    return url;
  }

  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] || "");
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [cartActionLoading, setCartActionLoading] = useState<"add" | "buy" | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const activeImage = selectedImage || product?.image;

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${index < Math.round(rating) ? "fill-[#f4c430] text-[#f4c430]" : "text-muted-foreground/30"}`}
      />
    ));

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary pt-20 px-4 md:p-8 space-y-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 aspect-square rounded-3xl shimmer" />
          <div className="w-full md:w-1/2 space-y-4 pt-4">
            <div className="h-8 w-3/4 shimmer rounded-xl" />
            <div className="h-6 w-1/4 shimmer rounded-lg" />
            <div className="h-20 w-full shimmer rounded-xl mt-8" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-primary">Product Not Found</h2>
          <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
        </div>
      </div>
    );
  }

  const addToCartRequest = async () => {
    if (quantity <= 0) {
      toast.warning("Please select a quantity greater than 0");
      return false;
    }

    try {
      await upsertCartItem(Number(product.id), quantity, product);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleAddToCart = async () => {
    if (cartActionLoading) return;
    setCartActionLoading("add");
    try {
      await addToCartRequest();
    } finally {
      setCartActionLoading(null);
    }
  };

  const handleBuyNow = async () => {
    if (cartActionLoading) return;
    setCartActionLoading("buy");
    try {
      const added = await addToCartRequest();
      if (!added) return;
      navigate("/checkout");
    } finally {
      setCartActionLoading(null);
    }
  };

  const toKsh = (amount: number) =>
    `KSh ${amount.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-12 animate-fade-in">
      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between md:hidden shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 text-primary">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-black/5 text-primary"><Search className="w-5 h-5" /></button>
          <button className="p-2 rounded-full hover:bg-black/5 text-primary"><Heart className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto md:p-4 lg:p-6">
        {/* Desktop Breadcrumb/Back */}
        <div className="hidden md:flex items-center gap-2 mb-4 text-xs font-semibold text-muted-foreground">
          <button onClick={() => navigate(-1)} className="hover:text-primary flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to products
          </button>
          <span className="text-border">/</span>
          <span className="capitalize">{product.category.replace("-", " ")}</span>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8 bg-white md:p-4 md:rounded-2xl border border-border/40">
          
          {/* ── Image Gallery ───────────────────────── */}
          <div className="w-full md:w-[40%] lg:w-[45%] shrink-0 flex flex-col gap-3">
            <Dialog>
              <Carousel
                setApi={setCarouselApi}
                plugins={[
                  Autoplay({
                    delay: 3500,
                    stopOnInteraction: true,
                  }),
                ]}
                className="w-full relative group rounded-b-3xl md:rounded-[2rem] overflow-hidden border border-border/30 bg-[#f7f8fb]"
              >
                <CarouselContent>
                  <CarouselItem>
                    <DialogTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="relative aspect-square bg-muted overflow-hidden cursor-pointer"
                        >
                        <img
                          src={cloudinaryOptimised(product.image, 800)}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        
                        {/* Badges Overlay */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                          {product.stock <= 5 && product.stock > 0 && (
                            <Badge variant="destructive" className="shadow-lg px-3 py-1 font-bold text-[10px] uppercase tracking-wide">
                              Only {product.stock} left
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    </DialogTrigger>
                  </CarouselItem>
                  {product.gallery?.map((img: any) => (
                    <CarouselItem key={img.id}>
                      <DialogTrigger asChild>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="relative aspect-square bg-muted overflow-hidden cursor-pointer"
                          >
                          <img
                            src={cloudinaryOptimised(img.image_url, 800)}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </motion.div>
                      </DialogTrigger>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {(product.gallery?.length || 0) > 0 && (
                  <>
                    <CarouselPrevious className="absolute left-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white text-primary" />
                    <CarouselNext className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white text-primary" />
                  </>
                )}
              </Carousel>

              {/* Connected Thumbnails below Carousel */}
              {(product.gallery?.length || 0) > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2 mt-2 scrollbar-none justify-center">
                  {/* Primary Image Thumbnail */}
                  <button
                    onClick={() => carouselApi?.scrollTo(0)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-[3px] transition-all shrink-0 ${
                      currentSlide === 0
                        ? "border-primary shadow-md scale-105"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={cloudinaryOptimised(product.image, 150)}
                      alt="Primary thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {/* Gallery Image Thumbnails */}
                  {product.gallery?.map((img: any, idx: number) => (
                    <button
                      key={img.id}
                      onClick={() => carouselApi?.scrollTo(idx + 1)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-[3px] transition-all shrink-0 ${
                        currentSlide === idx + 1
                          ? "border-primary shadow-md scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={cloudinaryOptimised(img.image_url, 150)}
                        alt={`Gallery thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
              
              {/* Full Screen View Mode Modal */}
              <DialogContent className="max-w-[95vw] md:max-w-5xl p-0 border-none bg-transparent shadow-none">
                <DialogTitle className="sr-only">Product Image View</DialogTitle>
                <Carousel className="w-full">
                  <CarouselContent>
                    <CarouselItem>
                      <div className="flex items-center justify-center p-2 md:p-6">
                        <img
                          src={cloudinaryOptimised(product.image, 1600)}
                          alt={product.name}
                          className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl"
                        />
                      </div>
                    </CarouselItem>
                    {product.gallery?.map((img: any) => (
                      <CarouselItem key={img.id}>
                        <div className="flex items-center justify-center p-2 md:p-6">
                          <img
                            src={cloudinaryOptimised(img.image_url, 1600)}
                            alt={product.name}
                            className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {(product.gallery?.length || 0) > 0 && (
                    <>
                      <CarouselPrevious className="left-4 md:-left-8 bg-white/80 hover:bg-white text-primary" />
                      <CarouselNext className="right-4 md:-right-8 bg-white/80 hover:bg-white text-primary" />
                    </>
                  )}
                </Carousel>
              </DialogContent>
            </Dialog>
          </div>

          {/* ── Product Info ────────────────────────── */}
          <div className="w-full md:w-[60%] lg:w-[55%] flex flex-col px-4 md:px-0 animate-fade-up stagger-1">
            
            {/* Title & Price */}
            <div className="mb-4">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-primary leading-tight mb-2">
                {product.name}
              </h1>
              
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-0.5">
                  {renderStars(product.rating)}
                </div>
                <span className="font-bold text-xs text-primary">{product.rating.toFixed(1)}</span>
                <span className="text-xs font-semibold text-primary/60 hover:text-primary cursor-pointer underline decoration-primary/30 underline-offset-4 transition-colors">
                  Read {product.reviews} reviews
                </span>
              </div>

              <div className="flex items-end gap-3 mt-1">
                <span className="text-2xl md:text-3xl font-black text-primary tracking-tight">
                  {toKsh(product.price)}
                </span>
              </div>
            </div>

            <div className="w-full h-px bg-border/50 mb-4" />

            {/* Options (Color/Size) */}
            <div className="space-y-6 mb-8">
              {product.colors && product.colors.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-primary">Color</span>
                    <span className="text-sm font-semibold text-primary/60 capitalize">{selectedColor}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.colors.map((color: string) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          selectedColor === color
                            ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2"
                            : "bg-secondary text-primary hover:bg-secondary/80 border border-border/50"
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-primary">Size</span>
                    <span className="text-xs font-semibold text-primary/50 cursor-pointer hover:text-primary underline decoration-border underline-offset-4">Size Guide</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.sizes.map((size: string) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`h-12 min-w-[3rem] px-3 rounded-xl font-bold transition-all ${
                          selectedSize === size
                            ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2"
                            : "bg-white border-2 border-secondary hover:border-primary/30 text-primary"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <span className="font-bold text-primary block mb-3">Quantity</span>
                <div className="inline-flex items-center bg-secondary rounded-2xl p-1 border border-border/50">
                  <button
                    className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="w-14 text-center font-bold text-primary">{quantity}</span>
                  <button
                    className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
                <span className="text-xs font-semibold text-muted-foreground ml-4">
                  {product.stock} items available
                </span>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex gap-4 mt-auto pt-6 border-t border-border/50">
              <Button
                variant="outline"
                size="lg"
                onClick={handleAddToCart}
                className="flex-1 h-14 rounded-2xl border-2 border-primary/20 text-primary font-bold hover:bg-primary hover:text-white hover:border-primary transition-all text-base gap-2"
                disabled={product.stock === 0 || cartActionLoading !== null}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartActionLoading === "add" ? "Adding..." : "Add to Cart"}
              </Button>
              <Button
                size="lg"
                onClick={handleBuyNow}
                className="flex-1 h-14 rounded-2xl bg-[#f4c430] text-primary hover:bg-[#f4c430]/90 font-bold text-base shadow-lg shadow-[#f4c430]/20 btn-glow transition-all"
                disabled={product.stock === 0 || cartActionLoading !== null}
              >
                {cartActionLoading === "buy" ? "Processing..." : "Buy it Now"}
              </Button>
            </div>

            {/* Description Accordion */}
            <div className="border border-border/60 rounded-2xl overflow-hidden mt-8 mb-8 bg-white/50">
              <button 
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="w-full flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors font-bold text-primary"
              >
                Product Details
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showFullDescription ? "rotate-180" : ""}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${showFullDescription ? "max-h-[500px] opacity-100 p-4 pt-2" : "max-h-0 opacity-0 px-4"}`}>
                <p className="text-sm text-primary/70 leading-relaxed">
                  {product.description}
                </p>
                <ul className="mt-4 space-y-2 text-sm text-primary/70">
                  <li className="flex gap-2 items-start"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" /> Genuine Spiro product</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 md:mt-10 bg-white md:rounded-2xl border-y md:border border-border/40 p-4 animate-fade-up stagger-2">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-primary">Customer Reviews</h2>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">{renderStars(product.rating)}</div>
                <span className="font-bold">{product.rating.toFixed(1)} out of 5</span>
              </div>
            </div>
            <Button variant="outline" className="rounded-full font-bold">Write a Review</Button>
          </div>

          {product.recentReviews && product.recentReviews.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {product.recentReviews.map((review) => (
                <div key={review.id} className="p-5 rounded-2xl bg-secondary/50 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
                        {review.reviewerName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-primary">{review.reviewerName}</p>
                        <div className="flex mt-0.5">{renderStars(review.rating)}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground bg-white px-2 py-1 rounded-md border border-border/40">Verified Buyer</span>
                  </div>
                  <p className="text-sm text-primary/80 leading-relaxed font-medium">
                    "{review.review}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-secondary/30 rounded-2xl border border-border/50">
              <MessageSquare className="w-12 h-12 text-primary/20 mx-auto mb-3" />
              <p className="font-bold text-primary">No reviews yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to review this product.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Fixed Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-border/50 p-4 pb-safe z-50 shadow-[0_-8px_24px_-8px_rgba(11,46,89,0.12)] animate-fade-up">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={handleAddToCart}
            className="w-14 h-14 rounded-2xl shrink-0 border-2 border-primary/20 text-primary hover:bg-primary hover:text-white"
            disabled={product.stock === 0 || cartActionLoading !== null}
            aria-label="Add to cart"
          >
            <ShoppingCart className="w-6 h-6" />
          </Button>
          <Button
            onClick={handleBuyNow}
            className="flex-1 h-14 rounded-2xl bg-[#f4c430] text-primary hover:bg-[#f4c430]/90 font-black text-base shadow-lg shadow-[#f4c430]/30 btn-glow"
            disabled={product.stock === 0 || cartActionLoading !== null}
          >
            {cartActionLoading === "buy" ? "Processing..." : "Buy Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}