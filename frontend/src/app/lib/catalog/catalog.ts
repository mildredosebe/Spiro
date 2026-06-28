// ---------------------------------------------------------------------------
// Catalog domain — API functions
// ---------------------------------------------------------------------------

import { request } from "../core/api-client";
import type { BackendCategory, BackendProduct, PaginatedResponse } from "./types";

export type { BackendCategory, BackendProduct, PaginatedResponse };
export type { BackendProductReview } from "./types";

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCatalogCategories() {
  const data = await request<BackendCategory[] | { results: BackendCategory[] }>(
    "/catalog/categories/",
    { method: "GET" }
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface ProductListParams {
  search?: string;
  category?: string;
  ordering?: string;
  price_min?: number;
  price_max?: number;
  page?: number;
  page_size?: number;
}

export async function getCatalogProducts(
  params: ProductListParams = {}
): Promise<PaginatedResponse<BackendProduct>> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);
  if (params.ordering) query.set("ordering", params.ordering);
  if (params.price_min != null) query.set("price_min", String(params.price_min));
  if (params.price_max != null) query.set("price_max", String(params.price_max));
  if (params.page) query.set("page", String(params.page));
  if (params.page_size) query.set("page_size", String(params.page_size));
  const qs = query.toString();
  const url = `/catalog/products/${qs ? `?${qs}` : ""}`;
  const data = await request<PaginatedResponse<BackendProduct>>(
    url,
    { method: "GET" }
  );
  // Handle both paginated and unpaginated responses for safety
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return data;
}

export async function getDailyProducts(
  pageSize = 48
): Promise<PaginatedResponse<BackendProduct>> {
  const data = await request<PaginatedResponse<BackendProduct>>(
    `/catalog/products/?daily=1&page_size=${pageSize}`,
    { method: "GET" }
  );
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return data;
}

export async function getCatalogProduct(productId: number) {
  return request<BackendProduct>(`/catalog/products/${productId}/`, { method: "GET" });
}

export async function createCatalogProduct(payload: {
  name: string;
  description: string;
  image_url: string;
  price: number;
  stock: number;
  category_id: number;
  is_active?: boolean;
  image?: File | null;
} | FormData) {
  return request<BackendProduct>(
    "/catalog/products/",
    {
      method: "POST",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    },
    true
  );
}

export async function updateCatalogProduct(productId: number, payload: Partial<{
  name: string;
  description: string;
  image_url: string;
  price: number;
  stock: number;
  category_id: number;
  is_active: boolean;
  image?: File | null;
}> | FormData) {
  return request<BackendProduct>(
    `/catalog/products/${productId}/`,
    {
      method: "PATCH",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    },
    true
  );
}

export async function deleteCatalogProduct(productId: number) {
  return request<void>(`/catalog/products/${productId}/`, { method: "DELETE" }, true);
}

export async function deleteProductImage(productId: number, imageId: number): Promise<void> {
  return request<void>(
    `/catalog/products/${productId}/images/${imageId}/`,
    { method: "DELETE" },
    true
  );
}

// ---------------------------------------------------------------------------
// Category Administration CRUD endpoints
// ---------------------------------------------------------------------------

export async function createCatalogCategory(payload: {
  name: string;
  category_type: "food" | "non_food";
  is_active?: boolean;
  image?: File | null;
} | FormData) {
  return request<BackendCategory>(
    "/catalog/categories/",
    {
      method: "POST",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    },
    true
  );
}

export async function updateCatalogCategory(
  categoryId: number,
  payload: Partial<{
    name: string;
    category_type: "food" | "non_food";
    is_active: boolean;
    image?: File | null;
  }> | FormData
) {
  return request<BackendCategory>(
    `/catalog/categories/${categoryId}/`,
    {
      method: "PATCH",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    },
    true
  );
}

export async function deleteCatalogCategory(categoryId: number) {
  return request<{ detail?: string } | void>(`/catalog/categories/${categoryId}/`, {
    method: "DELETE",
  }, true);
}

