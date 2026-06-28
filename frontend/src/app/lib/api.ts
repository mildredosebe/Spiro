
// Core
export {
  CART_UPDATED_EVENT,
  NOTIFICATIONS_UPDATED_EVENT,
  isAuthenticated,
  getCurrentUser,
  clearSession,
  emitNotificationsUpdated,
} from "./core/api-client";

// Auth types
export type {
  AuthUser,
  UserAddress,
  AdminUser,
  AdminDashboardAnalytics,
} from "./auth/types";

// Auth functions
export {
  registerUser,
  loginUser,
  loginWithGoogle,
  getMe,
  updateMe,
  getAdminUsers,
  updateAdminUserStatus,
  getAdminDashboardAnalytics,
  requestPasswordReset,
  resetPasswordWithOTP,
} from "./auth/auth";

// Cart types
export type { BackendCart, BackendCartItem } from "./cart/types";

// Cart functions
export {
  getCart,
  upsertCartItem,
  deleteCartItem,
  clearCart,
  syncGuestCart,
} from "./cart/cart";

// Catalog types
export type {
  BackendCategory,
  BackendProduct,
  BackendProductReview,
  PaginatedResponse,
} from "./catalog/types";

// Catalog functions
export {
  getCatalogCategories,
  getCatalogProducts,
  getDailyProducts,
  getCatalogProduct,
  createCatalogProduct,
  updateCatalogProduct,
  deleteCatalogProduct,
  deleteProductImage,
  createCatalogCategory,
  updateCatalogCategory,
  deleteCatalogCategory,
} from "./catalog/catalog";

// Orders types
export type {
  BackendOrder,
  BackendOrderItem,
  OrderReviewInput,
  FeeRule,
  PricingCalculation,
  DeliveryTimeSlot,
} from "./orders/types";

// Orders functions
export {
  getOrders,
  getOrder,
  createOrder,
  processOrderPayment,
  customerConfirmOrder,
  submitOrderReviews,
  getAdminOrders,
  updateOrderStatus,
  getDeliveryQueueOrders,
  confirmOrderDelivery,
  getCheckoutPricingPreview,
  getAdminFeeRules,
  createAdminFeeRule,
  updateAdminFeeRule,
  deleteAdminFeeRule,
  getActiveDeliveryTimeSlots,
  getAdminDeliveryTimeSlots,
  createAdminDeliveryTimeSlot,
  updateAdminDeliveryTimeSlot,
  deleteAdminDeliveryTimeSlot,
} from "./orders/orders";

// Notifications types
export type { NotificationRecipient, UserNotification } from "./notifications/types";

// Notifications functions
export {
  getNotificationRecipients,
  addNotificationRecipient,
  deleteNotificationRecipient,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "./notifications/notifications";

// Payments types
export type { MpesaStkResponse, MpesaStatusResponse } from "./payments/types";

// Payments functions
export {
  initiateMpesaPayment,
  getMpesaPaymentStatus,
} from "./payments/mpesa";

