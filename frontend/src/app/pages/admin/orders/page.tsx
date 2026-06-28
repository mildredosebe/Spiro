import { useEffect, useMemo, useState } from "react";
import { Search, Eye, RefreshCw, CheckCircle, MapPin, CreditCard, Package } from "lucide-react";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { toast } from "sonner";
import { confirmOrderDelivery, getAdminOrders, updateOrderStatus, type BackendOrder } from "../../../lib/api";

const allowedNextStatuses: Record<string, string[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["cancelled"],
  delivered_pending: [],
  delivered: [],
  cancelled: [],
};

const statusLabel = (status: string) => {
  if (status === "delivered_pending") return "Delivered Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export function AdminOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientSignature, setRecipientSignature] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadOrders = async () => {
    try {
      const data = await getAdminOrders();
      setOrders(
        data.map((order) => ({
          ...order,
          status: order.status || "pending",
          items: Array.isArray(order.items) ? order.items : [],
        }))
      );
      setLastUpdatedAt(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load orders";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const intervalId = window.setInterval(loadOrders, 10000);
    const handleFocus = loadOrders;
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const orderIdText = String(order.id);
        const matchesSearch = orderIdText.includes(searchQuery.trim()) || 
                             order.shipping_full_name.toLowerCase().includes(searchQuery.toLowerCase());
        const currentStatus = order.status || "pending";
        const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [orders, searchQuery, statusFilter]
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case "delivered":
        return { label: "Delivered", bg: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" };
      case "delivered_pending":
        return { label: "Pending Confirmation", bg: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-500" };
      case "shipped":
        return { label: "In Transit", bg: "bg-blue-50 text-blue-600 border-blue-100", dot: "bg-blue-500" };
      case "paid":
        return { label: "Ready to Ship", bg: "bg-indigo-50 text-indigo-600 border-indigo-100", dot: "bg-indigo-500" };
      case "pending":
        return { label: "Unpaid", bg: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-400" };
      case "cancelled":
        return { label: "Cancelled", bg: "bg-rose-50 text-rose-600 border-rose-100", dot: "bg-rose-500" };
      default:
        return { label: statusLabel(status || ""), bg: "bg-slate-50", dot: "bg-slate-400" };
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const updatedOrder = await updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }
      toast.success(`Order #${orderId} updated to ${newStatus}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update order status";
      toast.error(message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getSelectableStatuses = (status?: string) => {
    const current = status || "pending";
    const next = allowedNextStatuses[current] || [];
    return Array.from(new Set([current, ...next]));
  };

  const openViewDialog = (order: BackendOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const closeViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedOrder(null);
  };

  const openConfirmDeliveryForm = (order: BackendOrder) => {
    setSelectedOrder(order);
    setRecipientName(order.shipping_full_name || "");
    setRecipientSignature("");
    setDeliveryNotes("");
    setIsConfirmDialogOpen(true);
  };

  const closeConfirmDeliveryForm = () => {
    if (updatingOrderId) return;
    setIsConfirmDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder || !recipientName.trim() || !recipientSignature.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUpdatingOrderId(selectedOrder.id);
    try {
      const updatedOrder = await confirmOrderDelivery(selectedOrder.id, {
        recipient_name: recipientName.trim(),
        recipient_signature: recipientSignature.trim(),
        delivery_notes: deliveryNotes.trim(),
      });
      setOrders((prev) => prev.map((item) => (item.id === selectedOrder.id ? updatedOrder : item)));
      toast.success(`Delivery proof submitted for Order #${selectedOrder.id}`);
      closeConfirmDeliveryForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to confirm delivery";
      toast.error(message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Orders</h1>
          <p className="text-slate-500 font-medium">Manage transactions and logistics.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            {lastUpdatedAt ? `Synced ${lastUpdatedAt.toLocaleTimeString()}` : "Syncing..."}
          </div>
          <Button variant="ghost" size="sm" onClick={loadOrders} disabled={loading} className="rounded-xl font-bold hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "New Orders", value: orders.filter(o => o.status === "paid").length, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "In Transit", value: orders.filter(o => o.status === "shipped").length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Delivered", value: orders.filter(o => o.status === "delivered").length, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Volume", value: `KSh ${orders.filter(o => o.status !== "cancelled").reduce((acc, o) => acc + Number(o.total_amount), 0).toLocaleString()}`, color: "text-slate-900", bg: "bg-slate-100" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by Order ID or Customer Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-16 pl-14 pr-8 bg-white border-slate-200/60 rounded-[1.5rem] shadow-sm text-lg font-medium focus:ring-4 focus:ring-primary/5 transition-all"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-64 h-16 rounded-[1.5rem] bg-white border-slate-200/60 shadow-sm px-6 font-bold text-slate-600">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-[1.5rem]">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered_pending">Delivered Pending</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em] border-b border-slate-100">
                <th className="py-6 px-8">Order ID</th>
                <th className="py-6 px-8">Customer Details</th>
                <th className="py-6 px-8">Summary</th>
                <th className="py-6 px-8">Lifecycle</th>
                <th className="py-6 px-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedOrders.map((order) => {
                const status = getStatusConfig(order.status);
                return (
                  <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 px-8">
                      <div className="flex flex-col items-start gap-2">
                        <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg tracking-wider">#{order.id}</span>
                        {order.is_scheduled ? (
                          <div className="flex flex-col gap-0.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 text-indigo-700">
                            <span className="text-[9px] font-black uppercase tracking-wider">Scheduled</span>
                            <span className="text-[10px] font-bold">{order.scheduled_delivery_date}</span>
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 text-amber-700">
                            <span className="text-[9px] font-black uppercase tracking-wider">Immediate</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div>
                        <p className="font-black text-slate-900 leading-tight mb-1">{order.shipping_full_name}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{order.shipping_phone}</p>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-black text-slate-900">KSh {Number(order.total_amount).toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{order.items.length} Product(s)</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${status.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dot} ${order.status === "shipped" ? "animate-pulse" : ""}`} />
                        {status.label}
                      </div>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === "shipped" && (
                          <Button
                            size="sm"
                            className="rounded-xl font-bold bg-primary shadow-lg shadow-primary/10 h-10 px-4"
                            onClick={() => openConfirmDeliveryForm(order)}
                          >
                            Mark Delivered
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => openViewDialog(order)}
                          className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-900">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredOrders.length)}</span>
              {" "}of <span className="font-bold text-slate-900">{filteredOrders.length}</span> orders
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => (open ? null : closeViewDialog())}>
        <DialogContent className="max-w-[95vw] w-full lg:max-w-6xl p-0 rounded-[2.5rem] border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <div className="flex flex-col h-full">
              <div className="bg-primary p-8 text-white sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-black">Order #{selectedOrder.id}</h2>
                      <div className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                        {statusLabel(selectedOrder.status || "")}
                      </div>
                    </div>
                    <p className="text-white/70 text-sm font-medium">Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" onClick={closeViewDialog} className="text-white hover:bg-white/10 rounded-xl h-12 w-12 p-0">
                    <CheckCircle className="w-6 h-6 rotate-45" />
                  </Button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</p>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <p className="font-black text-slate-900">{selectedOrder.shipping_full_name}</p>
                         <p className="text-sm text-slate-500 font-medium">{selectedOrder.user_email || "No Email Provided"}</p>
                         <p className="text-sm text-slate-500 font-medium">{selectedOrder.shipping_phone}</p>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shipping Address</p>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            {selectedOrder.shipping_address}<br/>
                            {selectedOrder.shipping_city}, {selectedOrder.shipping_postal_code}
                         </p>
                         {selectedOrder.is_scheduled && (
                           <div className="mt-2 pt-2 border-t border-slate-200">
                             <p className="text-[10px] font-black uppercase text-indigo-600">Scheduled Delivery</p>
                             <p className="text-sm text-slate-600 font-medium">
                               {selectedOrder.scheduled_delivery_date} <br />
                               {selectedOrder.scheduled_delivery_slot_name}
                             </p>
                           </div>
                         )}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</p>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md">
                               {selectedOrder.payment_method}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                               selectedOrder.payment_status === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                            }`}>
                               {selectedOrder.payment_status}
                            </span>
                         </div>
                         <p className="text-[10px] font-mono text-slate-400 truncate">{selectedOrder.payment_reference || "No Reference"}</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Items</p>
                   <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                         <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <tr>
                               <th className="py-4 px-6">Product</th>
                               <th className="py-4 px-6 text-right">Qty</th>
                               <th className="py-4 px-6 text-right">Price</th>
                               <th className="py-4 px-6 text-right">Total</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {selectedOrder.items.map((item) => (
                               <tr key={item.id}>
                                  <td className="py-4 px-6">
                                     <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100">
                                           <img src={item.product_image_url || "/placeholder.jpg"} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                           <p className="font-black text-slate-900 text-sm">{item.product_name}</p>
                                           <p className="text-[10px] font-bold text-slate-400 uppercase">{item.product_category_name}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="py-4 px-6 text-right font-black text-slate-900 text-sm">{item.quantity}</td>
                                  <td className="py-4 px-6 text-right font-medium text-slate-500 text-sm">KSh {Number(item.unit_price).toLocaleString()}</td>
                                  <td className="py-4 px-6 text-right font-black text-slate-900 text-sm">KSh {(item.quantity * Number(item.unit_price)).toLocaleString()}</td>
                                </tr>
                            ))}
                         </tbody>
                         <tfoot className="bg-slate-50/50">
                            <tr>
                               <td colSpan={3} className="py-6 px-8 text-right font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Total Amount</td>
                               <td className="py-6 px-8 text-right font-black text-slate-900 text-xl">KSh {Number(selectedOrder.total_amount).toLocaleString()}</td>
                            </tr>
                         </tfoot>
                      </table>
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-100">
                   <div className="flex items-center gap-4 w-full sm:w-auto">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Actions</p>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={selectedOrder.status} 
                          onValueChange={(val) => handleStatusUpdate(selectedOrder.id, val)}
                          disabled={updatingOrderId === selectedOrder.id}
                        >
                          <SelectTrigger className="h-12 w-48 rounded-xl font-bold border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {getSelectableStatuses(selectedOrder.status).map(status => (
                              <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedOrder.status === "shipped" && (
                          <Button 
                            className="h-12 px-6 rounded-xl font-black bg-primary shadow-lg shadow-primary/20"
                            onClick={() => { closeViewDialog(); openConfirmDeliveryForm(selectedOrder); }}
                          >
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                   </div>
                   <Button variant="ghost" onClick={closeViewDialog} className="w-full sm:w-auto h-12 px-8 rounded-xl font-black text-slate-500 hover:text-slate-900">Close Panel</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-xl p-0 rounded-[2.5rem] border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-primary p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Confirm Delivery</DialogTitle>
              <p className="text-white/70 text-sm font-medium">Verify recipient and finalize the order.</p>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Recipient Name</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Who received the package?"
                  className="h-12 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Signature / Proof Code</Label>
                <Input
                  value={recipientSignature}
                  onChange={(e) => setRecipientSignature(e.target.value)}
                  placeholder="Enter confirmation code"
                  className="h-12 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Delivery Notes</Label>
                <Textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Any extra details about the delivery..."
                  className="rounded-xl bg-slate-50 border-slate-200 min-h-[100px]"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Button className="flex-1 h-14 rounded-2xl font-black shadow-lg" onClick={handleConfirmDelivery} disabled={Boolean(updatingOrderId)}>
                {updatingOrderId ? "Processing..." : "Confirm Delivery"}
              </Button>
              <Button variant="outline" className="h-14 px-8 rounded-2xl font-bold" onClick={closeConfirmDeliveryForm}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
