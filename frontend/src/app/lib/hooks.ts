import { useEffect } from "react";
import useSWR, { mutate } from "swr";
import useSWRInfinite from "swr/infinite";
import {
  getCart,
  CART_UPDATED_EVENT,
  isAuthenticated,
  getCatalogProducts,
  getCatalogCategories,
  getCatalogProduct,
  getDailyProducts,
} from "./api";
import type { ProductListParams } from "./catalog/catalog";
import type { BackendProduct, PaginatedResponse } from "./catalog/types";

// ---------------------------------------------------------------------------
// Global cart-updated listener — registered once at module level.
// Uses a flag so dev HMR re-imports don't stack up duplicate listeners.
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    __cartListenerRegistered?: boolean;
  }
}
if (typeof window !== "undefined" && !window.__cartListenerRegistered) {
  window.__cartListenerRegistered = true;
  window.addEventListener(CART_UPDATED_EVENT, () => {
    mutate("/cart/");
  });
}

// ---------------------------------------------------------------------------
// Cart hook
// - revalidateOnFocus: false  → stop refetching every time user tabs back
// - dedupingInterval: 30s     → collapse burst requests (add-to-cart clicks)
// - revalidateOnReconnect     → keep working after network flaps
// ---------------------------------------------------------------------------
export function useCartState() {
  const { data: cart, error, isLoading } = useSWR("/cart/", getCart, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30_000,
  });

  const cartItems = cart?.items ?? [];
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return { cartItems, cartCount, loading: isLoading, error };
}

// ---------------------------------------------------------------------------
// Catalog hooks
// ---------------------------------------------------------------------------

/**
 * Fetches a single page of products with a larger page_size.
 * Used by the homepage to get enough products to fill category rows.
 */
export function useCatalogProducts(search?: string) {
  const key = search
    ? `/catalog/products/?search=${encodeURIComponent(search)}&page_size=48`
    : "/catalog/products/?page_size=48";

  const { data, error, isLoading } = useSWR(
    key,
    () => getCatalogProducts({ search, page_size: 48 }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
    }
  );

  return { products: data?.results ?? [], loading: isLoading, error };
}

/**
 * Server-side paginated products for the admin page (page-number pagination).
 */
export function usePaginatedProducts(page: number, search?: string) {
  const key = `/catalog/products/paginated?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`;

  const { data, error, isLoading, mutate: revalidate } = useSWR(
    key,
    () => getCatalogProducts({ page, search }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30_000,
    }
  );

  const fallback: PaginatedResponse<BackendProduct> = {
    count: 0, next: null, previous: null, results: [],
  };
  const result = data ?? fallback;

  return {
    products: result.results,
    totalCount: result.count,
    totalPages: Math.ceil(result.count / 20),
    loading: isLoading,
    error,
    revalidate,
  };
}

/**
 * Infinite scroll hook for the categories/explore page.
 * Uses useSWRInfinite to accumulate pages as the user scrolls.
 */
export function useInfiniteProducts(params: Omit<ProductListParams, "page"> = {}) {
  const PAGE_SIZE = 20;

  const getKey = (
    pageIndex: number,
    previousPageData: PaginatedResponse<BackendProduct> | null
  ) => {
    if (previousPageData && !previousPageData.next) return null;
    const p: ProductListParams = { ...params, page: pageIndex + 1, page_size: PAGE_SIZE };
    return JSON.stringify(p);
  };

  const { data, error, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    (key: string) => getCatalogProducts(JSON.parse(key) as ProductListParams),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateFirstPage: false,
      dedupingInterval: 60_000,
    }
  );

  const products = data ? data.flatMap((page) => page.results) : [];
  const totalCount = data?.[0]?.count ?? 0;
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const hasMore = data ? Boolean(data[data.length - 1]?.next) : false;

  return {
    products,
    totalCount,
    hasMore,
    loadMore: () => setSize(size + 1),
    loading: isLoading,
    loadingMore: Boolean(isLoadingMore) || isValidating,
    error,
  };
}

/**
 * Daily shuffled products for the homepage. Requests a larger batch (48)
 * so the homepage has enough variety across categories.
 */
export function useDailyProducts() {
  const { data, error, isLoading } = useSWR(
    "/catalog/products/?daily=1&page_size=48",
    () => getDailyProducts(48),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300_000,
    }
  );

  return { products: data?.results ?? [], loading: isLoading, error };
}

export function useCatalogCategories() {
  const { data, error, isLoading } = useSWR(
    "/catalog/categories/",
    getCatalogCategories,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      // Categories change rarely — cache for 5 minutes
      dedupingInterval: 300_000,
    }
  );

  return { categories: data ?? [], loading: isLoading, error };
}

export function useProduct(productId: number | string | undefined) {
  const { data, error, isLoading } = useSWR(
    productId ? `/catalog/products/${productId}/` : null,
    () => getCatalogProduct(Number(productId)),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
    }
  );

  return { product: data, loading: isLoading, error };
}
