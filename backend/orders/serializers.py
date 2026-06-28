from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from catalog.models import Product

from .models import Order, OrderItem, FeeRule, DeliveryTimeSlot
from .services import PricingEngine

class DeliveryTimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryTimeSlot
        fields = ["id", "name", "is_active", "sort_order"]



class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image_url = serializers.CharField(source="product.image_url", read_only=True)
    product_category_type = serializers.CharField(source="product.category.category_type", read_only=True)
    product_category_name = serializers.CharField(source="product.category.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_image_url",
            "product_category_type",
            "product_category_name",
            "quantity",
            "unit_price",
        ]


class OrderSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='order_number', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    delivered_by_email = serializers.CharField(source="delivered_by.email", read_only=True)
    scheduled_delivery_slot_name = serializers.CharField(source="scheduled_delivery_slot.name", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "is_scheduled",
            "scheduled_delivery_date",
            "scheduled_delivery_slot",
            "scheduled_delivery_slot_name",
            "status",
            "payment_method",
            "payment_status",
            "payment_reference",
            "payment_failure_reason",
            "paid_at",
            "subtotal",
            "service_fee",
            "delivery_fee",
            "surge_fee",
            "total_amount",
            "applied_fees_metadata",
            "shipping_full_name",
            "shipping_phone",
            "shipping_address",
            "shipping_city",
            "shipping_postal_code",
            "delivery_recipient_name",
            "delivery_recipient_signature",
            "delivery_notes",
            "delivered_at",
            "customer_confirmed_at",
            "delivered_by_email",
            "items",
            "user_email",
            "created_at",
        ]


class UpdateOrderStatusSerializer(serializers.ModelSerializer):
    ALLOWED_TRANSITIONS = {
        Order.PENDING: {Order.PAID, Order.CANCELLED},
        Order.PAID: {Order.SHIPPED, Order.CANCELLED},
        Order.SHIPPED: {Order.CANCELLED},
        Order.DELIVERED_PENDING: set(),
        Order.DELIVERED: set(),
        Order.CANCELLED: set(),
    }

    class Meta:
        model = Order
        fields = ["status"]

    def validate_status(self, value):
        current_status = self.instance.status if self.instance else None
        if not current_status:
            return value

        if value == current_status:
            return value

        if value in {Order.DELIVERED_PENDING, Order.DELIVERED}:
            raise serializers.ValidationError(
                "Use delivery confirmation endpoints to progress this status."
            )

        allowed_next = self.ALLOWED_TRANSITIONS.get(current_status, set())
        if value not in allowed_next:
            raise serializers.ValidationError(
                f"Invalid status transition from '{current_status}' to '{value}'."
            )
        return value


class DeliveryConfirmationSerializer(serializers.Serializer):
    recipient_name = serializers.CharField(max_length=150)
    recipient_signature = serializers.CharField(max_length=255)
    delivery_notes = serializers.CharField(required=False, allow_blank=True)


class CreateOrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CreateOrderSerializer(serializers.Serializer):
    payment_method = serializers.CharField(max_length=50)
    shipping_full_name = serializers.CharField(max_length=150)
    shipping_phone = serializers.CharField(max_length=32)
    shipping_address = serializers.CharField(max_length=255)
    shipping_city = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    shipping_postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    distance_km = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0.0)
    is_scheduled = serializers.BooleanField(required=False, default=False)
    scheduled_delivery_date = serializers.DateField(required=False, allow_null=True)
    scheduled_delivery_slot_id = serializers.IntegerField(required=False, allow_null=True)
    items = CreateOrderItemInputSerializer(many=True)

    def validate(self, attrs):
        phone = (attrs.get("shipping_phone") or "").strip()
        address = (attrs.get("shipping_address") or "").strip()

        if not phone:
            raise serializers.ValidationError({"shipping_phone": "Phone number is required."})

        if not address:
            raise serializers.ValidationError({"shipping_address": "Address is required."})

        if attrs.get("is_scheduled"):
            if not attrs.get("scheduled_delivery_date"):
                raise serializers.ValidationError({"scheduled_delivery_date": "Date is required for scheduled orders."})
            if not attrs.get("scheduled_delivery_slot_id"):
                raise serializers.ValidationError({"scheduled_delivery_slot_id": "Time slot is required for scheduled orders."})

        attrs["shipping_phone"] = phone
        attrs["shipping_address"] = address
        attrs["shipping_full_name"] = (attrs.get("shipping_full_name") or "").strip()
        attrs["shipping_city"] = (attrs.get("shipping_city") or "").strip()
        attrs["shipping_postal_code"] = (attrs.get("shipping_postal_code") or "").strip()
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        items_data = validated_data.pop("items")
        distance_km = validated_data.pop("distance_km", Decimal("0.00"))

        product_ids = [item["product_id"] for item in items_data]
        products_map = {
            p.id: p
            for p in Product.objects.filter(id__in=product_ids, is_active=True)
        }

        with transaction.atomic():
            slot_id = validated_data.pop("scheduled_delivery_slot_id", None)
            slot = None
            if slot_id:
                slot = DeliveryTimeSlot.objects.filter(id=slot_id).first()
                if not slot:
                    raise serializers.ValidationError({"scheduled_delivery_slot_id": "Invalid time slot."})

            order = Order.objects.create(
                user=user,
                status=Order.PENDING,
                payment_status=Order.PAYMENT_PENDING,
                scheduled_delivery_slot=slot,
                **validated_data,
            )
            subtotal = Decimal("0.00")

            order_items = []
            for item in items_data:
                product = products_map.get(item["product_id"])
                if not product:
                    raise serializers.ValidationError(
                        {"items": f"Product {item['product_id']} is unavailable."}
                    )
                qty = item["quantity"]
                subtotal += product.price * qty
                order_items.append(
                    OrderItem(
                        order=order,
                        product=product,
                        quantity=qty,
                        unit_price=product.price,
                    )
                )

            OrderItem.objects.bulk_create(order_items)

            # Core Pricing Calculations
            calc = PricingEngine.calculate_fees(subtotal, distance_km)
            order.subtotal = calc["subtotal"]
            order.service_fee = calc["service_fee"]
            order.delivery_fee = calc["delivery_fee"]
            order.surge_fee = calc["surge_fee"]
            order.total_amount = calc["total_amount"]
            order.applied_fees_metadata = calc["metadata"]
            
            order.save(update_fields=[
                "subtotal",
                "service_fee",
                "delivery_fee",
                "surge_fee",
                "total_amount",
                "applied_fees_metadata"
            ])

        return order


class ProcessPaymentSerializer(serializers.Serializer):
    card_last4 = serializers.RegexField(regex=r"^\d{4}$", required=False)
    simulate_failure = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        order: Order = self.context["order"]

        if order.payment_method == "card" and not attrs.get("card_last4"):
            attrs["card_last4"] = "4242"

        return attrs


class FeeRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeRule
        fields = [
            "id",
            "name",
            "code",
            "fee_type",
            "description",
            "is_active",
            "always_applied",
            "rules_config",
            "created_at",
            "updated_at",
        ]
