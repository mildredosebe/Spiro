import { useEffect, useMemo, useState } from "react";
import { Search, Mail, Phone, Shield, Ban, Users, UserCheck, UserMinus, ShieldAlert, Truck, ChevronDown, Check, Loader2, MoreHorizontal } from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../../../components/ui/dropdown-menu";
import { toast } from "sonner";
import { getAdminUsers, updateAdminUserStatus, type AdminUser } from "../../../lib/api";

const SEEDED_ADMIN_EMAIL = "admin@kitas.co.ke";

export function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "delivery" | "customer">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await getAdminUsers();
        setUsers(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load users";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Filter Logic
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // 1. Text Search query matching
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone && user.phone.includes(query));

      // 2. Role Filter matching
      let matchesRole = true;
      if (roleFilter === "admin") matchesRole = user.is_staff;
      else if (roleFilter === "delivery") matchesRole = user.is_delivery_agent;
      else if (roleFilter === "customer") matchesRole = !user.is_staff && !user.is_delivery_agent;

      // 3. Status Filter matching
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = user.is_active;
      else if (statusFilter === "blocked") matchesStatus = !user.is_active;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Statistics Calculation
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.is_active).length,
      blocked: users.filter((u) => !u.is_active).length,
      admins: users.filter((u) => u.is_staff).length,
      delivery: users.filter((u) => u.is_delivery_agent).length,
    };
  }, [users]);

  // Status and Role Update handler
  const handleUpdateStatus = async (
    userId: string,
    payload: Partial<{ is_active: boolean; is_staff: boolean; is_delivery_agent: boolean }>,
    successMessage: string
  ) => {
    setUpdatingUserId(userId);
    try {
      const updatedUser = await updateAdminUserStatus(userId, payload);
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
      toast.success(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user configuration";
      toast.error(message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const isSeededAdmin = (user: AdminUser) => user.email?.toLowerCase() === SEEDED_ADMIN_EMAIL;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">User Directory</h1>
          <p className="text-slate-500 font-medium">Monitor active accounts, assign delivery privileges, and manage administrator access.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Accounts", value: stats.total, color: "text-slate-900", icon: Users, bg: "bg-slate-100/80 text-slate-600" },
          { label: "Administrators", value: stats.admins, color: "text-primary", icon: Shield, bg: "bg-primary/8 text-primary" },
          { label: "Delivery Agents", value: stats.delivery, color: "text-blue-600", icon: Truck, bg: "bg-blue-50 text-blue-600" },
          { label: "Suspended Accounts", value: stats.blocked, color: "text-rose-600", icon: Ban, bg: "bg-rose-50 text-rose-600 border border-rose-100" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">{s.label}</p>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.bg}`}>
                <Icon className="w-5.5 h-5.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-sm space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-4">
        {/* Search */}
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
          <Input
            placeholder="Search by name, email, phone or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 pr-4 bg-slate-50/50 border-slate-200 focus-visible:bg-white rounded-2xl font-medium focus-visible:ring-4 focus-visible:ring-primary/5 transition-all"
          />
        </div>

        {/* Filters Select */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-48">
            <Select
              value={roleFilter}
              onValueChange={(val: any) => setRoleFilter(val)}
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold text-slate-700">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                <SelectItem value="all" className="rounded-xl font-bold">All Roles</SelectItem>
                <SelectItem value="admin" className="rounded-xl font-bold">Administrators</SelectItem>
                <SelectItem value="delivery" className="rounded-xl font-bold">Delivery Agents</SelectItem>
                <SelectItem value="customer" className="rounded-xl font-bold">Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onValueChange={(val: any) => setStatusFilter(val)}
            >
              <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold text-slate-700">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                <SelectItem value="all" className="rounded-xl font-bold">All Statuses</SelectItem>
                <SelectItem value="active" className="rounded-xl font-bold">Active Only</SelectItem>
                <SelectItem value="blocked" className="rounded-xl font-bold">Blocked Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-slate-500 font-semibold animate-pulse">Loading community directory...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 p-8">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-black text-lg">No matching users</p>
          <p className="text-slate-400 text-sm font-medium mt-1">We couldn't find any users matching your query or selected filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em] border-b border-slate-100">
                  <th className="py-6 px-8">User Profile</th>
                  <th className="py-6 px-8">Contact info</th>
                  <th className="py-6 px-8">Roles & Status</th>
                  <th className="py-6 px-8">Orders & Spend</th>
                  <th className="py-6 px-8">Joined Date</th>
                  <th className="py-6 px-8 text-right">Quick Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((user) => {
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
                  const displayInitial = (user.first_name || user.username || user.email).charAt(0).toUpperCase();

                  return (
                    <tr key={user.id} className="group hover:bg-slate-50/40 transition-colors">
                      {/* Profile Column */}
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 rounded-2xl shadow-inner border border-slate-100 shrink-0">
                            <AvatarFallback className="bg-primary text-white font-black text-base">
                              {displayInitial}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-[15px] text-slate-900 leading-tight truncate">
                              {fullName}
                            </h3>
                            <p className="text-xs text-slate-400 font-semibold mt-1">@{user.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Column */}
                      <td className="py-5 px-8">
                        <div className="flex flex-col gap-1 text-[13px] font-medium text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={`mailto:${user.email}`} className="hover:text-primary transition-colors truncate max-w-[200px]" title={user.email}>
                              {user.email}
                            </a>
                          </div>
                          {user.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <a href={`tel:${user.phone}`} className="hover:text-primary transition-colors">
                                {user.phone}
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400/70 font-semibold italic">No phone linked</span>
                          )}
                        </div>
                      </td>

                      {/* Roles & Status Column */}
                      <td className="py-5 px-8">
                        <div className="flex flex-wrap gap-1.5">
                          {/* Active / Blocked */}
                          <span className={`px-2 py-0.5.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            user.is_active 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" 
                              : "bg-rose-50 text-rose-600 border border-rose-100/50"
                          }`}>
                            {user.is_active ? "Active" : "Suspended"}
                          </span>

                          {/* Admin Role */}
                          {user.is_staff && (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-primary text-white flex items-center gap-1 shadow-sm">
                              <Shield className="w-2.5 h-2.5" />
                              <span>Admin</span>
                            </span>
                          )}

                          {/* Delivery Agent Role */}
                          {user.is_delivery_agent && (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-500 text-white flex items-center gap-1 shadow-sm">
                              <Truck className="w-2.5 h-2.5" />
                              <span>Delivery</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Spend Column */}
                      <td className="py-5 px-8">
                        <div className="text-slate-800 text-[13px] font-bold">
                          <span className="font-extrabold text-slate-900">{user.total_orders}</span> orders
                          <p className="text-xs text-slate-400 font-semibold mt-1">KSh {Number(user.total_spent).toLocaleString("en-US", { maximumFractionDigits: 0 })} spent</p>
                        </div>
                      </td>

                      {/* Joined Date Column */}
                      <td className="py-5 px-8 text-xs font-bold text-slate-400">
                        {new Date(user.date_joined).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </td>

                      {/* Quick Operations Column */}
                      <td className="py-5 px-8 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl border-slate-100">
                            <DropdownMenuLabel className="text-xs font-black text-slate-400 uppercase tracking-widest px-3 py-2">Manage Role</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-50" />
                            <DropdownMenuItem 
                              className="px-3 py-2.5 cursor-pointer text-sm font-bold text-slate-700 focus:bg-slate-50 focus:text-primary rounded-xl transition-colors"
                              disabled={updatingUserId === user.id || (user.is_staff && isSeededAdmin(user))}
                              onClick={() => handleUpdateStatus(
                                user.id,
                                { is_staff: !user.is_staff },
                                user.is_staff ? "Admin privileges revoked" : "Admin privileges granted"
                              )}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              {user.is_staff ? "Revoke Admin" : "Make Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="px-3 py-2.5 cursor-pointer text-sm font-bold text-slate-700 focus:bg-slate-50 focus:text-blue-600 rounded-xl transition-colors"
                              disabled={updatingUserId === user.id}
                              onClick={() => handleUpdateStatus(
                                user.id,
                                { is_delivery_agent: !user.is_delivery_agent },
                                user.is_delivery_agent ? "Delivery role revoked" : "Delivery role granted"
                              )}
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              {user.is_delivery_agent ? "Revoke Agent" : "Make Agent"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-50" />
                            <DropdownMenuItem 
                              className={`px-3 py-2.5 cursor-pointer text-sm font-bold rounded-xl transition-colors ${user.is_active ? "text-rose-600 focus:bg-rose-50 focus:text-rose-700" : "text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700"}`}
                              disabled={updatingUserId === user.id}
                              onClick={() => handleUpdateStatus(
                                user.id,
                                { is_active: !user.is_active },
                                user.is_active ? `${fullName} blocked successfully` : `${fullName} unblocked successfully`
                              )}
                            >
                              {user.is_active ? (
                                <><Ban className="w-4 h-4 mr-2" /> Block Account</>
                              ) : (
                                <><UserCheck className="w-4 h-4 mr-2" /> Activate Account</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-white">
              <p className="text-sm font-medium text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredUsers.length)}</span>
                {" "}of <span className="font-bold text-slate-900">{filteredUsers.length}</span> users
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
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
                      <Button
                        key={item}
                        variant={item === page ? "default" : "outline"}
                        size="sm"
                        className={`rounded-xl w-10 font-bold ${
                          item === page ? "shadow-md" : ""
                        }`}
                        onClick={() => setPage(item as number)}
                      >
                        {item}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
