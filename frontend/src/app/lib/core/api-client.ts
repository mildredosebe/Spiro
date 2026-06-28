export const API_BASE = "http://127.0.0.1:8002/api";
const ACCESS_KEY = "ozzie_access_token";
const REFRESH_KEY = "ozzie_refresh_token";
const USER_KEY = "ozzie_user";
export const CART_UPDATED_EVENT = "ozzie:cart-updated";
export const NOTIFICATIONS_UPDATED_EVENT = "ozzie:notifications-updated";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Error message extraction
// ---------------------------------------------------------------------------
export function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  if (typeof obj.detail === "string") return obj.detail;

  const parts: string[] = [];
  for (const [field, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      parts.push(`${field}: ${value}`);
      continue;
    }
    if (Array.isArray(value)) {
      const text = value
        .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
        .join(", ");
      parts.push(`${field}: ${text}`);
    }
  }

  if (parts.length > 0) return parts.join(" | ");
  return null;
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
interface TokenPair {
  access: string;
  refresh: string;
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: TokenPair) {
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

// ---------------------------------------------------------------------------
// User session helpers
// ---------------------------------------------------------------------------
import type { AuthUser } from "../auth/types";

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function emitCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }
}

export function emitNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  emitCartUpdated();
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------
async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const data = (await response.json()) as { access: string };
  localStorage.setItem(ACCESS_KEY, data.access);
  return data.access;
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------
export async function request<T>(
  path: string,
  options: RequestInit = {},
  authRequired = false,
  retry = true
): Promise<T> {
  const headers = new Headers(options.headers || {});
  const method = (options.method || "GET").toUpperCase();
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = hasBody && options.body instanceof FormData;
  if (hasBody && method !== "GET" && method !== "HEAD" && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (authRequired) {
    const token = getAccessToken();
    if (!token) throw new ApiError("Authentication required", 401);
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && authRequired && retry) {
    const newAccess = await refreshAccessToken();
    if (!newAccess) throw new ApiError("Session expired", 401);
    return request<T>(path, options, authRequired, false);
  }

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = (await response.json()) as unknown;
      message = extractErrorMessage(data) || message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
