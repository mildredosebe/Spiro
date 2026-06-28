from django.db import models
from django.conf import settings
from django.utils.crypto import get_random_string

from catalog.models import Product


class Order(models.Model):
	PENDING = "pending"
	PAID = "paid"
	SHIPPED = "shipped"
	DELIVERED_PENDING = "delivered_pending"
	DELIVERED = "delivered"
	CANCELLED = "cancelled"
	PAYMENT_PENDING = "payment_pending"
	PAYMENT_PROCESSING = "payment_processing"
	PAYMENT_PAID = "payment_paid"
	PAYMENT_FAILED = "payment_failed"
	STATUS_CHOICES = [
		(PENDING, "Pending"),
		(PAID, "Paid"),
		(SHIPPED, "Shipped"),
		(DELIVERED_PENDING, "Delivered Pending Confirmation"),
		(DELIVERED, "Delivered"),
		(CANCELLED, "Cancelled"),
	]
	PAYMENT_STATUS_CHOICES = [
		(PAYMENT_PENDING, "Payment Pending"),
		(PAYMENT_PROCESSING, "Payment Processing"),
		(PAYMENT_PAID, "Payment Paid"),
		(PAYMENT_FAILED, "Payment Failed"),
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
	order_number = models.CharField(max_length=20, unique=True, null=True, editable=False, db_index=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
	payment_method = models.CharField(max_length=50, default="card")
	payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_PENDING)
	payment_reference = models.CharField(max_length=64, blank=True)
	payment_failure_reason = models.CharField(max_length=255, blank=True)
	paid_at = models.DateTimeField(null=True, blank=True)
	subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	surge_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	applied_fees_metadata = models.JSONField(default=dict, blank=True)

	shipping_full_name = models.CharField(max_length=150)
	shipping_phone = models.CharField(max_length=32)
	shipping_address = models.CharField(max_length=255)
	shipping_city = models.CharField(max_length=80)
	shipping_postal_code = models.CharField(max_length=20)
	delivery_recipient_name = models.CharField(max_length=150, blank=True)
	delivery_recipient_signature = models.CharField(max_length=255, blank=True)
	delivery_notes = models.TextField(blank=True)
	delivered_at = models.DateTimeField(null=True, blank=True)
	customer_confirmed_at = models.DateTimeField(null=True, blank=True)
	delivered_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="delivered_orders",
	)

	is_scheduled = models.BooleanField(default=False)
	scheduled_delivery_date = models.DateField(null=True, blank=True)
	scheduled_delivery_slot = models.ForeignKey(
		'DeliveryTimeSlot', on_delete=models.SET_NULL, null=True, blank=True
	)

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return f"Order<{self.order_number or self.id}>"
	
	def save(self, *args, **kwargs):
		if not self.order_number:
			# Generate a unique KTS-XXXXXX string
			while True:
				new_number = f"KTS-{get_random_string(length=6, allowed_chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}"
				if not Order.objects.filter(order_number=new_number).exists():
					self.order_number = new_number
					break
		super().save(*args, **kwargs)


class OrderItem(models.Model):
	order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
	product = models.ForeignKey(Product, on_delete=models.PROTECT)
	quantity = models.PositiveIntegerField(default=1)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)

	def __str__(self):
		return f"OrderItem<{self.order_id}:{self.product_id}>"


class DeliveryTimeSlot(models.Model):
	name = models.CharField(max_length=100)
	is_active = models.BooleanField(default=True)
	sort_order = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ["sort_order", "id"]

	def __str__(self):
		return self.name


class FeeRule(models.Model):
	FEE_TYPES = [
		("fixed", "Flat/Fixed Fee"),
		("percentage", "Flat Percentage"),
		("tiered_order_value", "Tiered by Order Value"),
		("tiered_distance", "Tiered by Delivery Distance"),
	]

	name = models.CharField(max_length=100)
	code = models.SlugField(max_length=50, unique=True)
	fee_type = models.CharField(max_length=30, choices=FEE_TYPES)
	description = models.TextField(blank=True)
	is_active = models.BooleanField(default=True)
	always_applied = models.BooleanField(default=True)
	rules_config = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["id"]

	def __str__(self):
		return f"{self.name} ({self.fee_type})"
