// ---------------------------------------------------------------------------
// Orders domain — TypeScript types
// ---------------------------------------------------------------------------

export interface BackendOrderItem {
  id: number;
  product: number;
  product_name: string;
  product_image_url: string;
  product_category_type?: "food" | "non_food";
  product_category_name?: string;
  quantity: number;
  unit_price: string;
}

export interface BackendOrder {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  payment_reference?: string;
  payment_failure_reason?: string;
  paid_at?: string | null;
  subtotal: string;
  service_fee: string;
  delivery_fee: string;
  surge_fee: string;
  total_amount: string;
  applied_fees_metadata?: Record<string, any>;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  items: BackendOrderItem[];
  user_email?: string;
  delivery_recipient_name?: string;
  delivery_recipient_signature?: string;
  delivery_notes?: string;
  delivered_at?: string | null;
  customer_confirmed_at?: string | null;
  delivered_by_email?: string;
  is_scheduled?: boolean;
  scheduled_delivery_date?: string | null;
  scheduled_delivery_slot?: number | null;
  scheduled_delivery_slot_name?: string | null;
  created_at: string;
}

export interface OrderReviewInput {
  order_item_id: number;
  rating: number;
  review?: string;
}

export interface FeeRule {
  id: number;
  name: string;
  code: string;
  fee_type: "fixed" | "percentage" | "tiered_order_value" | "tiered_distance";
  description: string;
  is_active: boolean;
  always_applied: boolean;
  rules_config: any;
  created_at: string;
  updated_at: string;
}

export interface PricingCalculation {
  subtotal: string;
  service_fee: string;
  delivery_fee: string;
  surge_fee: string;
  total_amount: string;
  metadata: Record<string, any>;
}

export interface DeliveryTimeSlot {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
}
