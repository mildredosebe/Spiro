// ---------------------------------------------------------------------------
// Orders domain — API functions
// ---------------------------------------------------------------------------

import { request } from "../core/api-client";
import type { BackendOrder, OrderReviewInput, FeeRule, PricingCalculation, DeliveryTimeSlot } from "./types";

export type { BackendOrder, BackendOrderItem, OrderReviewInput, FeeRule, PricingCalculation, DeliveryTimeSlot } from "./types";

// ---------------------------------------------------------------------------
// Customer orders
// ---------------------------------------------------------------------------

export async function getOrders() {
  const data = await request<BackendOrder[] | { results: BackendOrder[] }>(
    "/orders/",
    { method: "GET" },
    true
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
}

export async function getOrder(orderId: string) {
  return request<BackendOrder>(`/orders/${orderId}/`, { method: "GET" }, true);
}

export async function createOrder(payload: {
  payment_method: string;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  distance_km?: number;
  is_scheduled?: boolean;
  scheduled_delivery_date?: string;
  scheduled_delivery_slot_id?: number;
  items: Array<{ product_id: number; quantity: number }>;
}) {
  return request<BackendOrder>(
    "/orders/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function processOrderPayment(
  orderId: string,
  payload: {
    mpesa_phone?: string;
    card_last4?: string;
    simulate_failure?: boolean;
  } = {}
) {
  return request<BackendOrder>(
    `/orders/${orderId}/process-payment/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function customerConfirmOrder(orderId: string) {
  return request<BackendOrder>(
    `/orders/${orderId}/customer-confirm/`,
    { method: "POST" },
    true
  );
}

export async function submitOrderReviews(orderId: string, reviews: OrderReviewInput[]) {
  return request<{ detail: string }>(
    `/orders/${orderId}/reviews/`,
    {
      method: "POST",
      body: JSON.stringify({ reviews }),
    },
    true
  );
}

// ---------------------------------------------------------------------------
// Admin orders
// ---------------------------------------------------------------------------

export async function getAdminOrders() {
  const data = await request<BackendOrder[] | { results: BackendOrder[] }>(
    "/orders/admin/",
    { method: "GET" },
    true
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
}

export async function updateOrderStatus(orderId: string, status: string) {
  return request<BackendOrder>(
    `/orders/${orderId}/status/`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    true
  );
}

// ---------------------------------------------------------------------------
// Delivery agent orders
// ---------------------------------------------------------------------------

export async function getDeliveryQueueOrders() {
  const data = await request<BackendOrder[] | { results: BackendOrder[] }>(
    "/orders/delivery-queue/",
    { method: "GET" },
    true
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
}

export async function confirmOrderDelivery(
  orderId: string,
  payload: {
    recipient_name: string;
    recipient_signature: string;
    delivery_notes?: string;
  }
) {
  return request<BackendOrder>(
    `/orders/${orderId}/confirm-delivery/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true
  );
}

// ---------------------------------------------------------------------------
// Dynamic Pricing & Fee rules
// ---------------------------------------------------------------------------

export async function getCheckoutPricingPreview(subtotal: number, distance_km: number) {
  return request<PricingCalculation>(
    "/orders/pricing-preview/",
    {
      method: "POST",
      body: JSON.stringify({ subtotal, distance_km }),
    },
    true
  );
}

export async function getAdminFeeRules() {
  const data = await request<FeeRule[] | { results: FeeRule[] }>(
    "/orders/admin/fee-rules/",
    { method: "GET" },
    true
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
}

export async function createAdminFeeRule(payload: Partial<FeeRule>) {
  return request<FeeRule>(
    "/orders/admin/fee-rules/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function updateAdminFeeRule(ruleId: number, payload: Partial<FeeRule>) {
  return request<FeeRule>(
    `/orders/admin/fee-rules/${ruleId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function deleteAdminFeeRule(ruleId: number) {
  return request<void>(
    `/orders/admin/fee-rules/${ruleId}/`,
    { method: "DELETE" },
    true
  );
}

// ---------------------------------------------------------------------------
// Delivery Time Slots
// ---------------------------------------------------------------------------

export async function getActiveDeliveryTimeSlots() {
  const data = await request<DeliveryTimeSlot[] | { results: DeliveryTimeSlot[] }>(
    "/orders/delivery-time-slots/",
    { method: "GET" },
    true
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
}

export async function getAdminDeliveryTimeSlots() {
  const data = await request<DeliveryTimeSlot[] | { results: DeliveryTimeSlot[] }>(
    "/orders/admin/delivery-time-slots/",
    { method: "GET" },
    true
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
}

export async function createAdminDeliveryTimeSlot(payload: Partial<DeliveryTimeSlot>) {
  return request<DeliveryTimeSlot>(
    "/orders/admin/delivery-time-slots/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function updateAdminDeliveryTimeSlot(slotId: number, payload: Partial<DeliveryTimeSlot>) {
  return request<DeliveryTimeSlot>(
    `/orders/admin/delivery-time-slots/${slotId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    true
  );
}

export async function deleteAdminDeliveryTimeSlot(slotId: number) {
  return request<void>(
    `/orders/admin/delivery-time-slots/${slotId}/`,
    { method: "DELETE" },
    true
  );
}
