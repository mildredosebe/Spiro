// ---------------------------------------------------------------------------
// Auth domain — API functions
// ---------------------------------------------------------------------------

import { request, setTokens, setCurrentUser } from "../core/api-client";
import { syncGuestCart } from "../cart/cart";
import type { AuthUser, UserAddress, AdminUser, AdminDashboardAnalytics } from "./types";

export type { AuthUser, UserAddress, AdminUser, AdminDashboardAnalytics };

interface TokenPair {
  access: string;
  refresh: string;
  // Google and login endpoints return the user inline to avoid a second round-trip
  user?: AuthUser;
}

// ---------------------------------------------------------------------------
// Registration & login
// ---------------------------------------------------------------------------

export async function registerUser(payload: {
  email: string;
  password: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  return request<AuthUser>("/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(email: string, password: string) {
  const tokens = await request<TokenPair>("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setTokens(tokens);
  // Fetch fresh profile (standard login endpoint doesn’t return user inline)
  const user = await getMe();
  setCurrentUser(user);
  await syncGuestCart();
  return user;
}

export async function loginWithGoogle(idToken: string) {
  const tokens = await request<TokenPair>("/auth/google/", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });

  setTokens(tokens);
  // Google endpoint returns user inline — no second round-trip needed
  const user = tokens.user ?? await getMe();
  setCurrentUser(user);
  await syncGuestCart();
  return user;
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function requestPasswordReset(email: string) {
  return request<{ detail: string }>("/auth/forgot-password/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordWithOTP(email: string, otp: string, new_password: string) {
  return request<{ detail: string }>("/auth/reset-password/", {
    method: "POST",
    body: JSON.stringify({ email, otp, new_password }),
  });
}

// ---------------------------------------------------------------------------
// Current user profile
// ---------------------------------------------------------------------------

export async function getMe() {
  return request<AuthUser>("/auth/me/", { method: "GET" }, true);
}

export async function updateMe(
  payload: Partial<Pick<AuthUser, "first_name" | "last_name" | "phone">> & {
    addresses?: UserAddress[];
  }
) {
  const user = await request<AuthUser>(
    "/auth/me/",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    true
  );
  setCurrentUser(user);
  return user;
}

// ---------------------------------------------------------------------------
// Admin — users
// ---------------------------------------------------------------------------

export async function getAdminUsers() {
  const data = await request<AdminUser[] | { results: AdminUser[] }>(
    "/auth/admin/users/",
    { method: "GET" },
    true
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
}

export async function updateAdminUserStatus(
  userId: string,
  payload: Partial<{ is_active: boolean; is_staff: boolean; is_delivery_agent: boolean }>
) {
  return request<AdminUser>(
    `/auth/admin/users/${userId}/status/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    true
  );
}

// ---------------------------------------------------------------------------
// Admin — dashboard analytics
// ---------------------------------------------------------------------------

export async function getAdminDashboardAnalytics() {
  return request<AdminDashboardAnalytics>(
    "/core/admin/dashboard/analytics/",
    { method: "GET" },
    true
  );
}
