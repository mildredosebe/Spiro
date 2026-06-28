// ---------------------------------------------------------------------------
// Cart domain — API functions (guest + authenticated)
// ---------------------------------------------------------------------------

import { request, isAuthenticated, emitCartUpdated } from "../core/api-client";
import type { BackendCart, BackendCartItem } from "./types";
import { toast } from "sonner";

export type { BackendCart, BackendCartItem };

const LOCAL_CART_KEY = "ozzie_guest_cart";

// ---------------------------------------------------------------------------
// Guest cart (localStorage)
// ---------------------------------------------------------------------------

function getGuestCart(): BackendCart {
  try {
    const data = localStorage.getItem(LOCAL_CART_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse guest cart", e);
  }
  return { id: 0, items: [], updated_at: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Sync guest cart to backend on login
// ---------------------------------------------------------------------------

export async function syncGuestCart() {
  const cart = getGuestCart();
  if (!cart || cart.items.length === 0) return;

  const payload = cart.items.map((i: BackendCartItem) => ({
    product_id: i.product,
    quantity: i.quantity,
  }));

  try {
    await request("/cart/sync/", { method: "POST", body: JSON.stringify({ items: payload }) }, true);
    localStorage.removeItem(LOCAL_CART_KEY);
    emitCartUpdated();
  } catch (e) {
    console.error("Failed to sync guest cart", e);
  }
}

// ---------------------------------------------------------------------------
// Get cart
// ---------------------------------------------------------------------------

export async function getCart() {
  if (!isAuthenticated()) {
    return getGuestCart();
  }
  return request<BackendCart>("/cart/", { method: "GET" }, true);
}

// ---------------------------------------------------------------------------
// Upsert cart item
// ---------------------------------------------------------------------------

export async function upsertCartItem(
  productId: number,
  quantity: number,
  details?: { name?: string; price?: string | number; image_url?: string; image?: string }
) {
  const productName = details?.name || "Product";

  // Snappy UX: Fire optimistic toast instantly!
  if (quantity === 0) {
    toast.success(`${productName} removed from cart`);
  } else {
    toast.success(`${productName} cart updated!`);
  }

  try {
    if (!isAuthenticated()) {
      const cart = getGuestCart();
      const existing = cart.items.find((i) => i.product === productId);
      if (existing) {
        existing.quantity = quantity;
      } else {
        cart.items.push({
          id: Date.now(),
          product: productId,
          quantity,
          product_name: details?.name || "Product",
          product_price: details?.price ? String(details.price) : "0",
          product_image_url: details?.image_url || details?.image || "",
        });
      }
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
      emitCartUpdated();
      return cart;
    }

    const cart = await request<BackendCart>(
      "/cart/items/",
      {
        method: "POST",
        body: JSON.stringify({ product_id: productId, quantity }),
      },
      true
    );
    emitCartUpdated();
    return cart;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update cart";
    toast.dismiss();
    toast.error(message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Delete cart item
// ---------------------------------------------------------------------------

export async function deleteCartItem(itemId: number, productName: string = "Item") {
  // Snappy UX: Fire optimistic toast instantly!
  toast.success(`${productName} removed from cart`);

  try {
    if (!isAuthenticated()) {
      const cart = getGuestCart();
      cart.items = cart.items.filter((i) => i.id !== itemId);
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
      emitCartUpdated();
      return cart;
    }

    const cart = await request<BackendCart>(`/cart/items/${itemId}/`, { method: "DELETE" }, true);
    emitCartUpdated();
    return cart;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove item";
    toast.dismiss();
    toast.error(message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Clear entire cart
// ---------------------------------------------------------------------------

export async function clearCart() {
  const cart = await getCart();
  await Promise.all(cart.items.map((item) => deleteCartItem(item.id)));
}
