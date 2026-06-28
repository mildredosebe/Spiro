import { useEffect, useMemo, useState } from "react";
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, RefreshCw } from "lucide-react";
import { Card } from "../../../components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { AdminDashboardAnalytics, getAdminDashboardAnalytics } from "../../../lib/api";

const statusLabel = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AdminDashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    try {
      const data = await getAdminDashboardAnalytics();
      setAnalytics(data);
      setLastUpdatedAt(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load analytics";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const intervalId = window.setInterval(load, 10000);
    const handleFocus = load;
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const revenueData = useMemo(() => {
    if (!analytics) return [];
    return analytics.recent_orders
      .slice()
      .reverse()
      .map((order, index) => ({
        name: `#${index + 1}`,
        revenue: Number(order.total_amount),
      }));
  }, [analytics]);

  const ordersByStatus = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.status_breakdown).map(([status, count]) => ({
      name: statusLabel(status),
      orders: count,
    }));
  }, [analytics]);

  const statsCards = [
    {
      title: "Total Revenue",
      value: `KSh ${Number(analytics?.totals.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      gradient: "from-emerald-500/10 to-emerald-500/5",
      iconBg: "bg-emerald-500",
      textColor: "text-emerald-600",
    },
    {
      title: "Orders Received",
      value: `${analytics?.totals.orders ?? 0}`,
      icon: ShoppingCart,
      gradient: "from-blue-500/10 to-blue-500/5",
      iconBg: "bg-blue-500",
      textColor: "text-blue-600",
    },
    {
      title: "Active Users",
      value: `${analytics?.totals.users ?? 0}`,
      icon: Users,
      gradient: "from-indigo-500/10 to-indigo-500/5",
      iconBg: "bg-indigo-500",
      textColor: "text-indigo-600",
    },
    {
      title: "Catalog Products",
      value: `${analytics?.totals.products ?? 0}`,
      icon: Package,
      gradient: "from-amber-500/10 to-amber-500/5",
      iconBg: "bg-amber-500",
      textColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 font-medium">Real-time performance analytics for your store.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-4 py-2 text-xs font-bold text-slate-500">
            Updated: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : "Never"}
          </div>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="rounded-xl font-bold hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && !analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : !analytics ? (
        <Card className="p-12 text-center border-dashed border-2">
          <p className="text-slate-500 font-bold text-lg mb-4">Could not load dashboard data.</p>
          <Button onClick={load} className="rounded-2xl px-8">Try Again</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={stat.title} 
                  className={`relative group overflow-hidden bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} -mr-16 -mt-16 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                  
                  <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 ${stat.iconBg} rounded-2xl flex items-center justify-center shadow-lg shadow-black/5`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Live
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.title}</p>
                      <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Revenue Flow</h2>
                  <p className="text-sm text-slate-500 font-medium">Performance over recent orders</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0b2e59" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#0b2e59" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "16px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        padding: "12px 16px"
                      }}
                      itemStyle={{ fontWeight: "bold", color: "#0b2e59" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#0b2e59" 
                      strokeWidth={4} 
                      dot={{ fill: "#0b2e59", strokeWidth: 2, r: 4, stroke: "#fff" }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Order Distribution</h2>
                  <p className="text-sm text-slate-500 font-medium">Status breakdown metrics</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersByStatus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "none",
                        borderRadius: "16px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        padding: "12px 16px"
                      }}
                    />
                    <Bar dataKey="orders" fill="#0b2e59" radius={[12, 12, 4, 4]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900">Recent Activity</h2>
                <button className="text-xs font-bold text-primary hover:underline">View All Orders</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-50">
                      <th className="text-left py-5 px-8 font-black">ID</th>
                      <th className="text-left py-5 px-8 font-black">Customer</th>
                      <th className="text-left py-5 px-8 font-black">Status</th>
                      <th className="text-right py-5 px-8 font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(analytics?.recent_orders ?? []).map((order) => (
                      <tr key={order.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="py-5 px-8">
                          <span className="font-mono text-xs font-bold text-slate-400">#{order.id}</span>
                        </td>
                        <td className="py-5 px-8">
                          <p className="text-sm font-bold text-slate-700">{order.user__email}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-5 px-8">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                            {statusLabel(order.status)}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <span className="text-sm font-black text-slate-900">KSh {Number(order.total_amount).toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900">New Members</h2>
                <button className="text-xs font-bold text-primary hover:underline">Manage Users</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-50">
                      <th className="text-left py-5 px-8 font-black">User</th>
                      <th className="text-left py-5 px-8 font-black">Status</th>
                      <th className="text-right py-5 px-8 font-black">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(analytics?.recent_users ?? []).map((user) => (
                      <tr key={user.id} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700">
                                {[user.first_name, user.last_name].filter(Boolean).join(" ") || "Unnamed"}
                              </p>
                              <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              user.is_active
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-rose-100 text-rose-600"
                            }`}
                          >
                            {user.is_active ? "Verified" : "Blocked"}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <span className="text-xs font-bold text-slate-500">
                            {new Date(user.date_joined).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
