import { useEffect, useState } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  emitNotificationsUpdated,
  NOTIFICATIONS_UPDATED_EVENT,
  type UserNotification,
} from "../lib/api";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (typeof window !== "undefined") {
      window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, fetchNotifications);
    }

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, fetchNotifications);
      }
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      emitNotificationsUpdated();
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All caught up!");
      emitNotificationsUpdated();
    } catch (error) {
      toast.error("Failed to mark all as read");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all duration-200 text-primary hover:bg-black/8"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 md:w-4 md:h-4" />
          <span className="hidden md:inline">Notifications</span>
          {unreadCount > 0 && (
            <span className="absolute md:static top-0 right-0 translate-x-1/4 -translate-y-1/4 md:translate-x-0 md:translate-y-0 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full inline-flex items-center justify-center px-1 shadow border border-white md:border-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] md:w-[400px] p-0 rounded-2xl shadow-2xl border-border/50 overflow-hidden"
      >
        <div className="bg-secondary/50 border-b border-border/50 px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-primary">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isLoading}
              className="text-xs font-semibold text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="font-semibold text-primary">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">
                You have no new notifications.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read) handleMarkAsRead(notif.id);
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-colors flex gap-3 ${
                    notif.is_read
                      ? "hover:bg-secondary/50 opacity-70"
                      : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {notif.is_read ? (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center relative">
                        <Bell className="w-4 h-4 text-primary" />
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="font-bold text-sm text-primary leading-tight">
                        {notif.title}
                      </p>
                    </div>
                    <p className="text-xs text-primary/80 line-clamp-2 mt-1">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium mt-1.5">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-border/50 p-3 bg-secondary/15 text-center">
          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="text-xs font-black text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1.5"
          >
            View all notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
