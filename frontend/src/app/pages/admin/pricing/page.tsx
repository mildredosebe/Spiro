import { useEffect, useState } from "react";
import { 
  Coins, 
  Activity, 
  Check, 
  Loader2, 
  Plus, 
  Trash2, 
  Settings, 
  AlertCircle, 
  TrendingUp, 
  MapPin, 
  RotateCcw,
  Sparkles,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { toast } from "sonner";
import { 
  getAdminFeeRules, 
  updateAdminFeeRule, 
  getCheckoutPricingPreview, 
  type FeeRule,
  type PricingCalculation 
} from "../../../lib/api";

export function AdminPricing() {
  const [rules, setRules] = useState<FeeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRuleCode, setSavingRuleCode] = useState<string | null>(null);

  // Simulator State
  const [simSubtotal, setSimSubtotal] = useState("1200");
  const [simDistance, setSimDistance] = useState("4.5");
  const [simResult, setSimResult] = useState<PricingCalculation | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Local Rule Config States for Editing
  const [serviceFeeTiers, setServiceFeeTiers] = useState<any[]>([]);
  const [deliveryFeeTiers, setDeliveryFeeTiers] = useState<any[]>([]);
  const [surgeConfig, setSurgeConfig] = useState<any>({ calculation_type: "fixed", value: 100 });
  const [surgeActive, setSurgeActive] = useState(false);

  // Load Rules from Database
  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await getAdminFeeRules();
      setRules(data);

      // Parse configs into active edit state
      const serviceRule = data.find(r => r.code === "service_fee");
      if (serviceRule && Array.isArray(serviceRule.rules_config)) {
        setServiceFeeTiers([...serviceRule.rules_config]);
      }

      const deliveryRule = data.find(r => r.code === "delivery_fee");
      if (deliveryRule && Array.isArray(deliveryRule.rules_config)) {
        setDeliveryFeeTiers([...deliveryRule.rules_config]);
      }

      const surgeRule = data.find(r => r.code === "surge_fee");
      if (surgeRule) {
        setSurgeConfig({ ...surgeRule.rules_config });
        setSurgeActive(surgeRule.is_active);
      }
    } catch (error) {
      toast.error("Failed to load active pricing rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  // Run Checkout Pricing Simulator
  const runSimulator = async () => {
    setSimLoading(true);
    try {
      const subtotalVal = parseFloat(simSubtotal) || 0;
      const distanceVal = parseFloat(simDistance) || 0;
      const calc = await getCheckoutPricingPreview(subtotalVal, distanceVal);
      setSimResult(calc);
    } catch (error) {
      toast.error("Estimation simulator failed");
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    // Re-simulate whenever parameters change
    const timeout = setTimeout(() => {
      runSimulator();
    }, 400);
    return () => clearTimeout(timeout);
  }, [simSubtotal, simDistance, rules]);

  // Save Service Fee Tiers
  const handleSaveServiceFees = async () => {
    setSavingRuleCode("service_fee");
    try {
      const rule = rules.find(r => r.code === "service_fee");
      if (!rule) throw new Error("Service fee rule not found");

      // Validate bounds and numbers
      const cleanedTiers = serviceFeeTiers.map(t => ({
        min: parseFloat(t.min) || 0,
        max: t.max === "" || t.max === null ? null : parseFloat(t.max),
        type: t.type || "fixed",
        value: parseFloat(t.value) || 0
      }));

      const updated = await updateAdminFeeRule(rule.id, {
        rules_config: cleanedTiers
      });

      // Update rules array
      setRules(prev => prev.map(r => r.code === "service_fee" ? updated : r));
      toast.success("Service fee brackets saved successfully!");
    } catch (error) {
      toast.error("Failed to save service fee brackets");
    } finally {
      setSavingRuleCode(null);
    }
  };

  // Save Delivery Fee Brackets
  const handleSaveDeliveryFees = async () => {
    setSavingRuleCode("delivery_fee");
    try {
      const rule = rules.find(r => r.code === "delivery_fee");
      if (!rule) throw new Error("Delivery fee rule not found");

      const cleanedTiers = deliveryFeeTiers.map(t => ({
        min_km: parseFloat(t.min_km) || 0,
        max_km: t.max_km === "" || t.max_km === null ? null : parseFloat(t.max_km),
        min_val: parseFloat(t.min_val) || 0,
        max_val: parseFloat(t.max_val) || 0,
        default_val: parseFloat(t.default_val) || 0
      }));

      const updated = await updateAdminFeeRule(rule.id, {
        rules_config: cleanedTiers
      });

      setRules(prev => prev.map(r => r.code === "delivery_fee" ? updated : r));
      toast.success("Delivery fee distance brackets saved!");
    } catch (error) {
      toast.error("Failed to save delivery distance tiers");
    } finally {
      setSavingRuleCode(null);
    }
  };

  // Save / Toggle Surge Configuration
  const handleSaveSurge = async (overrideActive?: boolean) => {
    setSavingRuleCode("surge_fee");
    try {
      const rule = rules.find(r => r.code === "surge_fee");
      if (!rule) throw new Error("Surge fee rule not found");

      const isActive = overrideActive !== undefined ? overrideActive : surgeActive;
      const config = {
        calculation_type: surgeConfig.calculation_type,
        value: parseFloat(surgeConfig.value) || 0,
        description: surgeConfig.description || ""
      };

      const updated = await updateAdminFeeRule(rule.id, {
        is_active: isActive,
        rules_config: config
      });

      setRules(prev => prev.map(r => r.code === "surge_fee" ? updated : r));
      setSurgeActive(isActive);
      toast.success(`Surge Fee ${isActive ? "activated" : "deactivated"} & saved!`);
    } catch (error) {
      toast.error("Failed to save surge settings");
    } finally {
      setSavingRuleCode(null);
    }
  };

  // Add Service Tier Row
  const addServiceTier = () => {
    setServiceFeeTiers(prev => [
      ...prev,
      { min: "", max: "", type: "fixed", value: "" }
    ]);
  };

  // Remove Service Tier Row
  const removeServiceTier = (index: number) => {
    setServiceFeeTiers(prev => prev.filter((_, i) => i !== index));
  };

  // Add Delivery Bracket Row
  const addDeliveryBracket = () => {
    setDeliveryFeeTiers(prev => [
      ...prev,
      { min_km: "", max_km: "", min_val: "", max_val: "", default_val: "" }
    ]);
  };

  // Remove Delivery Bracket Row
  const removeDeliveryBracket = (index: number) => {
    setDeliveryFeeTiers(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-slate-500 font-semibold animate-pulse">Analyzing system pricing rules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Coins className="w-9 h-9 text-primary animate-pulse" />
            Dynamic Pricing & Fees
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Configure order service brackets, delivery distance tiers, and high-demand surge rules.
          </p>
        </div>

        {/* Global Surge Activation Badge */}
        <div className="flex items-center gap-4 bg-white p-4 border border-slate-200/60 rounded-3xl shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Surge mode</span>
            <span className={`text-sm font-black ${surgeActive ? "text-amber-500" : "text-slate-500"}`}>
              {surgeActive ? `Active (+ KSh ${surgeConfig.value})` : "Inactive"}
            </span>
          </div>
          <Switch 
            checked={surgeActive} 
            onCheckedChange={(checked) => {
              setSurgeActive(checked);
              handleSaveSurge(checked);
            }} 
            className="data-[state=checked]:bg-amber-500"
          />
        </div>
      </div>

      {/* Overview Analytics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Service Fee Rules", value: `${serviceFeeTiers.length} Active Brackets`, desc: "Based on checkout subtotal ranges", icon: Activity, bg: "bg-primary/8 text-primary", active: false },
          { label: "Delivery Logistics", value: `${deliveryFeeTiers.length} Distance Brackets`, desc: "Calculated via coordinates from store", icon: MapPin, bg: "bg-blue-50 text-blue-600", active: false },
          { label: "Weather / Surge Fee", value: surgeActive ? `+ KSh ${surgeConfig.value}` : "Disabled", desc: surgeActive ? "Triggering fee addition globally" : "Toggle surge switch to activate", icon: TrendingUp, bg: surgeActive ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500", active: surgeActive }
        ].map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className={`rounded-3xl p-6 border shadow-sm flex items-center justify-between transition-all hover:shadow-md ${s.active ? "bg-amber-50/40 border-amber-200/80" : "bg-white border-slate-200/60"}`}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">{s.label}</p>
                <p className="text-2xl font-black text-slate-900 mb-1">{s.value}</p>
                <p className="text-xs text-slate-400 font-medium">{s.desc}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.bg}`}>
                <Icon className={`w-5.5 h-5.5 ${s.active ? "animate-bounce" : ""}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Workspace split: Rules Editor vs Checkout Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Rules Config Tab container */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden">
            <Tabs defaultValue="service" className="w-full">
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-2">
                <TabsList className="bg-transparent border-0 gap-2 h-14">
                  <TabsTrigger 
                    value="service" 
                    className="h-10 px-5 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    1. Service Fees
                  </TabsTrigger>
                  <TabsTrigger 
                    value="delivery" 
                    className="h-10 px-5 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    2. Delivery Distance
                  </TabsTrigger>
                  <TabsTrigger 
                    value="surge" 
                    className="h-10 px-5 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    3. Surge settings
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Service Fee tiers */}
              <TabsContent value="service" className="p-6 space-y-6 outline-none">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Checkout Service Brackets</h2>
                    <p className="text-slate-400 text-xs mt-1 font-medium">Determine shopper/processing rates based on total subtotal.</p>
                  </div>
                  <Button 
                    onClick={addServiceTier}
                    size="sm"
                    className="bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white rounded-2xl gap-2 font-bold transition-all h-10 px-4"
                  >
                    <Plus className="w-4 h-4" /> Add Bracket
                  </Button>
                </div>

                <div className="border border-slate-200/60 rounded-3xl overflow-hidden bg-slate-50/20 shadow-inner-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider py-4 pl-6">Subtotal Min (KSh)</TableHead>
                        <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider py-4">Subtotal Max (KSh)</TableHead>
                        <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider py-4">Calculation Method</TableHead>
                        <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider py-4">Fee Charge</TableHead>
                        <TableHead className="w-16 py-4 pr-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceFeeTiers.map((tier, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/30">
                          <TableCell className="py-4 pl-6">
                            <div className="relative">
                              <Input 
                                type="number"
                                placeholder="0"
                                value={tier.min}
                                onChange={(e) => {
                                  const newTiers = [...serviceFeeTiers];
                                  newTiers[idx].min = e.target.value;
                                  setServiceFeeTiers(newTiers);
                                }}
                                className="w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 pl-12 rounded-2xl font-bold transition-colors"
                              />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KSh</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="relative">
                              <Input 
                                type="number"
                                placeholder="Infinity"
                                value={tier.max === null || tier.max === undefined ? "" : tier.max}
                                onChange={(e) => {
                                  const newTiers = [...serviceFeeTiers];
                                  newTiers[idx].max = e.target.value === "" ? null : e.target.value;
                                  setServiceFeeTiers(newTiers);
                                }}
                                className="w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 pl-12 rounded-2xl font-bold transition-colors"
                              />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KSh</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Select 
                              value={tier.type}
                              onValueChange={(val) => {
                                const newTiers = [...serviceFeeTiers];
                                newTiers[idx].type = val;
                                setServiceFeeTiers(newTiers);
                              }}
                            >
                              <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 h-12 rounded-2xl font-bold text-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                                <SelectItem value="fixed" className="rounded-xl font-bold">Fixed Amount (KSh)</SelectItem>
                                <SelectItem value="percentage" className="rounded-xl font-bold">Percentage (%)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="relative">
                              <Input 
                                type="number"
                                placeholder="0"
                                value={tier.value}
                                onChange={(e) => {
                                  const newTiers = [...serviceFeeTiers];
                                  newTiers[idx].value = e.target.value;
                                  setServiceFeeTiers(newTiers);
                                }}
                                className={`w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 rounded-2xl font-bold transition-colors ${
                                  tier.type === "percentage" ? "pr-10" : "pl-12"
                                }`}
                              />
                              {tier.type === "percentage" ? (
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
                              ) : (
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KSh</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center pr-6">
                            <Button 
                              onClick={() => removeServiceTier(idx)}
                              variant="ghost" 
                              size="icon"
                              className="text-slate-400 hover:text-red-500 rounded-xl h-10 w-10 hover:bg-red-50"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {serviceFeeTiers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                            <AlertCircle className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                            No service brackets configured. Click Add Bracket above.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleSaveServiceFees}
                    disabled={savingRuleCode === "service_fee"}
                    className="bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl h-12 px-6 shadow-lg shadow-primary/10 gap-2 transition-all"
                  >
                    {savingRuleCode === "service_fee" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save Service Fee Brackets
                  </Button>
                </div>
              </TabsContent>

              {/* Delivery distance tiers */}
              <TabsContent value="delivery" className="p-6 space-y-6 outline-none">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Delivery Logistics Distance Tiers</h2>
                    <p className="text-slate-400 text-xs mt-1 font-medium">Define delivery fees dynamically based on store-to-customer distance.</p>
                  </div>
                  <Button 
                    onClick={addDeliveryBracket}
                    size="sm"
                    className="bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white rounded-2xl gap-2 font-bold transition-all h-10 px-4"
                  >
                    <Plus className="w-4 h-4" /> Add Bracket
                  </Button>
                </div>

                <div className="border border-slate-200/60 rounded-3xl overflow-hidden bg-slate-50/20 shadow-inner-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider py-4 pl-6">Min Distance (km)</TableHead>
                        <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider py-4">Max Distance (km)</TableHead>
                        <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider py-4">Price Bounds (KSh)</TableHead>
                        <TableHead className="font-black text-slate-500 text-xs uppercase tracking-wider py-4">Default Applied Fee (KSh)</TableHead>
                        <TableHead className="w-16 py-4 pr-6"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryFeeTiers.map((tier, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/30">
                          <TableCell className="py-4 pl-6">
                            <div className="relative">
                              <Input 
                                type="number"
                                placeholder="0"
                                value={tier.min_km}
                                onChange={(e) => {
                                  const newTiers = [...deliveryFeeTiers];
                                  newTiers[idx].min_km = e.target.value;
                                  setDeliveryFeeTiers(newTiers);
                                }}
                                className="w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 pr-10 rounded-2xl font-bold transition-colors"
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">km</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="relative">
                              <Input 
                                type="number"
                                placeholder="Infinity"
                                value={tier.max_km === null || tier.max_km === undefined ? "" : tier.max_km}
                                onChange={(e) => {
                                  const newTiers = [...deliveryFeeTiers];
                                  newTiers[idx].max_km = e.target.value === "" ? null : e.target.value;
                                  setDeliveryFeeTiers(newTiers);
                                }}
                                className="w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 pr-10 rounded-2xl font-bold transition-colors"
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">km</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex gap-2 items-center">
                              <div className="relative flex-1">
                                <Input 
                                  type="number"
                                  placeholder="Min"
                                  value={tier.min_val}
                                  onChange={(e) => {
                                    const newTiers = [...deliveryFeeTiers];
                                    newTiers[idx].min_val = e.target.value;
                                    setDeliveryFeeTiers(newTiers);
                                  }}
                                  className="w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 pl-9 rounded-2xl text-xs font-bold transition-colors"
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KSh</span>
                              </div>
                              <span className="text-slate-400 font-bold text-xs">-</span>
                              <div className="relative flex-1">
                                <Input 
                                  type="number"
                                  placeholder="Max"
                                  value={tier.max_val}
                                  onChange={(e) => {
                                    const newTiers = [...deliveryFeeTiers];
                                    newTiers[idx].max_val = e.target.value;
                                    setDeliveryFeeTiers(newTiers);
                                  }}
                                  className="w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 pl-9 rounded-2xl text-xs font-bold transition-colors"
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KSh</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="relative">
                              <Input 
                                type="number"
                                placeholder="100"
                                value={tier.default_val}
                                onChange={(e) => {
                                  const newTiers = [...deliveryFeeTiers];
                                  newTiers[idx].default_val = e.target.value;
                                  setDeliveryFeeTiers(newTiers);
                                }}
                                className="w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 pl-12 rounded-2xl font-bold transition-colors"
                              />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KSh</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center pr-6">
                            <Button 
                              onClick={() => removeDeliveryBracket(idx)}
                              variant="ghost" 
                              size="icon"
                              className="text-slate-400 hover:text-red-500 rounded-xl h-10 w-10 hover:bg-red-50"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {deliveryFeeTiers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                            <AlertCircle className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                            No delivery distance brackets configured. Click Add Bracket.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleSaveDeliveryFees}
                    disabled={savingRuleCode === "delivery_fee"}
                    className="bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl h-12 px-6 shadow-lg shadow-primary/10 gap-2 transition-all"
                  >
                    {savingRuleCode === "delivery_fee" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save Delivery Brackets
                  </Button>
                </div>
              </TabsContent>

              {/* Surge settings */}
              <TabsContent value="surge" className="p-6 space-y-6 outline-none">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Demand & Surge Fee Engine</h2>
                  <p className="text-slate-400 text-xs mt-1 font-medium">Trigger additional flat fees during heavy weather, adverse conditions, or high delivery volume.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Calculation mode */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calculation Type</label>
                    <Select 
                      value={surgeConfig.calculation_type}
                      onValueChange={(val) => setSurgeConfig((prev: any) => ({ ...prev, calculation_type: val }))}
                    >
                      <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 h-12 rounded-2xl font-bold text-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                        <SelectItem value="fixed" className="rounded-xl font-bold">Fixed Added Amount (KSh)</SelectItem>
                        <SelectItem value="percentage" className="rounded-xl font-bold">Percentage Addition (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Multiplier / value */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Surge Amount</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        placeholder="100"
                        value={surgeConfig.value}
                        onChange={(e) => setSurgeConfig((prev: any) => ({ ...prev, value: e.target.value }))}
                        className="w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 pl-12 rounded-2xl font-bold transition-colors"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                        {surgeConfig.calculation_type === "percentage" ? "%" : "KSh"}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Public Reason / Customer Display Note</label>
                    <Input 
                      placeholder="e.g. Bad weather surge triggered in Nairobi region"
                      value={surgeConfig.description}
                      onChange={(e) => setSurgeConfig((prev: any) => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-50/50 border-slate-200 focus-visible:bg-white h-12 rounded-2xl font-medium transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={() => handleSaveSurge()}
                    disabled={savingRuleCode === "surge_fee"}
                    className="bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl h-12 px-6 shadow-lg shadow-primary/10 gap-2 transition-all"
                  >
                    {savingRuleCode === "surge_fee" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save Surge Settings
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Live Simulator sidebar tool */}
        <div className="space-y-6">
          <Card className="border border-slate-800 rounded-3xl bg-slate-900 text-white overflow-hidden relative shadow-xl">
            {/* Background glowing gradients */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -z-10" />

            <CardHeader className="border-b border-white/10 pb-6">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Live Checkout Simulator
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs font-medium">
                Simulate shopping cart checkouts in real-time to preview fee engine totals.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Params input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex justify-between">
                    <span>Order Subtotal</span>
                    <span className="text-primary font-black">KSh</span>
                  </label>
                  <Input 
                    type="number"
                    value={simSubtotal}
                    onChange={(e) => setSimSubtotal(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder-slate-500 h-12 rounded-2xl focus:border-primary/50 font-bold focus-visible:ring-4 focus-visible:ring-primary/20 transition-all"
                    placeholder="Enter order total"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex justify-between">
                    <span>Delivery Distance</span>
                    <span className="text-primary font-black">KM</span>
                  </label>
                  <Input 
                    type="number"
                    step="0.1"
                    value={simDistance}
                    onChange={(e) => setSimDistance(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder-slate-500 h-12 rounded-2xl focus:border-primary/50 font-bold focus-visible:ring-4 focus-visible:ring-primary/20 transition-all"
                    placeholder="Enter customer distance"
                  />
                </div>
              </div>

              {/* Estimation breakdown output card */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4 relative min-h-[190px] flex flex-col justify-between shadow-inner">
                {simLoading && (
                  <div className="absolute inset-0 bg-slate-900/60 rounded-3xl flex items-center justify-center backdrop-blur-[2px] z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-slate-400 font-semibold">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-white">KSh {parseFloat(simSubtotal || "0").toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      Service Fee
                      {simResult?.metadata?.service_fee_tier && (
                        <span title={`Tier bounds: ${simResult.metadata.service_fee_tier.min} - ${simResult.metadata.service_fee_tier.max}`}>
                          <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-white">KSh {parseFloat(simResult?.service_fee || "0").toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      Delivery Fee
                      {simResult?.metadata?.delivery_fee_tier && (
                        <span title={`Distance bracket: ${simResult.metadata.delivery_fee_tier.min_km} - ${simResult.metadata.delivery_fee_tier.max_km} km`}>
                          <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-white">KSh {parseFloat(simResult?.delivery_fee || "0").toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      Surge Charge
                      {surgeActive && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Active</span>
                      )}
                    </span>
                    <span className={`font-bold ${surgeActive ? "text-amber-400 animate-pulse" : "text-white"}`}>
                      KSh {parseFloat(simResult?.surge_fee || "0").toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Est. Checkout Total</span>
                    <span className="text-2xl font-black text-white tracking-tight">
                      KSh {parseFloat(simResult?.total_amount || "0").toFixed(2)}
                    </span>
                  </div>
                  <Button 
                    onClick={runSimulator} 
                    size="icon" 
                    variant="ghost" 
                    className="text-slate-400 hover:text-white rounded-xl h-10 w-10 hover:bg-white/10"
                  >
                    <RotateCcw className="w-4.5 h-4.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
