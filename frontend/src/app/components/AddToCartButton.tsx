import { ShoppingCart, Plus, Minus } from "lucide-react";
import { Button } from "./ui/button";
import { useCartState } from "../lib/hooks";
import { upsertCartItem, deleteCartItem, isAuthenticated } from "../lib/api";
import { Product } from "../lib/types";
import { mutate } from "swr";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface AddToCartButtonProps {
  product: Product;
  fullWidth?: boolean;
}

export function AddToCartButton({ product, fullWidth }: AddToCartButtonProps) {
  const { cartItems } = useCartState();
  const cartItem = cartItems.find((item) => item.product === Number(product.id));
  const quantity = cartItem?.quantity || 0;

  const handleUpdateQuantity = async (e: React.MouseEvent, newQuantity: number) => {
    e.preventDefault();
    e.stopPropagation();

    const optimisticItems = [...cartItems];
    if (newQuantity === 0 && cartItem) {
        const idx = optimisticItems.findIndex(i => i.id === cartItem.id);
        if (idx > -1) optimisticItems.splice(idx, 1);
    } else if (cartItem) {
        const idx = optimisticItems.findIndex(i => i.id === cartItem.id);
        if (idx > -1) optimisticItems[idx] = { ...optimisticItems[idx], quantity: newQuantity };
    } else {
        optimisticItems.push({
            id: Date.now(), 
            product: Number(product.id),
            product_name: product.name,
            product_price: String(product.price),
            product_image_url: product.image,
            quantity: newQuantity
        } as any);
    }

    const optimisticCart = {
        id: Date.now(),
        updated_at: new Date().toISOString(),
        items: optimisticItems
    };

    const updatePromise = newQuantity === 0 && cartItem
      ? deleteCartItem(cartItem.id, product.name)
      : upsertCartItem(Number(product.id), newQuantity, product);

    try {
      await mutate("/cart/", updatePromise, {
        optimisticData: optimisticCart,
        rollbackOnError: true,
        populateCache: true,
        revalidate: false
      });
    } catch (error) {
      // Errors are handled natively by upsertCartItem / deleteCartItem
    }
  };

  if (quantity > 0) {
    return (
      <div className={cn(
        "inline-flex items-center bg-secondary rounded-2xl p-1 border border-border/50",
        fullWidth ? "w-full mt-3 h-10" : ""
      )}>
        <button
          className="w-8 h-8 rounded-xl bg-white border border-border/50 flex items-center justify-center text-primary hover:bg-primary hover:text-white hover:border-primary transition-colors"
          onClick={(e) => handleUpdateQuantity(e, quantity - 1)}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className={cn("font-bold text-primary text-center", fullWidth ? "flex-1" : "w-8")}>{quantity}</span>
        <button
          className="w-8 h-8 rounded-xl bg-white border border-border/50 flex items-center justify-center text-primary hover:bg-primary hover:text-white hover:border-primary transition-colors"
          onClick={(e) => handleUpdateQuantity(e, quantity + 1)}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Button
      size={fullWidth ? "default" : "sm"}
      onClick={(e) => handleUpdateQuantity(e, 1)}
      className={cn(
        "font-bold",
        fullWidth ? "mt-3 h-9 w-full rounded-lg bg-[#f4c430] text-primary hover:bg-[#f7d65d]" : "rounded-full"
      )}
    >
      <ShoppingCart className={cn("h-4 w-4", fullWidth ? "mr-2" : "")} />
      {fullWidth && "Add to Cart"}
    </Button>
  );
}
