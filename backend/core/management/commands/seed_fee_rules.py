from django.core.management.base import BaseCommand

from orders.models import FeeRule


class Command(BaseCommand):
    help = "Seed dynamic fee rules (service fee, delivery fee, surge fee)"

    def handle(self, *args, **options):
        self.stdout.write("Seeding Spiro dynamic fee rules...")

        # 1. Tiered Service Fee
        _, created = FeeRule.objects.update_or_create(
            code="service_fee",
            defaults={
                "name": "Service Fee",
                "fee_type": "tiered_order_value",
                "description": "Covers order processing, shopper time, customer support, and app operations.",
                "is_active": True,
                "always_applied": True,
                "rules_config": [
                    {"min": 0, "max": 500, "type": "fixed", "value": 120},
                    {"min": 500, "max": 1000, "type": "fixed", "value": 80},
                    {"min": 1000, "max": 5000, "type": "percentage", "value": 7},
                    {"min": 5000, "max": None, "type": "percentage", "value": 5},
                ],
            },
        )
        self.stdout.write(f"  Service Fee {'created' if created else 'updated'}")

        # 2. Tiered Delivery Fee
        _, created = FeeRule.objects.update_or_create(
            code="delivery_fee",
            defaults={
                "name": "Delivery Fee",
                "fee_type": "tiered_distance",
                "description": "Covers rider delivery and logistics based on distance from the store.",
                "is_active": True,
                "always_applied": True,
                "rules_config": [
                    {"min_km": 0, "max_km": 3, "min_val": 80, "max_val": 120, "default_val": 100},
                    {"min_km": 3, "max_km": 8, "min_val": 120, "max_val": 200, "default_val": 150},
                    {"min_km": 8, "max_km": 15, "min_val": 200, "max_val": 350, "default_val": 250},
                ],
            },
        )
        self.stdout.write(f"  Delivery Fee {'created' if created else 'updated'}")

        # 3. Surge Fee (inactive by default)
        _, created = FeeRule.objects.update_or_create(
            code="surge_fee",
            defaults={
                "name": "Surge Fee",
                "fee_type": "fixed",
                "description": "Applies during high demand, bad weather, or peak hours.",
                "is_active": False,
                "always_applied": False,
                "rules_config": {
                    "calculation_type": "fixed",
                    "value": 100,
                    "description": "Applies during high demand or weather triggers",
                },
            },
        )
        self.stdout.write(f"  Surge Fee {'created' if created else 'updated'}")

        self.stdout.write(self.style.SUCCESS("Fee rules seeded successfully!"))
