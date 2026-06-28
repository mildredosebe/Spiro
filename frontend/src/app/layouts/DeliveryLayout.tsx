import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { Truck, PackageCheck, Clock3, LogOut, Menu } from "lucide-react";
import { clearSession, getCurrentUser } from "../lib/api";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "../components/ui/sheet";

export function DeliveryLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || (!user.is_delivery_agent && !user.is_staff)) {
      clearSession();
      navigate("/delivery", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    clearSession();
    navigate("/delivery", { replace: true });
  };

  const navItems = [
    { path: "/delivery/dashboard", label: "Delivery Dashboard", icon: Truck },
  ];

  return (
    <div className="flex min-h-screen bg-secondary">
      <aside className="hidden md:flex md:w-72 md:flex-col bg-card border-r border-border">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary">Delivery Ops</h1>
          <p className="text-sm text-muted-foreground mt-1">Order fulfillment workflow</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <div className="md:hidden sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="p-2 -ml-2 text-foreground">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
                <SheetHeader className="p-6 border-b border-border text-left">
                  <SheetTitle className="text-2xl font-bold text-primary">Delivery Ops</SheetTitle>
                </SheetHeader>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="p-4 border-t border-border">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
            <PackageCheck className="w-5 h-5 text-primary" />
            <span className="font-semibold">Delivery Ops</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="w-4 h-4" />
            Live Queue
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
