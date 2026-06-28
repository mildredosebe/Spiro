import { Navigate, createBrowserRouter } from "react-router";
import { GlobalErrorBoundary } from "../components/GlobalErrorBoundary";
import { Welcome } from "./pages/Welcome";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Home } from "./pages/shop/home/page";
import { Categories } from "./pages/shop/categories/page";
import { ProductDetails } from "./pages/shop/product/page";
import { Cart } from "./pages/shop/cart/page";
import { Checkout } from "./pages/shop/checkout/page";

import { OrderConfirmation } from "./pages/shop/order-confirmation/page";
import { Orders } from "./pages/shop/orders/page";
import { Profile } from "./pages/shop/profile/page";
import { Spending } from "./pages/shop/spending/page";
import { Notifications } from "./pages/shop/notifications/page";
import { Terms } from "./pages/shop/terms/page";
import { Privacy } from "./pages/shop/privacy/page";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminDashboard } from "./pages/admin/dashboard/page";
import { AdminProducts } from "./pages/admin/products/page";
import { AdminCategories } from "./pages/admin/categories/page";
import { AdminOrders } from "./pages/admin/orders/page";
import { AdminInventory } from "./pages/admin/inventory/page";
import { AdminUsers } from "./pages/admin/users/page";
import { AdminNotifications } from "./pages/admin/notifications/page";
import { AdminPricing } from "./pages/admin/pricing/page";
import { AdminDelivery } from "./pages/admin/delivery/page";
import { DeliveryLogin } from "./pages/delivery/DeliveryLogin";
import { DeliveryDashboard } from "./pages/delivery/DeliveryDashboard";
import { CustomerLayout } from "./layouts/CustomerLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { DeliveryLayout } from "./layouts/DeliveryLayout";

export const router = createBrowserRouter([
  // Root → home (no /shop prefix in URL)
  {
    path: "/",
    element: <CustomerLayout />,
    errorElement: <GlobalErrorBoundary />,
    children: [
      { index: true, element: <Home /> },
      { path: "categories", element: <Categories /> },
      { path: "categories/:categoryId", element: <Categories /> },
      { path: "product/:productId", element: <ProductDetails /> },
      { path: "cart", element: <Cart /> },
      { path: "checkout", element: <Checkout /> },

      { path: "order-confirmation/:orderId", element: <OrderConfirmation /> },
      { path: "orders", element: <Orders /> },
      { path: "profile", element: <Profile /> },
      { path: "spending", element: <Spending /> },
      { path: "notifications", element: <Notifications /> },
      { path: "terms", element: <Terms /> },
      { path: "privacy", element: <Privacy /> },
    ],
  },
  // Keep /shop/* as aliases so old bookmarks/links don't 404
  {
    path: "/shop",
    element: <Navigate to="/" replace />,
  },
  {
    path: "/shop/*",
    element: <Navigate to="/" replace />,
  },
  {
    path: "/login",
    element: <Login />,
    errorElement: <GlobalErrorBoundary />,
  },
  {
    path: "/signup",
    element: <Signup />,
    errorElement: <GlobalErrorBoundary />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
    errorElement: <GlobalErrorBoundary />,
  },
  {
    path: "/admin",
    element: <AdminLogin />,
    errorElement: <GlobalErrorBoundary />,
  },
  {
    path: "/delivery",
    element: <DeliveryLogin />,
  },
  {
    path: "/admin/dashboard",
    element: <AdminLayout />,
    errorElement: <GlobalErrorBoundary />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "products", element: <AdminProducts /> },
      { path: "categories", element: <AdminCategories /> },
      { path: "orders", element: <AdminOrders /> },
      { path: "inventory", element: <AdminInventory /> },
      { path: "users", element: <AdminUsers /> },
      { path: "notifications", element: <AdminNotifications /> },
      { path: "pricing", element: <AdminPricing /> },
      { path: "delivery", element: <AdminDelivery /> },
    ],
  },
  {
    path: "/delivery/dashboard",
    element: <DeliveryLayout />,
    errorElement: <GlobalErrorBoundary />,
    children: [{ index: true, element: <DeliveryDashboard /> }],
  },
]);
