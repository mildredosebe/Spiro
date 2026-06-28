import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, TrendingUp, ShoppingBag, CreditCard, Package,
  BarChart3, Truck, Zap, Receipt, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { useNavigate, Link } from "react-router";
import { getOrders, isAuthenticated, type BackendOrder } from "../../../lib/api";

// ─── helpers ────────────────────────────────────────────────────────────────

const toKsh = (n: number) =>
  `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 && current === 0) return <span className="text-xs text-muted-foreground font-semibold">No data</span>;
  if (prev === 0) return <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />New</span>;
  const change = ((current - prev) / prev) * 100;
  const up = change >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`text-xs font-bold flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-red-500"}`}>
      <Icon className="w-3 h-3" />{Math.abs(change).toFixed(1)}%
    </span>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export function Spending() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/login", { replace: true }); return; }
    getOrders()
      .then(setOrders)
      .catch(() => navigate("/login", { replace: true }))
      .finally(() => setLoading(false));
  }, [navigate]);

  const paidOrders = useMemo(
    () => orders.filter((o) => o.payment_status === "payment_paid"),
    [orders]
  );

  // Month keys
  const now = new Date();
  const currentKey = now.toISOString().slice(0, 7);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = prevDate.toISOString().slice(0, 7);
  const currentLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  // Aggregate helper
  const aggregate = (list: BackendOrder[]) =>
    list.reduce(
      (acc, o) => {
        acc.spent += Number(o.total_amount);
        acc.subtotal += Number(o.subtotal);
        acc.deliveryFees += Number(o.delivery_fee);
        acc.serviceFees += Number(o.service_fee);
        acc.surgeFees += Number(o.surge_fee);
        acc.orders += 1;
        o.items.forEach((item) => {
          const t = Number(item.unit_price) * item.quantity;
          acc.items += item.quantity;
          if (item.product_category_type === "food") acc.groceries += t;
          else acc.nonFood += t;
        });
        return acc;
      },
      { spent: 0, subtotal: 0, deliveryFees: 0, serviceFees: 0, surgeFees: 0, orders: 0, items: 0, groceries: 0, nonFood: 0 }
    );

  const lifetime = useMemo(() => aggregate(paidOrders), [paidOrders]);
  const thisMonth = useMemo(() => aggregate(paidOrders.filter((o) => o.created_at.slice(0, 7) === currentKey)), [paidOrders, currentKey]);
  const lastMonth = useMemo(() => aggregate(paidOrders.filter((o) => o.created_at.slice(0, 7) === prevKey)), [paidOrders, prevKey]);

  // 6-month bar chart data
  const monthlyBreakdown = useMemo(() => {
    const months: Record<string, { key: string; label: string; spent: number; orders: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      months[key] = { key, label: d.toLocaleString("default", { month: "short" }), spent: 0, orders: 0 };
    }
    paidOrders.forEach((o) => {
      const key = o.created_at.slice(0, 7);
      if (months[key]) { months[key].spent += Number(o.total_amount); months[key].orders += 1; }
    });
    return Object.values(months);
  }, [paidOrders]);
  const maxSpent = Math.max(...monthlyBreakdown.map((m) => m.spent), 1);

  // Top products by quantity ordered
  const topProducts = useMemo(() => {
    const map: Record<number, { name: string; image: string; qty: number; total: number; category?: string }> = {};
    paidOrders.forEach((o) =>
      o.items.forEach((item) => {
        if (!map[item.product]) map[item.product] = { name: item.product_name, image: item.product_image_url, qty: 0, total: 0, category: item.product_category_name };
        map[item.product].qty += item.quantity;
        map[item.product].total += Number(item.unit_price) * item.quantity;
      })
    );
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [paidOrders]);

  // Category breakdown
  const categoryMap = useMemo(() => {
    const map: Record<string, number> = {};
    paidOrders.forEach((o) =>
      o.items.forEach((item) => {
        const cat = item.product_category_name || (item.product_category_type === "food" ? "Groceries" : "Other");
        map[cat] = (map[cat] || 0) + Number(item.unit_price) * item.quantity;
      })
    );
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [paidOrders]);
  const catTotal = categoryMap.reduce((s, [, v]) => s + v, 0);

  const CAT_COLORS = ["#0b2e59", "#f4c430", "#10b981", "#6366f1", "#f97316", "#ec4899"];

  // Recent paid orders
  const recentOrders = paidOrders.slice(0, 5);

  // ── loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fb] animate-pulse">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-[2rem] shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const avgOrder = lifetime.orders > 0 ? lifetime.spent / lifetime.orders : 0;
  const totalFees = lifetime.deliveryFees + lifetime.serviceFees + lifetime.surgeFees;

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-12 animate-fade-in">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center gap-3 md:hidden shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 text-primary">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-black text-lg text-primary">Spending</h1>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 md:p-6 space-y-4">

        {/* Desktop heading */}
        <div className="hidden md:block mb-2">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-black text-primary tracking-tight">Spending Insights</h1>
          <p className="text-slate-500 font-medium mt-1">A breakdown of everything you've spent on Kitas.</p>
        </div>

        {/* ── Lifetime stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Spent", value: toKsh(lifetime.spent), icon: TrendingUp, color: "text-primary", bg: "bg-primary/8" },
            { label: "Orders Placed", value: lifetime.orders, icon: Package, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Items Bought", value: lifetime.items, icon: ShoppingBag, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Avg Order", value: toKsh(avgOrder), icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border/50 p-3 flex flex-col gap-2">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="text-xl font-black text-primary mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── This month vs last month ── */}
        <div className="bg-white rounded-2xl border border-border/50 p-4 md:p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-primary">This Month</h2>
              <p className="text-sm text-muted-foreground font-medium">{currentLabel}</p>
            </div>
            <span className="text-xs font-bold bg-primary/8 text-primary px-3 py-1.5 rounded-full">vs last month</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Spent", cur: thisMonth.spent, prev: lastMonth.spent, fmt: toKsh },
              { label: "Orders", cur: thisMonth.orders, prev: lastMonth.orders, fmt: (v: number) => String(v) },
              { label: "Groceries", cur: thisMonth.groceries, prev: lastMonth.groceries, fmt: toKsh },
              { label: "Non-food", cur: thisMonth.nonFood, prev: lastMonth.nonFood, fmt: toKsh },
            ].map(({ label, cur, prev, fmt }) => (
              <div key={label} className="bg-secondary/50 rounded-xl border border-border/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
                <p className="text-xl font-black text-primary">{fmt(cur)}</p>
                <div className="mt-1.5">
                  <DeltaBadge current={cur} prev={prev} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 6-month bar chart ── */}
        <div className="bg-white rounded-2xl border border-border/50 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black text-primary">6-Month Trend</h2>
          </div>
          {(() => {
            const BAR_MAX_PX = 120;
            return (
              <div>
                {/* Bar area */}
                <div className="flex items-end gap-2 md:gap-3" style={{ height: `${BAR_MAX_PX}px` }}>
                  {monthlyBreakdown.map((month) => {
                    const barPx = month.spent > 0
                      ? Math.max((month.spent / maxSpent) * BAR_MAX_PX, 6)
                      : 0;
                    const isCurrent = month.key === currentKey;
                    return (
                      <div key={month.key} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        {/* Hover tooltip */}
                        {month.spent > 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {toKsh(month.spent)}
                          </span>
                        )}
                        {/* Bar */}
                        <div
                          className="w-full rounded-t-xl transition-all duration-700"
                          style={{
                            height: `${barPx}px`,
                            backgroundColor: isCurrent ? "#0b2e59" : "#0b2e5940",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* X-axis baseline */}
                <div className="border-t border-border/40 mt-0" />
                {/* Labels row */}
                <div className="flex gap-2 md:gap-3 mt-2">
                  {monthlyBreakdown.map((month) => {
                    const isCurrent = month.key === currentKey;
                    return (
                      <div key={month.key} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className={`text-[10px] font-bold ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                          {month.label}
                        </span>
                        {month.orders > 0 ? (
                          <span className="text-[9px] text-muted-foreground font-medium">
                            {month.orders}×
                          </span>
                        ) : (
                          <span className="text-[9px] text-border">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ── Category breakdown ── */}
          <div className="bg-white rounded-2xl border border-border/50 p-4 md:p-5">
            <h2 className="text-lg font-black text-primary mb-4">By Category</h2>
            {categoryMap.length === 0 ? (
              <p className="text-sm text-muted-foreground font-medium py-4">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryMap.map(([cat, amount], i) => {
                  const share = pct(amount, catTotal);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-primary">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">{share}%</span>
                          <span className="text-sm font-black text-primary">{toKsh(amount)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${share}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Fee breakdown ── */}
          <div className="bg-white rounded-2xl border border-border/50 p-4 md:p-5">
            <h2 className="text-lg font-black text-primary mb-4">Fee Breakdown</h2>
            <div className="space-y-3">
              {[
                { label: "Product Cost", value: lifetime.subtotal, icon: ShoppingBag, color: "#0b2e59" },
                { label: "Delivery Fees", value: lifetime.deliveryFees, icon: Truck, color: "#6366f1" },
                { label: "Service Fees", value: lifetime.serviceFees, icon: Receipt, color: "#f97316" },
                { label: "Surge Fees", value: lifetime.surgeFees, icon: Zap, color: "#ec4899" },
              ].map(({ label, value, icon: Icon, color }) => {
                const share = pct(value, lifetime.spent);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                        <span className="text-sm font-bold text-primary">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">{share}%</span>
                        <span className="text-sm font-black text-primary">{toKsh(value)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground">Total in fees</span>
                <span className="text-sm font-black text-primary">{toKsh(totalFees)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Top products ── */}
        {topProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-border/50 p-4 md:p-5">
            <h2 className="text-lg font-black text-primary mb-4">Most Ordered Items</h2>
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs font-black text-muted-foreground w-5 text-center">{i + 1}</span>
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-11 h-11 rounded-xl object-cover border border-border/50 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary truncate">{p.name}</p>
                    {p.category && <p className="text-xs text-muted-foreground font-medium">{p.category}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-primary">{toKsh(p.total)}</p>
                    <p className="text-xs text-muted-foreground font-semibold">{p.qty}× ordered</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent paid orders ── */}
        {recentOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-border/50 p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-primary">Recent Orders</h2>
              <Link to="/orders" className="text-xs font-bold text-primary/60 hover:text-primary transition-colors">View all →</Link>
            </div>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-2xl border border-border/40 hover:border-primary/20 hover:bg-secondary/30 transition-all group"
                >
                  <div>
                    <p className="text-sm font-bold text-primary">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}{order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-primary">{toKsh(Number(order.total_amount))}</span>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {paidOrders.length === 0 && (
          <div className="bg-white rounded-2xl border border-border/50 p-10 md:p-16 text-center">
            <div className="w-16 h-16 bg-primary/8 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-xl font-black text-primary mb-2">No spending data yet</h3>
            <p className="text-sm text-muted-foreground font-medium mb-6">Place your first order to start tracking your spending insights.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-full text-sm hover:bg-primary/90 transition-colors">
              <ShoppingBag className="w-4 h-4" /> Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
