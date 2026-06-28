import { AdminUser } from "../auth/types";

export interface NotificationRecipient {
  id: number;
  user: number | null;
  custom_email: string | null;
  email_display: string;
  user_name: string | null;
  created_at: string;
}

export interface UserNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
