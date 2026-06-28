import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, ShieldCheck } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { deleteCartItem, upsertCartItem, getCheckoutPricingPreview } from "../../../lib/api";
import { useCartState } from "../../../lib/hooks";
import { mutate } from "swr";

export function Cart() {
  const navigate = useNavigate();
  const { cartItems, loading } = useCartState();

  const updateQuantity = async (itemId: number, productId: number, nextQty: number) => {
    if (nextQty < 1) return;

    const item = cartItems.find((i) => i.id === itemId);
    const productName = item?.product_name || "Product";
    
    // Optimistic Update
    const optimisticItems = [...cartItems];
    const idx = optimisticItems.findIndex(i => i.id === itemId);
    if (idx > -1) {
      optimisticItems[idx] = { ...optimisticItems[idx], quantity: nextQty };
    }
    
    try {
      await mutate("/cart/", upsertCartItem(productId, nextQty, { name: productName }), {
        optimisticData: { items: optimisticItems },
        rollbackOnError: true,
        populateCache: true,
        revalidate: false
      });
    } catch (error) {
      // Errors are handled natively by upsertCartItem
    }
  };

  const removeItem = async (itemId: number) => {
    const item = cartItems.find((i) => i.id === itemId);
    const productName = item?.product_name || "Item";
    const optimisticItems = cartItems.filter(i => i.id !== itemId);
    
    try {
      await mutate("/cart/", deleteCartItem(itemId, productName), {
        optimisticData: { items: optimisticItems },
        rollbackOnError: true,
        populateCache: true,
        revalidate: false
      });
    } catch (error) {
      // Errors are handled natively by deleteCartItem
    }
  };

  // Default distance estimate for cart preview (3.5 km mid-range)
  const DEFAULT_DISTANCE_KM = 3.5;

  const subtotal = useMemo(() =>
    cartItems.reduce((sum, item) => sum + Number(item.product_price) * item.quantity, 0),
    [cartItems]
  );

  const [fees, setFees] = useState<{
    serviceFee: number;
    deliveryFee: number;
    surgeFee: number;
    total: number;
  }>({
    serviceFee: 0,
    deliveryFee: 0,
    surgeFee: 0,
    total: subtotal,
  });

  useEffect(() => {
    if (subtotal === 0) {
      setFees({ serviceFee: 0, deliveryFee: 0, surgeFee: 0, total: 0 });
      return;
    }
    const fetchPricing = async () => {
      try {
        const calc = await getCheckoutPricingPreview(subtotal, DEFAULT_DISTANCE_KM);
        setFees({
          serviceFee: parseFloat(calc.service_fee) || 0,
          deliveryFee: parseFloat(calc.delivery_fee) || 0,
          surgeFee: parseFloat(calc.surge_fee) || 0,
          total: parseFloat(calc.total_amount) || subtotal,
        });
      } catch {
        setFees({
          serviceFee: 80,
          deliveryFee: 150,
          surgeFee: 0,
          total: subtotal + 80 + 150,
        });
      }
    };
    fetchPricing();
  }, [subtotal]);

  const toKsh = (amount: number) =>
    `KSh ${amount.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-12 animate-fade-in">
      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 px-3 py-2 flex items-center justify-between md:hidden shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-full hover:bg-black/5 text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-black text-base text-primary">Cart</h1>
        </div>
        <span className="text-[10px] font-bold bg-secondary text-primary px-2 py-1 rounded-full border border-border/60">
          {cartItems.length} items
        </span>
      </header>

      <div className="max-w-6xl mx-auto px-3 py-3 md:px-5 md:py-4">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-primary flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#f4c430]" />
              Your Shopping Cart
            </h1>
            <p className="text-xs font-semibold text-muted-foreground mt-1">
              Review your items before proceeding to checkout.
            </p>
          </div>
          <span className="text-xs font-bold bg-white text-primary px-3 py-1.5 rounded-full border border-border/50 shadow-sm">
            {cartItems.length} items in cart
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 shimmer rounded-[2rem] bg-white border border-border/40" />
              ))}
            </div>
            <div className="h-[300px] shimmer rounded-[2rem] bg-white border border-border/40" />
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 bg-white rounded-[1.5rem] border border-border/50 shadow-sm px-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-primary/30" />
            </div>
            <h2 className="text-lg font-black text-primary mb-2">Your cart is empty</h2>
            <p className="text-xs text-muted-foreground font-medium max-w-sm mb-6">
              Looks like you haven't added anything to your cart yet. Discover great deals in our shop!
            </p>
            <Button 
              onClick={() => navigate("/categories")}
              className="rounded-full font-bold px-6 h-9 text-xs bg-[#f4c430] text-primary hover:bg-[#f4c430]/90 shadow-lg shadow-[#f4c430]/20 btn-glow"
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-3">
              {cartItems.map((item, i) => (
                <div 
                  key={item.id} 
                  className="bg-white rounded-xl p-2 md:p-3 border border-border/50 flex flex-col md:flex-row gap-3 md:gap-4 animate-fade-up relative overflow-hidden"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <Link to={`/product/${item.product}`} className="shrink-0 relative group rounded-xl overflow-hidden bg-[#f7f8fb] border border-border/30 w-[60px] h-[60px] md:w-[80px] md:h-[80px] block">
                    {item.product_image_url ? (
                      <img
                        src={item.product_image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                    )}
                  </Link>
                  
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-3">
                      <Link to={`/product/${item.product}`} className="block group">
                        <h3 className="text-xs md:text-sm font-bold text-primary leading-tight group-hover:text-primary/70 transition-colors line-clamp-2">
                          {item.product_name}
                        </h3>
                        <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                          Unit Price: <span className="text-primary">{toKsh(Number(item.product_price))}</span>
                        </p>
                      </Link>
                      <button 
                        onClick={() => removeItem(item.id)} 
                        className="p-1.5 text-muted-foreground/60 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-auto pt-3 flex items-center justify-between">
                      {/* Quantity Selector */}
                      <div className="inline-flex items-center bg-secondary rounded-xl p-1 border border-border/50">
                        <button
                          onClick={() => updateQuantity(item.id, item.product, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-border/50 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-primary">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.product, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-border/50 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      
                      <span className="text-sm md:text-base font-black text-primary tracking-tight">
                        {toKsh(Number(item.product_price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-3 md:p-4 border border-border/50 sticky top-28 animate-fade-up stagger-2">
                <h3 className="font-bold text-base text-primary mb-3">Order Summary</h3>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-primary">{toKsh(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="text-primary">{toKsh(fees.serviceFee)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="text-primary">{toKsh(fees.deliveryFee)}</span>
                  </div>
                  {fees.surgeFee > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-amber-500 animate-pulse">
                      <span>Surge Charge</span>
                      <span>{toKsh(fees.surgeFee)}</span>
                    </div>
                  )}
                </div>

                <div className="w-full h-px bg-border/60 border-dashed border-b mb-5" />

                <div className="flex justify-between items-end mb-5">
                  <span className="font-bold text-sm text-primary">Total</span>
                  <span className="text-lg font-black text-primary tracking-tight">{toKsh(fees.total)}</span>
                </div>

                <Button 
                  size="lg" 
                  className="w-full h-10 rounded-xl text-sm font-bold bg-[#f4c430] text-primary hover:bg-[#f4c430]/90 shadow-lg shadow-[#f4c430]/20 btn-glow transition-all" 
                  onClick={() => navigate("/checkout")}
                >
                  Proceed to Checkout
                </Button>

                <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground/80">
                  <ShieldCheck className="w-3 h-3 text-success" /> 100% Secure Checkout
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
