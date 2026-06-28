import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CreditCard, Smartphone, Plus, Trash2, Check, ShieldCheck, Lock, AlertCircle, Loader2, CheckCircle2, RotateCcw, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import {
  BackendCart,
  createOrder,
  getCart,
  getCurrentUser,
  getMe,
  isAuthenticated,
  updateMe,
  clearCart,
  processOrderPayment,
  initiateMpesaPayment,
  getMpesaPaymentStatus,
  getCheckoutPricingPreview,
  getActiveDeliveryTimeSlots,
  type UserAddress,
  type DeliveryTimeSlot,
} from "../../../lib/api";

type AddressFormData = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  label: string;
};

const EMPTY_FORM: AddressFormData = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  label: "Home",
};

const addressToForm = (addr: UserAddress): AddressFormData => ({
  fullName: addr.full_name,
  phone: addr.phone,
  address: addr.address,
  city: addr.city || "",
  postalCode: addr.postal_code || "",
  label: addr.label || "Address",
});

type CheckoutStep = "form" | "mpesa-initiating" | "mpesa-waiting" | "mpesa-success" | "mpesa-failed" | "mpesa-timeout" | "card-processing" | "card-failed";

export function Checkout() {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [cart, setCart] = useState<BackendCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [showNewForm, setShowNewForm] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newForm, setNewForm] = useState<AddressFormData>(EMPTY_FORM);

  // Payment state
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("form");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeCheckoutRequestId, setActiveCheckoutRequestId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [countdown, setCountdown] = useState(60);

  // Scheduling state
  const [deliveryOption, setDeliveryOption] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledSlotId, setScheduledSlotId] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<DeliveryTimeSlot[]>([]);

  // Session Recovery
  useEffect(() => {
    const pendingSession = sessionStorage.getItem("mpesaPayment");
    if (pendingSession) {
      try {
        const data = JSON.parse(pendingSession);
        const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
        if (elapsed < 60) {
          setActiveOrderId(data.orderId);
          setActiveCheckoutRequestId(data.checkoutRequestId);
          setMpesaPhone(data.mpesaPhone);
          setPaymentMethod("mpesa");
          setCountdown(60 - elapsed);
          setCheckoutStep("mpesa-waiting");
        } else {
          sessionStorage.removeItem("mpesaPayment");
        }
      } catch (e) {
        sessionStorage.removeItem("mpesaPayment");
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login?redirect=/checkout", { replace: true });
      return;
    }

    const localUser = getCurrentUser();
    if (localUser) {
      const fullName = [localUser.first_name, localUser.last_name].filter(Boolean).join(" ").trim();
      const addrs = localUser.addresses ?? [];
      setSavedAddresses(addrs);
      setNewForm((prev) => ({
        ...prev,
        fullName: fullName || localUser.username || "",
        phone: localUser.phone || "",
      }));
      if (addrs.length > 0) {
        setSelectedAddressId(addrs[0].id ?? "addr-0");
      } else {
        setSelectedAddressId("new");
        setShowNewForm(true);
      }
    }

    const load = async () => {
      try {
        const [cartData, user, slots] = await Promise.all([
          getCart(),
          localUser ? Promise.resolve(localUser) : getMe(),
          getActiveDeliveryTimeSlots(),
        ]);
        setCart(cartData);
        setTimeSlots(slots);

        if (!localUser && user) {
          const addrs = user.addresses ?? [];
          const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
          setSavedAddresses(addrs);
          setNewForm((prev) => ({
            ...prev,
            fullName: fullName || user.username || prev.fullName,
            phone: user.phone || prev.phone,
          }));
          if (addrs.length > 0) {
            setSelectedAddressId(addrs[0].id ?? "addr-0");
          } else {
            setSelectedAddressId("new");
            setShowNewForm(true);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load checkout";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [navigate]);

  const activeForm: AddressFormData = useMemo(() => {
    if (selectedAddressId === "new") return newForm;
    const saved = savedAddresses.find(
      (a, i) => (a.id ?? `addr-${i}`) === selectedAddressId
    );
    return saved ? addressToForm(saved) : newForm;
  }, [selectedAddressId, savedAddresses, newForm]);

  useEffect(() => {
    if (activeForm.phone && !mpesaPhone) {
      let p = activeForm.phone.replace(/\D/g, "");
      if (p.startsWith("0")) p = "254" + p.slice(1);
      if (p.length === 12 && p.startsWith("254")) {
        setMpesaPhone(p);
      }
    }
  }, [activeForm.phone, mpesaPhone]);

  const currentDistance = useMemo(() => {
    if (selectedAddressId === "new") return 3.5;
    const addr = savedAddresses.find((a, i) => (a.id ?? `addr-${i}`) === selectedAddressId);
    if (!addr) return 3.5;
    const label = (addr.label ?? "").toLowerCase();
    if (label.includes("home")) return 2.5;
    if (label.includes("office") || label.includes("work")) return 5.2;
    return 3.8;
  }, [selectedAddressId, savedAddresses]);

  const subtotal = useMemo(() => {
    return (cart?.items ?? []).reduce(
      (sum, item) => sum + Number(item.product_price) * item.quantity,
      0
    );
  }, [cart]);

  const [fees, setFees] = useState<{
    serviceFee: number;
    deliveryFee: number;
    surgeFee: number;
    total: number;
  }>({
    serviceFee: 0,
    deliveryFee: 0,
    surgeFee: 0,
    total: subtotal,
  });

  useEffect(() => {
    if (subtotal === 0) return;

    const fetchPricing = async () => {
      try {
        const calc = await getCheckoutPricingPreview(subtotal, currentDistance);
        setFees({
          serviceFee: parseFloat(calc.service_fee) || 0,
          deliveryFee: parseFloat(calc.delivery_fee) || 0,
          surgeFee: parseFloat(calc.surge_fee) || 0,
          total: parseFloat(calc.total_amount) || (subtotal),
        });
      } catch (e) {
        setFees({
          serviceFee: 80,
          deliveryFee: currentDistance > 3 ? 150 : 100,
          surgeFee: 0,
          total: subtotal + 80 + (currentDistance > 3 ? 150 : 100),
        });
      }
    };

    fetchPricing();
  }, [subtotal, currentDistance]);

  const toKsh = (amount: number) =>
    `KSh ${amount.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    setShowNewForm(id === "new");
  };

  const handleDeleteAddress = async (addrId: string, index: number) => {
    setDeletingId(addrId);
    try {
      const next = savedAddresses.filter((_, i) => i !== index);
      const updated = await updateMe({ addresses: next });
      const addrs = updated.addresses ?? [];
      setSavedAddresses(addrs);

      if (selectedAddressId === addrId) {
        if (addrs.length > 0) {
          setSelectedAddressId(addrs[0].id ?? "addr-0");
          setShowNewForm(false);
        } else {
          setSelectedAddressId("new");
          setShowNewForm(true);
        }
      }
      toast.success("Address removed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove address";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const runMpesaPayment = async (orderId: number, phone: string) => {
    setCheckoutStep("mpesa-initiating");
    setPaymentError("");
    setCountdown(60);

    try {
      const parsedPhone = phone.replace(/\D/g, "");
      const res = await initiateMpesaPayment(orderId, parsedPhone);
      setActiveCheckoutRequestId(res.checkout_request_id);
      sessionStorage.setItem("mpesaPayment", JSON.stringify({
        orderId,
        checkoutRequestId: res.checkout_request_id,
        mpesaPhone: phone,
        startTime: Date.now()
      }));
      setCheckoutStep("mpesa-waiting");
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Could not initiate M-Pesa push");
      setCheckoutStep("mpesa-failed");
      toast.error("M-Pesa initiation failed");
    }
  };

  const runCardPayment = async (orderId: number) => {
    setCheckoutStep("card-processing");
    setPaymentError("");
    try {
      const updatedOrder = await processOrderPayment(orderId, { card_last4: "4242" });
      if (updatedOrder.payment_status !== "payment_paid") {
        throw new Error(updatedOrder.payment_failure_reason || "Payment was not completed.");
      }
      await clearCart();
      navigate(`/order-confirmation/${updatedOrder.id}`, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed";
      setPaymentError(message);
      setCheckoutStep("card-failed");
      toast.error(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = activeForm;
    if (!form.phone.trim()) { toast.error("Phone number is required"); return; }
    if (!form.address.trim()) { toast.error("Address is required"); return; }
    if (!form.fullName.trim()) { toast.error("Full name is required"); return; }
    if (!cart || cart.items.length === 0) { toast.error("Your cart is empty"); return; }

    if (deliveryOption === "scheduled") {
      if (!scheduledDate) { toast.error("Please select a delivery date"); return; }
      if (!scheduledSlotId) { toast.error("Please select a time slot"); return; }
    }

    let parsedPhone = mpesaPhone;
    if (paymentMethod === "mpesa") {
      parsedPhone = mpesaPhone.replace(/\D/g, "");
      if (parsedPhone.length !== 12 || !parsedPhone.startsWith("254")) {
        toast.error("M-Pesa phone number must be 12 digits starting with 254 (e.g. 2547XXXXXXXX)");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let orderIdToProcess = activeOrderId;

      if (!orderIdToProcess) {
        if (selectedAddressId === "new" && saveNewAddress) {
          const next: UserAddress[] = [
            ...savedAddresses,
            {
              id: `addr-${Date.now()}`,
              label: (newForm.label || "Address").trim(),
              full_name: newForm.fullName.trim(),
              phone: newForm.phone.trim(),
              address: newForm.address.trim(),
              city: newForm.city.trim(),
              postal_code: newForm.postalCode.trim(),
            },
          ];
          await updateMe({ addresses: next });
        }

        const order = await createOrder({
          payment_method: paymentMethod,
          shipping_full_name: form.fullName.trim(),
          shipping_phone: form.phone.trim(),
          shipping_address: form.address.trim(),
          shipping_city: form.city.trim(),
          shipping_postal_code: form.postalCode.trim(),
          distance_km: currentDistance,
          is_scheduled: deliveryOption === "scheduled",
          scheduled_delivery_date: deliveryOption === "scheduled" ? scheduledDate : undefined,
          scheduled_delivery_slot_id: deliveryOption === "scheduled" ? parseInt(scheduledSlotId, 10) : undefined,
          items: cart.items.map((item) => ({ product_id: item.product, quantity: item.quantity })),
        });
        orderIdToProcess = order.id;
        setActiveOrderId(order.id);
      }

      if (paymentMethod === "mpesa") {
        await runMpesaPayment(orderIdToProcess!, parsedPhone);
      } else {
        await runCardPayment(orderIdToProcess!);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not place order";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Polling effect
  useEffect(() => {
    if (checkoutStep !== "mpesa-waiting" || !activeCheckoutRequestId || !activeOrderId) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    
    const poll = async () => {
      try {
        const statusRes = await getMpesaPaymentStatus(activeCheckoutRequestId);
        if (statusRes.status === "success") {
          setCheckoutStep("mpesa-success");
          sessionStorage.removeItem("mpesaPayment");
          await clearCart();
          setTimeout(() => navigate(`/order-confirmation/${activeOrderId}`, { replace: true }), 2000);
          return;
        } else if (statusRes.status === "failed") {
          setPaymentError(statusRes.result_desc || "M-Pesa transaction failed.");
          setCheckoutStep("mpesa-failed");
          sessionStorage.removeItem("mpesaPayment");
          return;
        } else if (statusRes.status === "cancelled") {
          setPaymentError("You cancelled the M-Pesa prompt.");
          setCheckoutStep("mpesa-failed");
          sessionStorage.removeItem("mpesaPayment");
          return;
        } else if (statusRes.status === "timeout") {
          setCheckoutStep("mpesa-timeout");
          sessionStorage.removeItem("mpesaPayment");
          return;
        }
        
        timeoutId = setTimeout(poll, 3000);
      } catch (err) {
        timeoutId = setTimeout(poll, 3000);
      }
    };

    timeoutId = setTimeout(poll, 3000);
    return () => clearTimeout(timeoutId);
  }, [checkoutStep, activeOrderId, activeCheckoutRequestId, navigate]);

  // Countdown effect
  useEffect(() => {
    if (checkoutStep !== "mpesa-waiting") return;
    
    if (countdown <= 0) {
      setCheckoutStep("mpesa-timeout");
      sessionStorage.removeItem("mpesaPayment");
      return;
    }

    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [checkoutStep, countdown]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pb-12 animate-fade-in pt-6 md:pt-12">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 shimmer rounded-[2rem] bg-white border border-border/40" />
            <div className="h-40 shimmer rounded-[2rem] bg-white border border-border/40" />
          </div>
          <div className="h-[400px] shimmer rounded-[2rem] bg-white border border-border/40" />
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-white pb-24 md:pb-12 animate-fade-in">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 px-3 py-2 flex items-center justify-between md:hidden shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-full hover:bg-black/5 text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-black text-base text-primary">Secure Checkout</h1>
        </div>
        <Lock className="w-4 h-4 text-success" />
      </header>

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-3 py-3 md:px-5 md:py-4">
        <div className="hidden md:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-primary flex items-center gap-2">
              Checkout
            </h1>
            <p className="text-xs font-semibold text-muted-foreground mt-1">
              Complete your order details below.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">

            {/* ── Shipping Address Card ── */}
            <div className="bg-white rounded-xl p-3 md:p-4 border border-border/50 animate-fade-up">
              <h2 className="font-black text-base text-primary mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                Shipping Address
              </h2>

              {savedAddresses.length > 0 && (
                <RadioGroup
                  value={selectedAddressId}
                  onValueChange={handleSelectAddress}
                  className="space-y-4 mb-6"
                >
                  {savedAddresses.map((addr, i) => {
                    const id = addr.id ?? `addr-${i}`;
                    const isSelected = selectedAddressId === id;
                    return (
                      <label
                        key={id}
                        htmlFor={`addr-${id}`}
                        className={`flex items-start gap-3 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border/60 hover:border-primary/40 hover:bg-secondary/50"
                        }`}
                      >
                        <RadioGroupItem value={id} id={`addr-${id}`} className="mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-primary">{addr.label || "Address"}</span>
                            {isSelected && <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Selected</span>}
                          </div>
                          <p className="text-xs font-bold text-primary/90 mt-1">{addr.full_name}</p>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5">{addr.phone}</p>
                          <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                            {[addr.address, addr.city, addr.postal_code].filter(Boolean).join(", ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-full h-8 w-8"
                          disabled={deletingId === id}
                          onClick={(e) => { e.preventDefault(); handleDeleteAddress(id, i); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </label>
                    );
                  })}

                  <label
                    htmlFor="addr-new"
                    className={`flex items-center gap-3 p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedAddressId === "new"
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-dashed border-border hover:border-primary/40 hover:bg-secondary/50"
                    }`}
                  >
                    <RadioGroupItem value="new" id="addr-new" className="shrink-0" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-bold text-primary">Use a different address</span>
                    </div>
                  </label>
                </RadioGroup>
              )}

              {showNewForm && (
                <div className="space-y-3 pt-2">
                  {savedAddresses.length > 0 && (
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Label</Label>
                      <Input
                        placeholder="Home / Office"
                        value={newForm.label}
                        onChange={(e) => setNewForm((p) => ({ ...p, label: e.target.value }))}
                        className="h-9 rounded-lg mt-1 text-xs"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Full Name</Label>
                      <Input
                        value={newForm.fullName}
                        onChange={(e) => setNewForm((p) => ({ ...p, fullName: e.target.value }))}
                        required={selectedAddressId === "new"}
                        className="h-9 rounded-lg mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Phone Number</Label>
                      <Input
                        type="tel"
                        value={newForm.phone}
                        onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))}
                        required={selectedAddressId === "new"}
                        className="h-9 rounded-lg mt-1 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Street Address</Label>
                    <Input
                      value={newForm.address}
                      onChange={(e) => setNewForm((p) => ({ ...p, address: e.target.value }))}
                      required={selectedAddressId === "new"}
                      className="h-9 rounded-lg mt-1 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">City <span className="text-muted-foreground/50 lowercase normal-case text-[9px]">(Optional)</span></Label>
                      <Input
                        value={newForm.city}
                        onChange={(e) => setNewForm((p) => ({ ...p, city: e.target.value }))}
                        className="h-9 rounded-lg mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Postal Code <span className="text-muted-foreground/50 lowercase normal-case text-[9px]">(Optional)</span></Label>
                      <Input
                        value={newForm.postalCode}
                        onChange={(e) => setNewForm((p) => ({ ...p, postalCode: e.target.value }))}
                        className="h-9 rounded-lg mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none mt-4 bg-secondary/50 p-3 rounded-lg">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={saveNewAddress}
                      onClick={() => setSaveNewAddress((v) => !v)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                        saveNewAddress
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-primary/30 bg-white"
                      }`}
                    >
                      {saveNewAddress && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-xs font-bold text-primary">Save this address for future orders</span>
                  </label>
                </div>
              )}
            </div>

            {/* ── Delivery Options Card ── */}
            <div className="bg-white rounded-xl p-3 md:p-4 border border-border/50 animate-fade-up stagger-1">
              <h2 className="font-black text-base text-primary mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                Delivery Time
              </h2>
              <RadioGroup value={deliveryOption} onValueChange={(val) => setDeliveryOption(val as any)} className="space-y-3 mb-4">
                <label className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  deliveryOption === "immediate"
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border/60 hover:border-primary/40 hover:bg-secondary/50"
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-primary flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Immediate Delivery</span>
                    <RadioGroupItem value="immediate" id="immediate" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground ml-6">Delivered as soon as possible.</span>
                </label>
                
                <label className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  deliveryOption === "scheduled"
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border/60 hover:border-primary/40 hover:bg-secondary/50"
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-primary flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Schedule for Later</span>
                    <RadioGroupItem value="scheduled" id="scheduled" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground ml-6">Choose a convenient date and time.</span>
                </label>
              </RadioGroup>

              {deliveryOption === "scheduled" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 animate-fade-in p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <div>
                    <Label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 block">Date</Label>
                    <Input 
                      type="date" 
                      min={new Date().toISOString().split("T")[0]}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="h-9 rounded-lg border-primary/30 focus-visible:ring-primary bg-white font-semibold text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 block">Time Slot</Label>
                    <select 
                      value={scheduledSlotId}
                      onChange={(e) => setScheduledSlotId(e.target.value)}
                      className="w-full h-9 rounded-lg border-primary/30 focus-visible:ring-primary bg-white font-semibold px-2 text-xs"
                    >
                      <option value="" disabled>Select a time slot</option>
                      {timeSlots.map(slot => (
                        <option key={slot.id} value={slot.id}>{slot.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* ── Payment Method Card ── */}
            <div className="bg-white rounded-xl p-3 md:p-4 border border-border/50 animate-fade-up stagger-2">
              <h2 className="font-black text-base text-primary mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                Payment Method
              </h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  onClick={() => setPaymentMethod("mpesa")}
                  className={`flex flex-col gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                    paymentMethod === "mpesa"
                      ? "border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-500 ring-offset-2"
                      : "border-border/60 hover:border-emerald-200 hover:bg-emerald-50/50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <Smartphone className={`w-6 h-6 ${paymentMethod === "mpesa" ? "text-emerald-600" : "text-muted-foreground/60"}`} />
                    <RadioGroupItem value="mpesa" id="mpesa" className="mt-0.5" />
                  </div>
                  <div>
                    <p className={`font-black text-sm ${paymentMethod === "mpesa" ? "text-emerald-800" : "text-primary"}`}>M-Pesa</p>
                    <p className={`text-[10px] font-semibold ${paymentMethod === "mpesa" ? "text-emerald-700/80" : "text-muted-foreground"}`}>Pay with mobile money</p>
                  </div>
                  {paymentMethod === "mpesa" && (
                    <div className="mt-2 relative z-10 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <Label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 block">M-Pesa Phone Number</Label>
                      <Input
                        type="tel"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="2547XXXXXXXX"
                        className="h-9 rounded-lg border-emerald-500/30 focus-visible:ring-emerald-500 bg-white text-xs"
                      />
                    </div>
                  )}
                  {paymentMethod === "mpesa" && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />}
                </div>

                <label
                  htmlFor="card"
                  className={`flex flex-col gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                    paymentMethod === "card"
                      ? "border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500 ring-offset-2"
                      : "border-border/60 hover:border-blue-200 hover:bg-blue-50/50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <CreditCard className={`w-6 h-6 ${paymentMethod === "card" ? "text-blue-600" : "text-muted-foreground/60"}`} />
                    <RadioGroupItem value="card" id="card" className="mt-0.5" />
                  </div>
                  <div>
                    <p className={`font-black text-sm ${paymentMethod === "card" ? "text-blue-800" : "text-primary"}`}>Card</p>
                    <p className={`text-[10px] font-semibold ${paymentMethod === "card" ? "text-blue-700/80" : "text-muted-foreground"}`}>Visa, Mastercard</p>
                  </div>
                  {paymentMethod === "card" && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/3" />}
                </label>
              </RadioGroup>
            </div>
          </div>

          {/* ── Order Summary Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-3 md:p-4 border border-border/50 sticky top-28 animate-fade-up stagger-2">
              <h3 className="font-bold text-base text-primary mb-3">Order Summary</h3>
              
              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-primary">{toKsh(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span className="text-primary">{toKsh(fees.serviceFee)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="text-primary">{toKsh(fees.deliveryFee)}</span>
                </div>
                {fees.surgeFee > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-amber-500 animate-pulse">
                    <span>Surge Charge</span>
                    <span>{toKsh(fees.surgeFee)}</span>
                  </div>
                )}
              </div>
              
              <div className="w-full h-px bg-border/60 border-dashed border-b mb-5" />
              
              <div className="flex justify-between items-end mb-5">
                <span className="font-bold text-sm text-primary">Total</span>
                <span className="text-lg font-black text-primary tracking-tight">{toKsh(fees.total)}</span>
              </div>
              
              <Button 
                type="submit" 
                size="lg" 
                disabled={isSubmitting || checkoutStep.startsWith("mpesa") || !cart || cart.items.length === 0}
                className="w-full h-10 rounded-xl text-sm font-bold bg-[#f4c430] text-primary hover:bg-[#f4c430]/90 shadow-lg shadow-[#f4c430]/20 btn-glow transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : checkoutStep === "mpesa-waiting" ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Check your phone ({countdown}s)...</>
                ) : checkoutStep === "card-processing" ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Processing Card...</>
                ) : checkoutStep === "mpesa-success" ? (
                  <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Payment Received!</>
                ) : (
                  `Pay ${toKsh(fees.total)}`
                )}
              </Button>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground/80">
                <ShieldCheck className="w-4 h-4 text-success" /> 100% Secure Checkout
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Payment Modals */}
      <Dialog open={["mpesa-success", "mpesa-failed", "mpesa-timeout", "card-failed"].includes(checkoutStep)} onOpenChange={(open) => {
        if (!open && checkoutStep !== "mpesa-success") setCheckoutStep("form");
      }}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-0 text-center bg-white">
          <DialogHeader className="sr-only">
             <DialogTitle>Payment Status</DialogTitle>
             <DialogDescription>Payment result popup</DialogDescription>
          </DialogHeader>
          
          {checkoutStep === "mpesa-success" && (
             <div className="p-8">
               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                 <CheckCircle2 className="w-10 h-10 text-white" />
               </motion.div>
               <h1 className="text-2xl font-black text-emerald-950 mb-2">Payment Received!</h1>
               <p className="text-emerald-900/70 font-medium mb-6">Your payment was successful.</p>
               <div className="flex items-center justify-center gap-2">
                 <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                 <span className="text-sm font-bold text-emerald-600">Redirecting to order...</span>
               </div>
             </div>
          )}
          
          {(checkoutStep === "mpesa-failed" || checkoutStep === "card-failed") && (
            <div className="p-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Payment Failed</h1>
              <p className="text-gray-600 font-medium mb-8">{paymentError}</p>
              <div className="flex flex-col gap-3 mt-2">
                <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full" onClick={() => checkoutStep === "mpesa-failed" ? runMpesaPayment(activeOrderId!, mpesaPhone) : runCardPayment(activeOrderId!)}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                </Button>
                <Button size="lg" variant="outline" className="w-full rounded-full" onClick={() => setCheckoutStep("form")}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {checkoutStep === "mpesa-timeout" && (
            <div className="p-8">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-orange-500" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Prompt Expired</h1>
              <p className="text-gray-600 font-medium mb-8">We didn't receive your payment in time. Please try again.</p>
              <div className="flex flex-col gap-3 mt-2">
                <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full" onClick={() => runMpesaPayment(activeOrderId!, mpesaPhone)}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Resend Prompt
                </Button>
                <Button size="lg" variant="outline" className="w-full rounded-full" onClick={() => setCheckoutStep("form")}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
