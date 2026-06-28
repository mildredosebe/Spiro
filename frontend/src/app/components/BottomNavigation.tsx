import { Link, useLocation } from "react-router";
import { Home, Grid, ShoppingCart, Package, User } from "lucide-react";
import { useCartState } from "../lib/hooks";

export function BottomNavigation() {
  const location = useLocation();
  const { cartCount } = useCartState();

  const navItems = [
    { path: "/",           label: "Home",       icon: Home },
    { path: "/categories", label: "Categories", icon: Grid },
    { path: "/cart",       label: "Cart",       icon: ShoppingCart },
    { path: "/orders",     label: "Orders",     icon: Package },
    { path: "/profile",    label: "Profile",    icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
      <div className="flex justify-around items-center h-[62px] max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 group relative"
              aria-label={item.label}
            >
              {/* Active pill background */}
              {isActive && (
                <span className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-primary/8 animate-scale-in" />
              )}

              <div className="relative z-10">
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive
                      ? "text-primary scale-110"
                      : "text-muted-foreground group-hover:text-primary/70 group-hover:scale-105"
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                {/* Cart badge */}
                {item.path === "/cart" && cartCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[9px] font-bold text-white inline-flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-semibold tracking-tight transition-colors duration-200 z-10 ${
                  isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary/70"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
