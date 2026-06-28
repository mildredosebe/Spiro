// ---------------------------------------------------------------------------
// Cart domain — TypeScript types
// ---------------------------------------------------------------------------

export interface BackendCartItem {
  id: number;
  product: number;
  product_name: string;
  product_price: string;
  product_image_url?: string;
  quantity: number;
}

export interface BackendCart {
  id: number;
  updated_at: string;
  items: BackendCartItem[];
}
