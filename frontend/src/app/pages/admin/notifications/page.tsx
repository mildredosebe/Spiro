import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, Mail, User, Bell, Check, CheckCheck, Loader2, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { toast } from "sonner";
import {
  getNotificationRecipients,
  addNotificationRecipient,
  deleteNotificationRecipient,
  getAdminUsers,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  emitNotificationsUpdated,
  NOTIFICATIONS_UPDATED_EVENT,
  type NotificationRecipient,
  type AdminUser,
  type UserNotification
} from "../../../lib/api";

export function AdminNotifications() {
  const [activeTab, setActiveTab] = useState<"alerts" | "settings">("alerts");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [staffUsers, setStaffUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addMode, setAddMode] = useState<"user" | "custom">("user");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [customEmail, setCustomEmail] = useState("");

  // In-App Staff Notifications State
  const [staffNotifications, setStaffNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchStaffNotifications = async () => {
    try {
      const data = await getNotifications();
      setStaffNotifications(data);
    } catch (err) {
      console.error("Failed to load staff notifications", err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [recipientsData, usersData] = await Promise.all([
        getNotificationRecipients(),
        getAdminUsers()
      ]);
      setRecipients(recipientsData);
      setStaffUsers(usersData.filter(u => u.is_staff));
    } catch (error) {
      toast.error("Failed to load notification recipients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchStaffNotifications();

    // Global listener for synchronized updates from the top bar
    if (typeof window !== "undefined") {
      window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, fetchStaffNotifications);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, fetchStaffNotifications);
      }
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const unreadAlertsCount = useMemo(() => {
    return staffNotifications.filter((n) => !n.is_read).length;
  }, [staffNotifications]);

  const totalPages = Math.ceil((activeTab === "alerts" ? staffNotifications.length : recipients.length) / PAGE_SIZE);
  const paginatedNotifications = staffNotifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedRecipients = recipients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Remove this recipient?")) return;
    try {
      await deleteNotificationRecipient(id);
      setRecipients(prev => prev.filter(r => r.id !== id));
      toast.success("Recipient removed");
    } catch (error) {
      toast.error("Failed to remove recipient");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: { user?: string; custom_email?: string } = {};
      if (addMode === "user") {
        if (!selectedUserId) {
          toast.error("Please select a staff user.");
          return;
        }
        payload.user = selectedUserId;
      } else {
        if (!customEmail) {
          toast.error("Please enter an email address.");
          return;
        }
        payload.custom_email = customEmail;
      }

      const newRecipient = await addNotificationRecipient(payload);
      setRecipients(prev => [newRecipient, ...prev]);
      toast.success("Recipient added");
      setIsDialogOpen(false);
      setSelectedUserId("");
      setCustomEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to add recipient");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id);
      setStaffNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      emitNotificationsUpdated();
      toast.success("Alert marked as read");
    } catch (error) {
      toast.error("Failed to update alert");
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadAlertsCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setStaffNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      emitNotificationsUpdated();
      toast.success("All alerts marked as read");
    } catch (error) {
      toast.error("Failed to update alerts");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-slate-500 font-medium">Manage in-app administrative alerts and email recipient preferences.</p>
        </div>
      </div>

      {/* Tabs list row */}
      <div className="flex items-center justify-between bg-white border border-slate-200/60 p-2 rounded-2xl shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-5 py-3 rounded-xl text-sm font-black capitalize transition-all duration-300 flex items-center gap-2 ${
              activeTab === "alerts"
                ? "bg-primary text-white shadow-lg shadow-primary/10"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Bell className="w-4.5 h-4.5" />
            <span>In-App Alerts</span>
            {unreadAlertsCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
                activeTab === "alerts" ? "bg-white/20 text-white" : "bg-red-50 text-red-600 border border-red-100"
              }`}>
                {unreadAlertsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-3 rounded-xl text-sm font-black capitalize transition-all duration-300 flex items-center gap-2 ${
              activeTab === "settings"
                ? "bg-primary text-white shadow-lg shadow-primary/10"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Mail className="w-4.5 h-4.5" />
            <span>Email Settings</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
              activeTab === "settings" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {recipients.length}
            </span>
          </button>
        </div>

        {/* Global trigger actions depending on tab */}
        {activeTab === "alerts" && unreadAlertsCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="rounded-full h-11 px-5 font-bold shadow-lg shadow-primary/10 transition-all flex items-center gap-2"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4.5 h-4.5" />
            )}
            <span className="hidden sm:inline">Mark all read</span>
          </Button>
        )}

        {activeTab === "settings" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl h-11 px-5 font-bold shadow-lg shadow-primary/10">
                <Plus className="w-5 h-5 mr-1.5" />
                Add Recipient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md p-0 rounded-[2.5rem] border-none shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="bg-primary p-8 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Add Recipient</DialogTitle>
                  <p className="text-white/70 text-sm font-medium">Choose how to receive order alerts.</p>
                </DialogHeader>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  <Button 
                    type="button" 
                    variant={addMode === "user" ? "default" : "ghost"} 
                    className={`flex-1 rounded-xl h-10 font-bold transition-all ${addMode === "user" ? "shadow-md" : "text-slate-500 hover:text-slate-900"}`}
                    onClick={() => setAddMode("user")}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Staff
                  </Button>
                  <Button 
                    type="button" 
                    variant={addMode === "custom" ? "default" : "ghost"} 
                    className={`flex-1 rounded-xl h-10 font-bold transition-all ${addMode === "custom" ? "shadow-md" : "text-slate-500 hover:text-slate-900"}`}
                    onClick={() => setAddMode("custom")}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Custom
                  </Button>
                </div>

                {addMode === "user" ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Select Staff Admin</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select an admin..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {staffUsers.map(user => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                    <Input 
                      type="email" 
                      placeholder="admin@example.com" 
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                  <Button type="submit" className="flex-1 h-14 rounded-2xl font-black shadow-lg" disabled={submitting}>
                    {submitting ? "Adding..." : "Add Recipient"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Main content body depending on selected tab */}
      {activeTab === "alerts" ? (
        notificationsLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-slate-500 font-semibold animate-pulse">Loading administrative alerts...</p>
          </div>
        ) : staffNotifications.length === 0 ? (
          <Card className="border border-slate-200/60 rounded-[2.5rem] p-16 text-center shadow-sm bg-white">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 relative">
              <Bell className="w-10 h-10 text-slate-400" />
              <Sparkles className="absolute -top-1.5 -right-1.5 w-6 h-6 text-primary animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No administrative alerts</h3>
            <p className="text-slate-500 font-semibold max-w-sm mx-auto">
              There are no admin alerts or new order notifications at this moment. You are completely caught up!
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) handleMarkAsRead(notif.id);
                }}
                className={`p-6 bg-white border border-slate-200/60 rounded-[2rem] shadow-sm transition-all duration-300 flex items-start gap-4 cursor-pointer relative group ${
                  notif.is_read
                    ? "opacity-75 hover:border-primary/20"
                    : "border-primary/20 bg-primary/[0.01] hover:bg-primary/[0.02] hover:border-primary/30"
                }`}
              >
                {/* Left Icon Badge */}
                <div className="shrink-0 mt-0.5">
                  {notif.is_read ? (
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform">
                      <Bell className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-primary/8 flex items-center justify-center text-primary group-hover:scale-105 transition-transform relative">
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-[15px] text-slate-900 leading-tight">
                    {notif.title}
                  </h4>
                  <p className="text-[13px] text-slate-700 font-medium mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-2.5">
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
                    className="shrink-0 p-2.5 rounded-xl border border-primary/10 hover:border-primary/30 hover:bg-primary/5 text-primary transition-all self-center md:self-start opacity-80 hover:opacity-100"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {/* Pagination for Alerts */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-white rounded-3xl mt-4">
                <p className="text-sm font-medium text-slate-500">
                  Showing{" "}
                  <span className="font-bold text-slate-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, staffNotifications.length)}</span>
                  {" "}of <span className="font-bold text-slate-900">{staffNotifications.length}</span> alerts
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="rounded-xl font-bold" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      typeof item === "string" ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-bold">…</span>
                      ) : (
                        <Button key={item} variant={item === page ? "default" : "outline"} size="sm" className={`rounded-xl w-10 font-bold ${item === page ? "shadow-md" : ""}`} onClick={() => setPage(item as number)}>{item}</Button>
                      )
                    )}
                  <Button variant="outline" size="sm" className="rounded-xl font-bold" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em] border-b border-slate-100">
                  <th className="py-6 px-8">Recipient</th>
                  <th className="py-6 px-8">Source Type</th>
                  <th className="py-6 px-8">Identity</th>
                  <th className="py-6 px-8">Date Linked</th>
                  <th className="py-6 px-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedRecipients.map((recipient) => (
                  <tr key={recipient.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          {recipient.user ? <User className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                        </div>
                        <span className="font-black text-slate-900">{recipient.email_display}</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        recipient.user ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                      }`}>
                        {recipient.user ? "Staff User" : "Custom Mail"}
                      </span>
                    </td>
                    <td className="py-6 px-8 font-medium text-slate-500">
                      {recipient.user_name || "External Link"}
                    </td>
                    <td className="py-6 px-8 text-xs font-bold text-slate-400">
                      {new Date(recipient.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-6 px-8 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-10 h-10 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        onClick={() => handleDelete(recipient.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {recipients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                          <Bell className="w-8 h-8" />
                        </div>
                        <p className="text-slate-500 font-bold">No active email notification recipients</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination for Settings */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-white">
              <p className="text-sm font-medium text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, recipients.length)}</span>
                {" "}of <span className="font-bold text-slate-900">{recipients.length}</span> recipients
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="rounded-xl font-bold" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    typeof item === "string" ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-bold">…</span>
                    ) : (
                      <Button key={item} variant={item === page ? "default" : "outline"} size="sm" className={`rounded-xl w-10 font-bold ${item === page ? "shadow-md" : ""}`} onClick={() => setPage(item as number)}>{item}</Button>
                    )
                  )}
                <Button variant="outline" size="sm" className="rounded-xl font-bold" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
