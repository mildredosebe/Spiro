// ---------------------------------------------------------------------------
// Catalog domain — TypeScript types
// ---------------------------------------------------------------------------

export interface BackendCategory {
  id: number;
  name: string;
  slug: string;
  category_type: "food" | "non_food";
  image_url?: string;
  image_public_id?: string;
  is_active: boolean;
}

export interface BackendProductReview {
  id: number;
  rating: number;
  review: string;
  reviewer_name: string;
  created_at: string;
}

export interface ProductImage {
  id: number;
  image_url: string;
  public_id: string;
}

export interface BackendProduct {
  id: number;
  name: string;
  description: string;
  image_url: string;
  gallery: ProductImage[];
  price: string;
  stock: number;
  is_active: boolean;
  category: BackendCategory;
  average_rating?: number;
  reviews_count?: number;
  recent_reviews?: BackendProductReview[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
