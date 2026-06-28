import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { Bell, Check, Trash2, ArrowLeft, Loader2, Sparkles, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  isAuthenticated,
  emitNotificationsUpdated,
  NOTIFICATIONS_UPDATED_EVENT,
  type UserNotification,
} from "../../../lib/api";

export function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }

    fetchNotifications();

    // Global listener for synchronized updates from the top bar
    if (typeof window !== "undefined") {
      window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, fetchNotifications);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, fetchNotifications);
      }
    };
  }, [navigate]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.is_read;
      if (filter === "read") return n.is_read;
      return true;
    });
  }, [notifications, filter]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      emitNotificationsUpdated();
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      emitNotificationsUpdated();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to update notifications");
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-slate-500 font-semibold animate-pulse">Loading your notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-12 animate-fade-in">
      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 px-3 py-2 flex items-center gap-2 md:hidden shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-full hover:bg-black/5 text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-base text-primary">Notifications</h1>
      </header>

      <div className="max-w-4xl mx-auto px-3 py-3 md:px-5 md:py-4 flex flex-col space-y-3">
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center mb-1">
          <div>
            <h1 className="text-xl font-black text-primary tracking-tight">Notifications</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Keep track of order updates, alerts, and promotions.</p>
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="rounded-full h-9 px-4 text-xs font-bold shadow-lg shadow-primary/10 transition-all flex items-center gap-1.5"
            >
              {markingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              <span>Mark all read</span>
            </Button>
          )}
        </div>

        {/* Filters Tabs row */}
        <div className="flex items-center justify-between bg-white border border-border/50 p-2 rounded-xl">
          <div className="flex gap-1.5 flex-1 md:flex-initial">
            {(["all", "unread", "read"] as const).map((tab) => {
              const isActive = filter === tab;
              const count =
                tab === "unread"
                  ? unreadCount
                  : tab === "read"
                  ? notifications.length - unreadCount
                  : notifications.length;

              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`flex-1 md:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 relative ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "text-slate-500 hover:text-primary hover:bg-secondary/50"
                  }`}
                >
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    {tab}
                    {count > 0 && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                        isActive 
                          ? "bg-white/20 text-white" 
                          : tab === "unread" 
                          ? "bg-red-50 text-red-600 border border-red-100" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mark all read button for mobile view */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="md:hidden text-[10px] font-black text-primary px-2.5 py-1.5 rounded-xl hover:bg-secondary flex items-center gap-1 shrink-0"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card className="border border-border/50 rounded-xl p-6 md:p-10 text-center bg-white">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-100 relative">
              <Bell className="w-6 h-6 text-slate-400" />
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-black text-primary mb-1">All caught up!</h3>
            <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto mb-5">
              {filter === "unread"
                ? "You have zero unread notifications. Awesome work!"
                : filter === "read"
                ? "You haven't read any notifications yet."
                : "You don't have any notifications at the moment."}
            </p>
            <Link to="/">
              <Button className="rounded-full h-9 px-5 text-xs font-bold shadow-lg shadow-primary/20">
                Continue Shopping
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) handleMarkAsRead(notif.id);
                }}
                className={`p-3 md:p-4 bg-white border border-border/50 rounded-xl transition-all duration-300 flex items-start gap-3 cursor-pointer relative group ${
                  notif.is_read
                    ? "opacity-75 hover:border-primary/20"
                    : "border-primary/20 bg-primary/[0.01] hover:bg-primary/[0.02] hover:border-primary/30"
                }`}
              >
                {/* Left Icon Badge */}
                <div className="shrink-0 mt-0.5">
                  {notif.is_read ? (
                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform">
                      <Bell className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center text-primary group-hover:scale-105 transition-transform relative">
                      <Bell className="w-4 h-4" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-extrabold text-xs text-primary leading-tight">
                      {notif.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-primary/85 font-medium mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1.5">
                    {formatDistanceToNow(new Date(notif.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                {/* Right Mark as Read Button */}
                {!notif.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                      }}
                      className="shrink-0 p-2 rounded-xl border border-primary/10 hover:border-primary/30 hover:bg-primary/5 text-primary transition-all self-center md:self-start opacity-80 hover:opacity-100"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
