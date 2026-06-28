from decimal import Decimal
from .models import FeeRule

class PricingEngine:
    @staticmethod
    def calculate_fees(subtotal_amount, distance_km=0.0):
        """
        Evaluate subtotal and delivery distance against active database FeeRules.
        Returns exact Decimal splits and configuration metadata snapshots.
        """
        subtotal = Decimal(str(subtotal_amount))
        service_fee = Decimal("0.00")
        delivery_fee = Decimal("0.00")
        surge_fee = Decimal("0.00")
        metadata = {}

        # Load active rules ordered by registration sequence
        active_rules = FeeRule.objects.filter(is_active=True)

        for rule in active_rules:
            config = rule.rules_config
            if not config:
                continue

            # 1. Tiered Service Fee by Order Value
            if rule.code == "service_fee":
                # Expect rules_config to be an array of tiers:
                # [{"min": 0, "max": 500, "type": "fixed", "value": 120}, ...]
                for tier in config:
                    try:
                        min_val = Decimal(str(tier.get("min", 0)))
                        max_val = Decimal(str(tier.get("max"))) if tier.get("max") is not None else Decimal("Infinity")
                        
                        if min_val <= subtotal < max_val:
                            tier_type = tier.get("type", "fixed")
                            tier_value = Decimal(str(tier.get("value", 0)))
                            
                            if tier_type == "fixed":
                                service_fee = tier_value
                            elif tier_type == "percentage":
                                service_fee = (subtotal * tier_value) / Decimal("100.00")
                            
                            metadata["service_fee_tier"] = {
                                "min": float(min_val),
                                "max": float(max_val) if max_val != Decimal("Infinity") else None,
                                "type": tier_type,
                                "value": float(tier_value)
                            }
                            break
                    except Exception:
                        continue

            # 2. Tiered Delivery Fee by Distance
            elif rule.code == "delivery_fee":
                # Expect rules_config to be an array of distance tiers:
                # [{"min_km": 0, "max_km": 3, "default_val": 100}, ...]
                for tier in config:
                    try:
                        min_km = Decimal(str(tier.get("min_km", 0)))
                        max_km = Decimal(str(tier.get("max_km"))) if tier.get("max_km") is not None else Decimal("Infinity")
                        
                        if min_km <= Decimal(str(distance_km)) < max_km:
                            default_val = Decimal(str(tier.get("default_val", 0)))
                            delivery_fee = default_val
                            
                            metadata["delivery_fee_tier"] = {
                                "min_km": float(min_km),
                                "max_km": float(max_km) if max_km != Decimal("Infinity") else None,
                                "default_val": float(default_val)
                            }
                            break
                    except Exception:
                        continue

            # 3. Surge Fee (Fixed or Percentage)
            elif rule.code == "surge_fee":
                # Expect rules_config to be a flat configuration dict:
                # {"calculation_type": "fixed", "value": 100}
                try:
                    calc_type = config.get("calculation_type", "fixed")
                    val = Decimal(str(config.get("value", 0)))

                    if calc_type == "fixed":
                        surge_fee = val
                    elif calc_type == "percentage":
                        surge_fee = (subtotal * val) / Decimal("100.00")

                    metadata["surge_fee_config"] = {
                        "calculation_type": calc_type,
                        "value": float(val)
                    }
                except Exception:
                    continue

        total = subtotal + service_fee + delivery_fee + surge_fee
        return {
            "subtotal": subtotal.quantize(Decimal("0.01")),
            "service_fee": service_fee.quantize(Decimal("0.01")),
            "delivery_fee": delivery_fee.quantize(Decimal("0.01")),
            "surge_fee": surge_fee.quantize(Decimal("0.01")),
            "total_amount": total.quantize(Decimal("0.01")),
            "metadata": metadata
        }
