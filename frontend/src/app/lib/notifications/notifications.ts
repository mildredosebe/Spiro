import { request } from "../core/api-client";
import type { NotificationRecipient } from "./types";

export const getNotificationRecipients = async (): Promise<NotificationRecipient[]> => {
  const data = await request<NotificationRecipient[] | { results: NotificationRecipient[] }>(
    "/notifications/recipients/", 
    { method: "GET" }, 
    true
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
};

export const addNotificationRecipient = async (
  payload: { user?: string; custom_email?: string }
): Promise<NotificationRecipient> => {
  return request<NotificationRecipient>("/notifications/recipients/", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
};

export const deleteNotificationRecipient = async (id: number): Promise<void> => {
  await request<void>(`/notifications/recipients/${id}/`, { method: "DELETE" }, true);
};

export const getNotifications = async (): Promise<import("./types").UserNotification[]> => {
  const data = await request<import("./types").UserNotification[] | { results: import("./types").UserNotification[] }>(
    "/notifications/me/",
    { method: "GET" },
    true
  );
  if (Array.isArray(data)) return data;
  return data.results || [];
};

export const markNotificationAsRead = async (id: number): Promise<{ status: string }> => {
  return request<{ status: string }>(`/notifications/me/${id}/read/`, {
    method: "POST",
  }, true);
};

export const markAllNotificationsAsRead = async (): Promise<{ status: string }> => {
  return request<{ status: string }>("/notifications/me/read-all/", {
    method: "POST",
  }, true);
};
