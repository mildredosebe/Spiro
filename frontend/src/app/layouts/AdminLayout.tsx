import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Warehouse,
  Bell,
  LogOut,
  Menu,
  Tag,
  Coins,
  Truck
} from "lucide-react";
import { clearSession, getCurrentUser } from "../lib/api";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "../components/ui/sheet";
import { NotificationBell } from "../components/NotificationBell";

export function AdminLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || !user.is_staff) {
      clearSession();
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    clearSession();
    navigate("/admin", { replace: true });
  };

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/dashboard/products", label: "Products", icon: Package },
    { path: "/admin/dashboard/categories", label: "Categories", icon: Tag },
    { path: "/admin/dashboard/orders", label: "Orders", icon: ShoppingCart },
    { path: "/admin/dashboard/inventory", label: "Inventory", icon: Warehouse },
    { path: "/admin/dashboard/users", label: "Users", icon: Users },
    { path: "/admin/dashboard/notifications", label: "Notifications", icon: Bell },
    { path: "/admin/dashboard/pricing", label: "Pricing & Fees", icon: Coins },
    { path: "/admin/dashboard/delivery", label: "Delivery Settings", icon: Truck },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8fafc] admin-layout-wrapper">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col fixed inset-y-0 z-50 bg-white border-r border-slate-200/60 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]">
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Spiro Admin</h1>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">Management</div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 font-semibold ${
                    isActive
                      ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-primary"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                  <span className="text-[15px]">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
              <div>
                <div className="text-sm font-bold text-slate-900">Admin User</div>
                <div className="text-xs text-slate-500">Super Admin</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-all duration-300 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-6 lg:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0 flex flex-col border-none">
                <SheetHeader className="p-8 border-b border-slate-100 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <SheetTitle className="text-2xl font-black tracking-tight text-slate-900">Spiro Admin</SheetTitle>
                  </div>
                </SheetHeader>
                <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold ${
                          isActive
                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                            : "text-slate-500 hover:bg-slate-50 hover:text-primary"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-lg">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
                <div className="p-6 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-3 px-5 py-4 w-full rounded-2xl bg-destructive/10 text-destructive font-bold hover:bg-destructive hover:text-white transition-all duration-300"
                  >
                    <LogOut className="w-6 h-6" />
                    <span className="text-lg">Logout</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-black text-xl text-slate-900 tracking-tight">Spiro</span>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Management / <span className="text-primary">{navItems.find(i => i.path === location.pathname)?.label || "Dashboard"}</span></h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-xs font-bold text-slate-600">Server Online</span>
            </div>
            <NotificationBell scrolled={false} />
            <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all duration-300 cursor-pointer">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 p-6 lg:p-10 max-w-[1600px]">
          <Outlet />
        </div>
        
      </div>
    </div>
  );
}
