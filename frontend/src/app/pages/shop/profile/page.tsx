import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, User, MapPin, CreditCard, LogOut, ChevronRight, TrendingUp, ShieldCheck, Bell } from "lucide-react";
import { useNavigate } from "react-router";
import { Card } from "../../../components/ui/card";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { toast } from "sonner";
import {
  clearSession,
  getCurrentUser,
  getMe,
  getOrders,
  isAuthenticated,
  updateMe,
  type AuthUser,
  type BackendOrder,
  type UserAddress,
} from "../../../lib/api";

export function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [addressForm, setAddressForm] = useState<UserAddress>({
    label: "Home",
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated()) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const [me, userOrders] = await Promise.all([getMe(), getOrders()]);
        setUser(me);
        setProfileForm({
          first_name: me.first_name || "",
          last_name: me.last_name || "",
          phone: me.phone || "",
        });
        setAddressForm((prev) => ({
          ...prev,
          full_name: [me.first_name, me.last_name].filter(Boolean).join(" ") || me.username || "",
          phone: me.phone || "",
        }));
        setOrders(userOrders);
      } catch {
        clearSession();
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const savedAddresses = useMemo(() => {
    if (user?.addresses && user.addresses.length > 0) {
      return user.addresses.map((address) => ({
        fullName: address.full_name,
        phone: address.phone,
        address: address.address,
        city: address.city || "",
        postalCode: address.postal_code || "",
        label: address.label || "Address",
        id: address.id || `${address.full_name}-${address.address}`,
      }));
    }

    const deduped = new Map<string, {
      fullName: string;
      phone: string;
      address: string;
      city: string;
      postalCode: string;
      label: string;
      id: string;
    }>();

    orders.forEach((order) => {
      const key = [
        order.shipping_full_name,
        order.shipping_phone,
        order.shipping_address,
        order.shipping_city,
        order.shipping_postal_code,
      ].join("|");

      if (!deduped.has(key)) {
        deduped.set(key, {
          fullName: order.shipping_full_name,
          phone: order.shipping_phone,
          address: order.shipping_address,
          city: order.shipping_city,
          postalCode: order.shipping_postal_code,
          label: "From Order",
          id: key,
        });
      }
    });

    return Array.from(deduped.values());
  }, [orders]);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Customer";
  const phone = user?.phone?.trim() || "No phone number added";

  const syncUser = (next: AuthUser) => {
    setUser(next);
    setProfileForm({
      first_name: next.first_name || "",
      last_name: next.last_name || "",
      phone: next.phone || "",
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const updated = await updateMe({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        phone: profileForm.phone.trim(),
      });
      syncUser(updated);
      setIsEditingProfile(false);
      toast.success("Profile updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async () => {
    if (!user) return;

    const full_name = addressForm.full_name.trim();
    const phoneValue = addressForm.phone.trim();
    const addressValue = addressForm.address.trim();
    if (!full_name || !phoneValue || !addressValue) {
      toast.error("Full name, phone and address are required");
      return;
    }

    const nextAddresses: UserAddress[] = [
      ...(user.addresses || []),
      {
        id: `addr-${Date.now()}`,
        label: (addressForm.label || "Address").trim(),
        full_name,
        phone: phoneValue,
        address: addressValue,
        city: (addressForm.city || "").trim(),
        postal_code: (addressForm.postal_code || "").trim(),
      },
    ];

    setSavingAddress(true);
    try {
      const updated = await updateMe({ addresses: nextAddresses });
      syncUser(updated);
      setIsAddingAddress(false);
      setAddressForm({
        label: "Home",
        full_name: [updated.first_name, updated.last_name].filter(Boolean).join(" ") || updated.username || "",
        phone: updated.phone || "",
        address: "",
        city: "",
        postal_code: "",
      });
      toast.success("Address saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save address";
      toast.error(message);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;
    const nextAddresses = (user.addresses || []).filter((addr) => (addr.id || `${addr.full_name}-${addr.address}`) !== addressId);
    try {
      const updated = await updateMe({ addresses: nextAddresses });
      syncUser(updated);
      toast.success("Address removed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove address";
      toast.error(message);
    }
  };

  const menuItems = [
    { icon: User, label: "Edit Profile", onClick: () => setIsEditingProfile((v) => !v) },
    { icon: MapPin, label: "Saved Addresses", count: savedAddresses.length, onClick: () => setIsAddingAddress((v) => !v) },
    { icon: TrendingUp, label: "Personal Spending", onClick: () => navigate("/spending") },
    { icon: Bell, label: "Notifications", onClick: () => navigate("/notifications") },
    { icon: CreditCard, label: "Payment Methods", onClick: () => {} },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fb] pt-12">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="h-40 shimmer rounded-[2rem] bg-white border border-border/40" />
          <div className="h-64 shimmer rounded-[2rem] bg-white border border-border/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-12 animate-fade-in">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border/50 px-3 py-2 flex items-center gap-2 md:hidden shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-full hover:bg-black/5 text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-base text-primary">Profile</h1>
      </header>

      <div className="max-w-5xl mx-auto px-3 py-3 md:px-5 md:py-4 flex flex-col space-y-3">
        <div className="hidden md:flex justify-between items-center mb-3">
          <h1 className="text-xl font-black text-primary">My Account</h1>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-success bg-success/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Profile
          </div>
        </div>

        {/* ── User Info Card ── */}
        <div className="bg-white rounded-xl p-3 md:p-4 border border-border/50 animate-fade-up">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
            <Avatar className="w-16 h-16 border-2 border-white shadow-md shadow-primary/10">
              <AvatarFallback className="bg-primary text-white text-xl font-black">
                {fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 mt-1 md:mt-2">
              <h2 className="text-lg font-black text-primary">{fullName}</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{user?.email || "No email available"}</p>
              <p className="text-xs text-muted-foreground font-medium">{phone}</p>
            </div>
            <Button 
              variant="outline" 
              className="w-full md:w-auto rounded-lg font-bold border-2 border-primary/20 hover:border-primary hover:bg-primary/5 hover:text-primary mt-3 md:mt-1 h-8 text-xs px-4"
              onClick={() => setIsEditingProfile((v) => !v)}
            >
              {isEditingProfile ? "Close Editor" : "Edit Profile"}
            </Button>
          </div>

          {isEditingProfile && (
            <div className="mt-5 pt-5 border-t border-border/50 animate-fade-in space-y-3">
              <h3 className="font-black text-sm text-primary mb-1">Update Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">First Name</Label>
                  <Input
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    className="h-9 rounded-lg mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Last Name</Label>
                  <Input
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="h-9 rounded-lg mt-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Phone Number</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="h-9 rounded-lg mt-1 text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="rounded-lg h-9 text-xs font-bold flex-1" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" className="rounded-lg h-9 text-xs font-bold flex-1 border-2" onClick={() => setIsEditingProfile(false)} disabled={savingProfile}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Navigation Menu ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-border/50 overflow-hidden animate-fade-up stagger-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors border-b last:border-b-0 border-border/50 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="flex-1 text-left text-xs font-bold text-primary">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[9px] font-bold">
                        {item.count}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </button>
                );
              })}
              
              {/* Logout Button inside menu on desktop */}
              <button
                onClick={() => { clearSession(); navigate("/login", { replace: true }); }}
                className="w-full flex items-center gap-3 p-3 hover:bg-red-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LogOut className="w-4 h-4 text-red-600" />
                </div>
                <span className="flex-1 text-left text-xs font-bold text-red-600">Log Out</span>
              </button>
            </div>
          </div>

          {/* ── Saved Addresses ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-3 md:p-4 border border-border/50 animate-fade-up stagger-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-base text-primary">Saved Addresses</h3>
                <Button 
                  variant="outline" 
                  className="rounded-lg font-bold border-2 border-primary/20 hover:border-primary hover:bg-primary/5 hover:text-primary h-8 text-xs px-4"
                  onClick={() => setIsAddingAddress((v) => !v)}
                >
                  {isAddingAddress ? "Cancel" : "Add New"}
                </Button>
              </div>

              {isAddingAddress && (
                <div className="mb-5 p-3 md:p-4 bg-[#f7f8fb] rounded-xl border border-border/50 space-y-3 animate-fade-in">
                  <h4 className="font-bold text-xs text-primary mb-1">New Address Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Label (e.g. Home, Office)</Label>
                      <Input
                        value={addressForm.label || ""}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))}
                        className="h-9 rounded-lg mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Full Name</Label>
                      <Input
                        value={addressForm.full_name}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, full_name: e.target.value }))}
                        className="h-9 rounded-lg mt-1 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Phone Number</Label>
                      <Input
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="h-9 rounded-lg mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">City <span className="normal-case lowercase text-muted-foreground/60 font-medium">(Optional)</span></Label>
                      <Input
                        value={addressForm.city || ""}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))}
                        className="h-9 rounded-lg mt-1 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Street Address</Label>
                    <Input
                      value={addressForm.address}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, address: e.target.value }))}
                      className="h-9 rounded-lg mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Postal Code <span className="normal-case lowercase text-muted-foreground/60 font-medium">(Optional)</span></Label>
                    <Input
                      value={addressForm.postal_code || ""}
                      onChange={(e) => setAddressForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                      className="h-9 rounded-lg mt-1 text-xs"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button className="rounded-lg h-9 text-xs font-bold" onClick={handleAddAddress} disabled={savingAddress}>
                      {savingAddress ? "Saving..." : "Save Address"}
                    </Button>
                  </div>
                </div>
              )}

              {savedAddresses.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border/60 rounded-xl bg-secondary/50">
                  <MapPin className="w-8 h-8 text-primary/20 mx-auto mb-2" />
                  <p className="text-xs font-bold text-primary">No addresses saved</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Add an address to speed up your checkout.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAddresses.map((address, index) => (
                    <div key={`${address.id}-${index}`} className="p-3 bg-white border border-border/50 rounded-xl hover:border-primary/30 transition-colors flex flex-col md:flex-row justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-primary">{address.label}</span>
                          <span className="bg-secondary text-primary/70 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Saved</span>
                        </div>
                        <p className="text-[11px] font-bold text-primary/90">{address.fullName}</p>
                        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{address.phone}</p>
                        <p className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate max-w-sm">
                          {address.address}, {address.city}, {address.postalCode}
                        </p>
                      </div>
                      {user?.addresses && user.addresses.length > 0 && (
                        <Button
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold md:self-start -ml-2 md:ml-0 rounded-lg h-8 text-xs px-3"
                          onClick={() => handleDeleteAddress(address.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
