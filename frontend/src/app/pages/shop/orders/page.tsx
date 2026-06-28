import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Package, Star, ChevronDown, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  BackendOrder,
  customerConfirmOrder,
  getOrders,
  isAuthenticated,
  submitOrderReviews,
  type OrderReviewInput,
} from "../../../lib/api";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { toast } from "sonner";
import { cn } from "../../../components/ui/utils";

const STATUS_COLORS: Record<string, string> = {
  delivered: "bg-success/10 text-success border-success",
  delivered_pending: "bg-warning/10 text-warning border-warning",
  shipped: "bg-primary/10 text-primary border-primary",
  paid: "bg-accent/10 text-accent border-accent",
  pending: "bg-warning/10 text-warning border-warning",
  cancelled: "bg-destructive/10 text-destructive border-destructive",
};

const STATUS_LABELS: Record<string, string> = {
  delivered_pending: "To Confirm",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  payment_pending: "Payment Pending",
  payment_processing: "Payment Processing",
  payment_paid: "Payment Paid",
  payment_failed: "Payment Failed",
};

const FILTER_TABS = [
  { id: "all", label: "All Orders" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered_pending", label: "To Confirm" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const getStatusColor = (status: string) => STATUS_COLORS[status] ?? "";
const statusLabel = (status: string) =>
  STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
const paymentStatusLabel = (status: string) => PAYMENT_STATUS_LABELS[status] ?? status;

export function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [reviewOrder, setReviewOrder] = useState<BackendOrder | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, { rating: number; review: string }>>({});
  const [submittingReviews, setSubmittingReviews] = useState(false);
  
  const [filter, setFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }
    const loadOrders = async () => {
      try {
        const data = await getOrders();
        setOrders(data);
        
        // Auto-expand first order if it's recent/pending
        if (data.length > 0) {
          setExpandedOrderId(data[0].id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load orders";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, [navigate]);

  const handleConfirmReceipt = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingOrderId(orderId);
    try {
      const updatedOrder = await customerConfirmOrder(orderId);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));
      toast.success(`Order #${orderId} confirmed as delivered`);
      setReviewOrder(updatedOrder);
      setReviewDrafts(
        Object.fromEntries(
          updatedOrder.items.map((item) => [item.id, { rating: 5, review: "" }])
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to confirm receipt";
      toast.error(message);
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const updateReviewDraft = (itemId: number, patch: Partial<{ rating: number; review: string }>) => {
    setReviewDrafts((current) => {
      const existing = current[itemId] || { rating: 5, review: "" };
      return {
        ...current,
        [itemId]: {
          ...existing,
          ...patch,
        },
      };
    });
  };

  const handleSubmitReviews = async () => {
    if (!reviewOrder) return;

    setSubmittingReviews(true);
    try {
      const payload: OrderReviewInput[] = reviewOrder.items.map((item) => ({
        order_item_id: item.id,
        rating: reviewDrafts[item.id]?.rating ?? 5,
        review: reviewDrafts[item.id]?.review?.trim() || "",
      }));
      await submitOrderReviews(reviewOrder.id, payload);
      toast.success("Your reviews were saved");
      setReviewOrder(null);
      setReviewDrafts({});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save reviews";
      toast.error(message);
    } finally {
      setSubmittingReviews(false);
    }
  };

  const filteredOrders = orders.filter(o => filter === "all" || o.status === filter);

  const toggleExpand = (id: number) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-12 animate-fade-in">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-border/50 p-4 sticky top-0 z-40 shadow-sm flex items-center gap-4 md:hidden">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 text-primary">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-black text-lg text-primary">My Orders</h1>
      </header>

      <div className="max-w-3xl md:max-w-4xl mx-auto px-4 py-4 md:p-6 space-y-4">
        <div className="hidden md:flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black text-primary">Order History</h1>
        </div>

        {/* Categories / Filters */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar">
          <div className="flex gap-2 min-w-max">
            {FILTER_TABS.map((tab) => {
              const count = filter === "all" ? undefined : null; // Optionally add counts
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all border-2",
                    filter === tab.id
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-muted-foreground border-transparent hover:border-border/50"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white border border-border/50 shimmer" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-10 md:p-16 text-center rounded-2xl border-dashed border-2 shadow-none border-border/60 bg-white">
            <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-primary/30" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">No orders found</h3>
            <p className="text-muted-foreground font-medium max-w-sm mx-auto">
              {filter === "all" 
                ? "You haven't placed any orders yet. Start exploring our catalogue!"
                : `You don't have any ${FILTER_TABS.find(t => t.id === filter)?.label.toLowerCase()} orders right now.`}
            </p>
            {filter !== "all" && (
              <Button variant="outline" className="mt-6 rounded-full font-bold" onClick={() => setFilter("all")}>
                View All Orders
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;

              return (
                  <Card 
                    key={order.id} 
                    className={cn(
                      "overflow-hidden transition-all duration-300 rounded-xl border",
                      isExpanded ? "border-primary/20 shadow-sm" : "border-border/40 shadow-none hover:border-primary/10 hover:shadow-sm"
                    )}
                  >
                  {/* Header Summary (Clickable) */}
                  <div 
                    className={cn(
                      "p-4 md:p-5 flex items-center justify-between cursor-pointer transition-colors select-none",
                      isExpanded ? "bg-primary/5" : "bg-white hover:bg-[#fcfdfd]"
                    )}
                    onClick={() => toggleExpand(order.id)}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <p className="font-black text-primary text-lg">Order #{order.id}</p>
                        <Badge variant="outline" className={cn("font-bold px-2.5 py-0.5", getStatusColor(order.status))}>
                          {statusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                        <span>
                          {new Date(order.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="font-bold text-primary">KSh {Number(order.total_amount).toFixed(2)}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Show confirm button in summary if it's pending confirmation and not expanded */}
                      {order.status === "delivered_pending" && !isExpanded && (
                        <Button
                          size="sm"
                          className="hidden md:flex rounded-full font-bold bg-success hover:bg-success/90 text-white shadow-sm"
                          onClick={(e) => handleConfirmReceipt(order.id, e)}
                          disabled={confirmingOrderId === order.id}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          {confirmingOrderId === order.id ? "Confirming..." : "Confirm Receipt"}
                        </Button>
                      )}
                      
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        isExpanded ? "bg-white text-primary shadow-sm" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      )}>
                        <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded && "rotate-180")} />
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <div className="px-4 md:px-5 pb-4 bg-white border-t border-border/50">
                          {/* Items List */}
                          <div className="py-3 space-y-3">
                            <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Order Items</h4>
                            {order.items.map((item, index) => (
                              <div key={index} className="flex gap-3 p-3 rounded-xl bg-white border border-border/40">
                                <Link to={`/product/${item.product}`} className="shrink-0 block">
                                  {item.product_image_url ? (
                                    <img
                                      src={item.product_image_url}
                                      alt={item.product_name}
                                      className="w-16 h-16 object-cover rounded-xl shadow-sm border border-border/50"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground border border-border/50">
                                      #{item.product}
                                    </div>
                                  )}
                                </Link>
                                <div className="flex-1 flex flex-col justify-center">
                                  <Link to={`/product/${item.product}`}>
                                    <p className="font-bold text-primary line-clamp-1 hover:text-primary/70 transition-colors">
                                      {item.product_name}
                                    </p>
                                  </Link>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-sm font-medium text-muted-foreground">Qty: {item.quantity}</p>
                                    <p className="text-sm font-black text-primary">KSh {Number(item.unit_price).toFixed(2)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 border-t border-border/50">
                            {/* Payment Info */}
                            <div>
                              <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Payment Details</h4>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Method: <span className="text-primary font-bold">{order.payment_method}</span></p>
                                <p className="text-sm font-medium text-muted-foreground">
                                  Status: <span className="text-primary font-bold">{paymentStatusLabel(order.payment_status)}</span>
                                </p>
                                {order.payment_reference && (
                                  <p className="text-sm font-medium text-muted-foreground">Ref: <span className="text-primary font-bold">{order.payment_reference}</span></p>
                                )}
                                {order.payment_status === "payment_failed" && order.payment_failure_reason && (
                                  <p className="text-sm text-destructive font-medium mt-1 bg-destructive/10 px-2 py-1 rounded-md inline-block">
                                    {order.payment_failure_reason}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Delivery Address */}
                            <div>
                              <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Delivery Address</h4>
                              <p className="text-sm font-medium text-primary leading-relaxed">
                                {order.shipping_address}<br />
                                {order.shipping_city}, {order.shipping_postal_code}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {order.status === "delivered_pending" && (
                            <div className="pt-4 border-t border-border/50 mt-2 space-y-3">
                              <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-3">
                                <p className="text-sm font-bold text-warning mb-0.5">Inspect your order before confirming</p>
                                <p className="text-xs text-warning/80 leading-relaxed">
                                  Please check all items now &mdash; especially fresh produce. Once confirmed,
                                  complaints for perishables must be raised <strong>within 1 hour</strong>.
                                  Non-perishables have a 24-hour window.
                                </p>
                              </div>
                              <Button
                                className="w-full md:w-auto h-12 rounded-xl font-bold bg-success hover:bg-success/90 text-white shadow-lg shadow-success/20 transition-all"
                                onClick={(e) => handleConfirmReceipt(order.id, e)}
                                disabled={confirmingOrderId === order.id}
                              >
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                {confirmingOrderId === order.id ? "Confirming..." : "Everything looks good — confirm receipt"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={Boolean(reviewOrder)} onOpenChange={(open) => !open && !submittingReviews && setReviewOrder(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-border max-h-[90vh] flex flex-col rounded-[2rem]">
          <DialogHeader className="px-6 pt-8 pb-6 border-b border-border/50 bg-secondary/40 shrink-0">
            <DialogTitle className="text-2xl font-black text-primary">Rate your products</DialogTitle>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Your delivery is confirmed. Tell us what you think about each product to help other students!
            </p>
          </DialogHeader>

          <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-[#fbfcfd]">
            {reviewOrder?.items.map((item) => (
              <Card key={item.id} className="p-5 border-border/50 shadow-sm rounded-2xl bg-white">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    {item.product_image_url ? (
                      <img src={item.product_image_url} alt={item.product_name} className="h-20 w-20 rounded-xl object-cover border border-border/50 shadow-sm" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-secondary text-xs font-bold text-muted-foreground border border-border/50">
                        Product
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="font-bold text-primary">{item.product_name}</p>
                      <p className="text-sm font-medium text-muted-foreground">Qty: {item.quantity}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rating</Label>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, index) => {
                          const active = index < (reviewDrafts[item.id]?.rating ?? 5);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => updateReviewDraft(item.id, { rating: index + 1 })}
                              className="rounded-full p-1.5 transition-transform hover:scale-110"
                            >
                              <Star className={cn("h-6 w-6 transition-colors", active ? "fill-[#f4c430] text-[#f4c430]" : "text-border fill-transparent")} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`review-${item.id}`} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Review</Label>
                      <Textarea
                        id={`review-${item.id}`}
                        rows={3}
                        value={reviewDrafts[item.id]?.review ?? ""}
                        onChange={(e) => updateReviewDraft(item.id, { review: e.target.value })}
                        placeholder="Share what you liked or what could be better"
                        className="resize-none rounded-xl border-border/50 focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex gap-3 pt-4 border-t border-border/50">
              <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold border-2" onClick={() => setReviewOrder(null)} disabled={submittingReviews}>
                Skip for now
              </Button>
              <Button className="flex-1 rounded-xl h-12 font-bold" onClick={handleSubmitReviews} disabled={submittingReviews}>
                {submittingReviews ? "Saving..." : "Submit Reviews"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
