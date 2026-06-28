import { Link } from "react-router";
import { Star } from "lucide-react";
import { Product } from "../lib/types";
import { Card } from "./ui/card";
import { AddToCartButton } from "./AddToCartButton";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const toKsh = (amount: number) =>
    `KSh ${amount.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="group rounded-xl bg-white border border-border/50 card-lift overflow-hidden flex flex-col h-full">
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden bg-[#f7f8fb]">
        <img
          src={product.image}
          alt={product.name}
          className="aspect-square w-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Low stock badge */}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-[#ef4444] text-white px-2 py-0.5 rounded-full shadow-md tracking-wide">
            Only {product.stock} left
          </span>
        )}
      </Link>
      
      <div className="p-2 flex flex-col flex-1">
        <Link to={`/product/${product.id}`} className="block mb-1.5">
          <h3 className="line-clamp-2 text-xs font-semibold text-primary leading-snug mb-1 group-hover:text-primary/80 transition-colors">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-3 h-3 fill-[#f4c430] text-[#f4c430]" />
            <span className="text-[10px] font-bold text-primary">{product.rating.toFixed(1)}</span>
            <span className="text-[9px] font-semibold text-muted-foreground/80">({product.reviews})</span>
          </div>
          
          <div className="flex items-end gap-2">
            <span className="text-sm font-black text-primary tracking-tight">
              {toKsh(product.price)}
            </span>
          </div>
        </Link>
        
        <div className="mt-auto pt-1">
          <AddToCartButton product={product} fullWidth />
        </div>
      </div>
    </div>
  );
}
