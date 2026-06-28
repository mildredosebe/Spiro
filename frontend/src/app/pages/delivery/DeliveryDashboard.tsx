import { useEffect, useMemo, useState } from "react";
import { Truck, CheckCircle2, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { confirmOrderDelivery, getDeliveryQueueOrders, type BackendOrder } from "../../lib/api";

const statusLabel = (status: string) => {
  if (status === "delivered_pending") return "Delivered Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export function DeliveryDashboard() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientSignature, setRecipientSignature] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadOrders = async () => {
    try {
      const data = await getDeliveryQueueOrders();
      setOrders(data);
      setLastUpdatedAt(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load delivery queue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const intervalId = window.setInterval(() => {
      loadOrders();
    }, 10000);

    const handleFocus = () => {
      loadOrders();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const queueOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (!["shipped", "delivered_pending", "delivered"].includes(order.status)) return false;
        if (!search.trim()) return true;
        return String(order.id).includes(search.trim()) || order.shipping_full_name.toLowerCase().includes(search.toLowerCase());
      }),
    [orders, search]
  );

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
    setRecipientName("");
    setRecipientSignature("");
    setDeliveryNotes("");
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return;

    if (!recipientName.trim()) {
      toast.error("Recipient name is required");
      return;
    }
    if (!recipientSignature.trim()) {
      toast.error("Recipient signature is required");
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
      toast.success(`Order #${selectedOrder.id} moved to customer confirmation`);
      closeConfirmDeliveryForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to confirm delivery";
      toast.error(message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Delivery Dashboard</h1>
        <p className="text-muted-foreground">Track shipped orders and capture delivery proof.</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : "Never"}
          </p>
          <Button variant="outline" onClick={loadOrders} disabled={loading || updatingOrderId !== null}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Queue
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by order id or customer name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading delivery queue...</Card>
      ) : queueOrders.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No delivery orders in queue.</Card>
      ) : (
        <div className="space-y-3">
          {queueOrders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-primary">Order #{order.id}</p>
                  <p className="text-sm text-muted-foreground">{order.shipping_full_name} • {order.shipping_phone}</p>
                  <p className="text-sm text-muted-foreground truncate">{order.shipping_address}, {order.shipping_city}</p>
                  {order.is_scheduled && (
                    <p className="text-xs font-bold text-indigo-500 mt-1">
                      Scheduled: {order.scheduled_delivery_date} ({order.scheduled_delivery_slot_name})
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    order.status === "shipped"
                      ? "bg-primary/10 text-primary border-primary"
                      : order.status === "delivered"
                        ? "bg-success/10 text-success border-success"
                        : "bg-warning/10 text-warning border-warning"
                  }
                >
                  {statusLabel(order.status)}
                </Badge>
                {order.status === "shipped" ? (
                  <Button onClick={() => openConfirmDeliveryForm(order)} disabled={updatingOrderId === order.id}>
                    <Truck className="w-4 h-4 mr-2" />
                    Confirm Delivery
                  </Button>
                ) : order.status === "delivered_pending" ? (
                  <Button variant="outline" disabled>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Awaiting Customer Confirmation
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Customer Confirmed
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isConfirmDialogOpen} onOpenChange={(open) => (open ? setIsConfirmDialogOpen(true) : closeConfirmDeliveryForm())}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-border">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-secondary/40">
            <DialogTitle className="text-2xl font-bold text-primary">Confirm Delivery</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Capture recipient proof before sending to customer confirmation.</p>
          </DialogHeader>

          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Order</p>
                  <p className="font-semibold text-primary">#{selectedOrder?.id ?? "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer Phone</p>
                  <p className="font-medium">{selectedOrder?.shipping_phone || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Delivery Address</p>
                  <p className="font-medium">{selectedOrder ? `${selectedOrder.shipping_address}, ${selectedOrder.shipping_city}, ${selectedOrder.shipping_postal_code}` : "-"}</p>
                </div>
                {selectedOrder?.is_scheduled && (
                  <div className="col-span-2">
                    <p className="text-indigo-600 font-bold text-xs uppercase">Scheduled Delivery</p>
                    <p className="font-medium text-slate-800">
                      {selectedOrder.scheduled_delivery_date} - {selectedOrder.scheduled_delivery_slot_name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientSignature">Recipient Signature / Confirmation Code</Label>
              <Input id="recipientSignature" value={recipientSignature} onChange={(e) => setRecipientSignature(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryNotes">Delivery Notes (Optional)</Label>
              <Textarea id="deliveryNotes" value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} rows={4} className="resize-none" />
            </div>

            <div className="flex gap-3 pt-3">
              <Button variant="outline" className="flex-1" onClick={closeConfirmDeliveryForm} disabled={Boolean(updatingOrderId)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-primary text-primary-foreground font-semibold" onClick={handleConfirmDelivery} disabled={Boolean(updatingOrderId)}>
                {updatingOrderId ? "Submitting..." : "Submit Delivery Proof"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
