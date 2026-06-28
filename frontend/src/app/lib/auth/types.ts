// ---------------------------------------------------------------------------
// Auth domain — TypeScript types
// ---------------------------------------------------------------------------

export interface UserAddress {
  id?: string;
  label?: string;
  full_name: string;
  phone: string;
  address: string;
  city?: string;
  postal_code?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  addresses?: UserAddress[];
  is_staff: boolean;
  is_delivery_agent: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  is_staff: boolean;
  is_delivery_agent: boolean;
  date_joined: string;
  total_orders: number;
  total_spent: string;
}

export interface AdminDashboardAnalytics {
  totals: {
    users: number;
    products: number;
    orders: number;
    revenue: number | string;
  };
  status_breakdown: Record<string, number>;
  recent_orders: Array<{
    id: string;
    status: string;
    total_amount: number | string;
    created_at: string;
    user__email: string;
  }>;
  recent_users: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    date_joined: string;
  }>;
}
