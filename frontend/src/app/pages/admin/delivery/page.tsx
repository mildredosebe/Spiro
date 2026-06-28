import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Clock, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../../components/ui/dialog";
import { toast } from "sonner";
import {
  getAdminDeliveryTimeSlots,
  createAdminDeliveryTimeSlot,
  updateAdminDeliveryTimeSlot,
  deleteAdminDeliveryTimeSlot,
  type DeliveryTimeSlot,
} from "../../../lib/api";

export function AdminDelivery() {
  const [slots, setSlots] = useState<DeliveryTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DeliveryTimeSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      const data = await getAdminDeliveryTimeSlots();
      setSlots(data);
    } catch (error) {
      toast.error("Failed to load delivery time slots");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (slot?: DeliveryTimeSlot) => {
    if (slot) {
      setEditingSlot(slot);
      setName(slot.name);
      setIsActive(slot.is_active);
      setSortOrder(slot.sort_order);
    } else {
      setEditingSlot(null);
      setName("");
      setIsActive(true);
      setSortOrder(0);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingSlot) {
        await updateAdminDeliveryTimeSlot(editingSlot.id, {
          name,
          is_active: isActive,
          sort_order: sortOrder,
        });
        toast.success("Time slot updated successfully");
      } else {
        await createAdminDeliveryTimeSlot({
          name,
          is_active: isActive,
          sort_order: sortOrder,
        });
        toast.success("Time slot created successfully");
      }
      setIsDialogOpen(false);
      loadSlots();
    } catch (error) {
      toast.error("Failed to save time slot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this time slot?")) return;
    try {
      await deleteAdminDeliveryTimeSlot(id);
      toast.success("Time slot deleted");
      loadSlots();
    } catch (error) {
      toast.error("Failed to delete time slot");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Delivery Settings</h1>
          <p className="text-slate-500 font-medium">Manage available delivery time slots for customer orders.</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="h-12 px-6 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Time Slot
        </Button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-slate-500 font-semibold animate-pulse">Loading settings...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-black text-lg">No delivery time slots</p>
            <p className="text-slate-400 text-sm font-medium mt-1">Create your first time slot to allow customers to schedule deliveries.</p>
            <Button onClick={() => handleOpenDialog()} variant="outline" className="mt-6 rounded-xl font-bold">
              Create Time Slot
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {slots.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{slot.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">Sort Order: {slot.sort_order}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${slot.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {slot.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(slot)} className="text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(slot.id)} className="text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              {editingSlot ? "Edit Time Slot" : "New Time Slot"}
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Configure the time slot details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Display Name</label>
              <Input
                placeholder="e.g. Morning (9AM - 12PM)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Sort Order (Lowest first)</label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-900"
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <p className="font-bold text-slate-900">Active</p>
                <p className="text-xs font-medium text-slate-500">Available to customers</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="rounded-xl font-bold bg-primary text-white">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSlot ? "Save Changes" : "Create Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
