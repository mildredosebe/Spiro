import { useParams, Link } from "react-router";
import { CheckCircle2, Package } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { getOrder, type BackendOrder } from "../../../lib/api";

export function OrderConfirmation() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<BackendOrder | null>(null);

  useEffect(() => {
    if (orderId) {
      getOrder(orderId).then(setOrder).catch(console.error);
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6 flex justify-center"
          >
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your purchase. Your payment was received and your order is now confirmed.
            </p>

            <div className="bg-secondary p-4 rounded-lg mb-6 text-left">
              <div className="mb-2">
                <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                <p className="font-mono font-bold text-lg">{orderId}</p>
              </div>
              {order?.is_scheduled && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">Scheduled Delivery</p>
                  <p className="font-bold text-primary">
                    {order.scheduled_delivery_date}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.scheduled_delivery_slot_name}
                  </p>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-8">
              We've sent a confirmation email with your order details.
            </p>

            <div className="space-y-3">
              <Link to={`/orders`}>
                <Button className="w-full" size="lg">
                  <Package className="w-5 h-5 mr-2" />
                  Track Order
                </Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline" className="w-full" size="lg">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
