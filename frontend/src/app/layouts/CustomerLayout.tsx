import { Outlet, useLocation } from "react-router";
import { BottomNavigation } from "../components/BottomNavigation";
import { Footer } from "../components/Footer";
import { TopNavigation } from "../components/TopNavigation";

export function CustomerLayout() {
  const location = useLocation();
  const hideNav = location.pathname === "/payment-processing" || location.pathname.includes("/order-confirmation");
  const isProductPage = location.pathname.startsWith("/product/");
  const hideTopNav = hideNav;
  const hideBottomNav = hideNav || location.pathname.startsWith("/product/");
  const hideFooter = hideNav || location.pathname.startsWith("/product/");

  return (
    <div className="min-h-screen bg-secondary pb-20 md:pb-0 flex flex-col">
      {!hideTopNav && (
        isProductPage ? (
          <div className="hidden md:block">
            <TopNavigation />
          </div>
        ) : (
          <TopNavigation />
        )
      )}
      <div className="flex-1">
        <Outlet />
      </div>
      {!hideFooter && <Footer />}
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
}
