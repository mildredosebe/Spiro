import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Search, ShoppingCart, User, Package, Grid, Shield, Truck, X, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { getCurrentUser, type AuthUser, getCatalogProducts, type BackendProduct } from "../lib/api";
import { useCartState } from "../lib/hooks";
import { SpiroLogo } from "./SpiroLogo";
import { NotificationBell } from "./NotificationBell";

export function TopNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCartState();
  const [user, setUser] = useState<AuthUser | null>(null);

  
  // Search State
  const [searchOpen, setSearchOpen] = useState(false); // Mobile search input visibility
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BackendProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  // Close search on route change
  useEffect(() => { 
    setSearchOpen(false); 
    setShowDropdown(false);
    setSearchQuery("");
  }, [location.pathname]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const fetchResults = async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const response = await getCatalogProducts({ search: debouncedQuery });
        setSearchResults(response.results.slice(0, 5));
      } catch (error) {
        console.error("Search failed", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    fetchResults();
  }, [debouncedQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current && !searchRef.current.contains(event.target as Node) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      setSearchOpen(false);
      navigate(`/categories?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleResultClick = (productId: number) => {
    setShowDropdown(false);
    setSearchOpen(false);
    setSearchQuery("");
    navigate(`/product/${productId}`);
  };

  const userInitials = user
    ? ([user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "U")
        .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : null;

  return (
      <nav className="sticky top-0 z-50 w-full bg-[#f4c430]">

      <div className="max-w-7xl mx-auto w-full px-4 py-3 md:h-[68px] flex items-center justify-between gap-4 md:gap-6">

        {/* Logo */}
        <Link to="/" className="flex flex-col justify-center shrink-0 group" aria-label="Home">
          <SpiroLogo size="xs" className="transition-opacity group-hover:opacity-85" />
          <span className="text-[10px] text-primary/80 font-medium mt-1.5 tracking-tight hidden md:block pl-1">
            Powering Every Ride
          </span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 max-w-xl relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
            <Input
              type="search"
              placeholder="Search bikes, parts..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length >= 2) setShowDropdown(true);
              }}
              onFocus={() => {
                if (debouncedQuery.length >= 2) setShowDropdown(true);
              }}
              className="w-full pl-10 pr-[90px] h-11 bg-white/80 border-white/50 focus-visible:border-primary/30 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary/20 rounded-full text-sm shadow-sm transition-all placeholder:text-muted-foreground/60"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1 bottom-1 rounded-full px-5 text-xs font-semibold shadow-none h-auto bg-primary hover:bg-primary/90 btn-glow transition-all"
            >
              Search
            </Button>
          </form>

          {/* Desktop Search Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-border overflow-hidden z-50 animate-fade-in origin-top">
              {isSearching ? (
                <div className="p-6 flex items-center justify-center text-muted-foreground font-medium">
                  <Loader2 className="w-5 h-5 animate-spin mr-3 text-primary" /> Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="flex flex-col">
                  {searchResults.map((product) => (
                    <button 
                      key={product.id} 
                      type="button"
                      onClick={() => handleResultClick(product.id)}
                      className="flex items-center gap-4 p-4 hover:bg-[#f7f8fb] transition-colors text-left border-b border-border/40 last:border-0 group"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-xl object-cover border border-border/50 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 border border-border/50">Img</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-primary truncate group-hover:text-primary/80 transition-colors">{product.name}</p>
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5">KSh {Number(product.price).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                  <button 
                    type="button" 
                    onClick={handleSearchSubmit}
                    className="p-4 text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors text-center"
                  >
                    View all results for "{searchQuery}"
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                  <p className="text-sm font-black text-primary mb-1">No products found</p>
                  <p className="text-xs font-medium text-muted-foreground">Try adjusting your search term.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Nav Actions */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <NavAction to="/categories" icon={<Grid className="w-4 h-4" />} label="Categories" />
          <NavAction to="/orders" icon={<Package className="w-4 h-4" />} label="Orders" />

          <Link to="/cart" aria-label="Cart">
            <button className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all duration-200 text-primary hover:bg-black/8">
              <ShoppingCart className="w-4 h-4" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full inline-flex items-center justify-center px-1 shadow">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          </Link>

          {user && <NotificationBell />}

          <div className="w-px h-5 bg-border/60 mx-1" />

          {/* User avatar or profile link */}
          {userInitials ? (
            <Link to="/profile" aria-label="Profile">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-2 transition-all cursor-pointer hover:scale-105 bg-primary text-[#fef08a] ring-primary/30">
                {userInitials}
              </div>
            </Link>
          ) : (
            <NavAction to="/profile" icon={<User className="w-4 h-4" />} label="Sign In" />
          )}

          {user?.is_staff && (
            <>
              <div className="w-px h-5 bg-border/60 mx-1" />
              <Link to="/admin/dashboard">
                <Button size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                  <Shield className="w-3.5 h-3.5" /> Admin
                </Button>
              </Link>
            </>
          )}
          {user?.is_delivery_agent && (
            <>
              <div className="w-px h-5 bg-border/60 mx-1" />
              <Link to="/delivery/dashboard">
                <Button size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white transition-all">
                  <Truck className="w-3.5 h-3.5" /> Delivery
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Right Icons */}
        <div className="flex md:hidden items-center gap-0.5">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="p-2 rounded-full text-primary hover:bg-black/8 transition-colors"
            aria-label="Search"
          >
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>
          {user?.is_staff && (
            <Link to="/admin/dashboard" className="p-2 rounded-full text-primary hover:bg-black/8 transition-colors" aria-label="Admin">
              <Shield className="w-5 h-5" />
            </Link>
          )}
          {user?.is_delivery_agent && (
            <Link to="/delivery/dashboard" className="p-2 rounded-full text-primary hover:bg-black/8 transition-colors" aria-label="Delivery">
              <Truck className="w-5 h-5" />
            </Link>
          )}
          {user && (
            <div className="flex items-center">
              <NotificationBell />
            </div>
          )}
          <Link to="/cart" className="relative p-2 rounded-full text-primary hover:bg-black/8 transition-colors" aria-label="Cart">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Search Dropdown */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3 animate-fade-up relative z-50" ref={mobileSearchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search bikes, parts..."
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length >= 2) setShowDropdown(true);
              }}
              onFocus={() => {
                if (debouncedQuery.length >= 2) setShowDropdown(true);
              }}
              className="w-full pl-9 pr-[70px] h-11 bg-white rounded-full border-border/50 shadow-sm text-sm"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1 bottom-1 rounded-full px-4 text-xs font-bold h-auto shadow-none"
            >
              Go
            </Button>
          </form>

          {/* Mobile Search Results */}
          {showDropdown && (
            <div className="absolute top-[110%] left-4 right-4 bg-white rounded-2xl shadow-xl border border-border overflow-hidden z-50">
              {isSearching ? (
                <div className="p-6 flex items-center justify-center text-muted-foreground font-medium">
                  <Loader2 className="w-5 h-5 animate-spin mr-3 text-primary" /> Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="flex flex-col">
                  {searchResults.map((product) => (
                    <button 
                      key={product.id} 
                      type="button"
                      onClick={() => handleResultClick(product.id)}
                      className="flex items-center gap-4 p-3 hover:bg-[#f7f8fb] transition-colors text-left border-b border-border/40 last:border-0"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-xl object-cover border border-border/50 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 border border-border/50">Img</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-primary truncate">{product.name}</p>
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5">KSh {Number(product.price).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                  <button 
                    type="button" 
                    onClick={handleSearchSubmit}
                    className="p-4 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors text-center uppercase tracking-wider"
                  >
                    View all results
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Search className="w-8 h-8 text-primary/20 mx-auto mb-3" />
                  <p className="text-sm font-black text-primary mb-1">No products found</p>
                  <p className="text-xs font-medium text-muted-foreground">Try a different search term.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function NavAction({
  to, icon, label,
}: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all duration-200 text-primary hover:bg-black/8"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}