import uuid

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from catalog.serializers import SubmitOrderReviewsSerializer
from core.permissions import IsAdminOrDeliveryRole, IsAdminRole

from .models import Order, FeeRule, DeliveryTimeSlot
from .serializers import (
	CreateOrderSerializer,
	DeliveryConfirmationSerializer,
	OrderSerializer,
	ProcessPaymentSerializer,
	UpdateOrderStatusSerializer,
	FeeRuleSerializer,
	DeliveryTimeSlotSerializer,
)
from .services import PricingEngine


@extend_schema_view(
	get=extend_schema(summary="List My Orders", description="Returns the authenticated customer's order history."),
	post=extend_schema(summary="Create Order", description="Places a new order for one or more Spiro motorcycles or accessories."),
)
class OrderListCreateView(generics.ListCreateAPIView):
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		return (
			Order.objects
			.select_related("user", "delivered_by")
			.prefetch_related("items__product__category")
			.filter(user=self.request.user)
			.order_by("-created_at")
		)

	def get_serializer_class(self):
		if self.request.method == "POST":
			return CreateOrderSerializer
		return OrderSerializer

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		order = serializer.save()
		output = OrderSerializer(order)
		return Response(output.data, status=status.HTTP_201_CREATED)


@extend_schema(summary="Get Order Details", description="Retrieves a single order by its order number.")
class OrderDetailView(generics.RetrieveAPIView):
	serializer_class = OrderSerializer
	permission_classes = [permissions.IsAuthenticated]
	lookup_field = "order_number"
	lookup_url_kwarg = "pk"

	def get_queryset(self):
		queryset = (
			Order.objects
			.select_related("user", "delivered_by")
			.prefetch_related("items__product__category")
		)
		if self.request.user.is_staff:
			return queryset.all()
		return queryset.filter(user=self.request.user)


@extend_schema(summary="Update Order Status", description="Admin-only: updates the status of an order (e.g. processing, shipped, cancelled).")
class OrderStatusUpdateView(generics.UpdateAPIView):
	serializer_class = UpdateOrderStatusSerializer
	permission_classes = [IsAdminRole]
	queryset = Order.objects.all()
	http_method_names = ["patch"]
	lookup_field = "order_number"
	lookup_url_kwarg = "pk"

	def update(self, request, *args, **kwargs):
		partial = kwargs.pop('partial', False)
		instance = self.get_object()
		serializer = self.get_serializer(instance, data=request.data, partial=partial)
		serializer.is_valid(raise_exception=True)
		self.perform_update(serializer)
		
		return Response(OrderSerializer(instance).data)


@extend_schema(summary="Confirm Delivery", description="Delivery agent or admin marks a shipped order as delivered, capturing recipient name and signature.")
class OrderDeliveryConfirmView(APIView):
	serializer_class = DeliveryConfirmationSerializer
	permission_classes = [IsAdminOrDeliveryRole]

	def post(self, request, pk):
		order = Order.objects.filter(order_number=pk).first()
		if not order:
			return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

		if order.status != Order.SHIPPED:
			return Response(
				{"detail": "Only shipped orders can be confirmed as delivered."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		serializer = DeliveryConfirmationSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		order.delivery_recipient_name = serializer.validated_data["recipient_name"]
		order.delivery_recipient_signature = serializer.validated_data["recipient_signature"]
		order.delivery_notes = serializer.validated_data.get("delivery_notes", "")
		order.delivered_at = timezone.now()
		order.delivered_by = request.user
		order.status = Order.DELIVERED_PENDING
		order.save(
			update_fields=[
				"delivery_recipient_name",
				"delivery_recipient_signature",
				"delivery_notes",
				"delivered_at",
				"delivered_by",
				"status",
				"updated_at",
			]
		)

		return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


@extend_schema(summary="Customer Confirms Delivery", description="Customer confirms they received their order, finalizing it as delivered.")
class OrderCustomerConfirmView(APIView):
	serializer_class = OrderSerializer
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, pk):
		order = Order.objects.filter(order_number=pk).first()
		if not order:
			return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

		if order.user_id != request.user.id:
			return Response({"detail": "You can only confirm your own orders."}, status=status.HTTP_403_FORBIDDEN)

		if order.status != Order.DELIVERED_PENDING:
			return Response(
				{"detail": "Order is not awaiting customer confirmation."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		order.status = Order.DELIVERED
		order.customer_confirmed_at = timezone.now()
		order.save(update_fields=["status", "customer_confirmed_at", "updated_at"])

		return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


@extend_schema(summary="Submit Order Reviews", description="Customer submits product reviews for items in a delivered order.")
class OrderReviewsSubmitView(APIView):
	serializer_class = SubmitOrderReviewsSerializer
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, pk):
		order = Order.objects.prefetch_related("items__product").filter(order_number=pk).first()
		if not order:
			return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

		if order.user_id != request.user.id:
			return Response({"detail": "You can only review your own orders."}, status=status.HTTP_403_FORBIDDEN)

		if order.status != Order.DELIVERED:
			return Response(
				{"detail": "Reviews are available after delivery is confirmed."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		serializer = SubmitOrderReviewsSerializer(data=request.data, context={"order": order, "request": request})
		serializer.is_valid(raise_exception=True)
		serializer.save()

		return Response({"detail": "Reviews saved successfully."}, status=status.HTTP_200_OK)


@extend_schema(summary="Process Payment", description="Processes payment for an order via card (simulated) or routes to M-Pesa STK push.")
class OrderProcessPaymentView(APIView):
	serializer_class = ProcessPaymentSerializer
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request, pk):
		with transaction.atomic():
			order = (
				Order.objects.select_for_update()
				.prefetch_related("items")
				.filter(order_number=pk)
				.first()
			)
			if not order:
				return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

			if order.user_id != request.user.id and not request.user.is_staff:
				return Response({"detail": "You can only pay for your own orders."}, status=status.HTTP_403_FORBIDDEN)

			if order.status in {Order.CANCELLED, Order.SHIPPED, Order.DELIVERED_PENDING, Order.DELIVERED}:
				return Response(
					{"detail": "This order cannot be paid in its current status."},
					status=status.HTTP_400_BAD_REQUEST,
				)

			if order.payment_status == Order.PAYMENT_PAID:
				return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

			if order.payment_method == "mpesa":
				return Response(
					{
						"detail": "Use POST /api/payments/mpesa/stk-push/ to initiate M-Pesa payment.",
						"stk_push_url": "/api/payments/mpesa/stk-push/",
					},
					status=status.HTTP_400_BAD_REQUEST,
				)

			serializer = ProcessPaymentSerializer(data=request.data, context={"order": order})
			serializer.is_valid(raise_exception=True)

			order.payment_status = Order.PAYMENT_PROCESSING
			order.save(update_fields=["payment_status", "updated_at"])

			if serializer.validated_data.get("simulate_failure", False):
				order.payment_status = Order.PAYMENT_FAILED
				order.payment_failure_reason = "Payment was declined by provider."
				order.status = Order.PENDING
				order.save(update_fields=["payment_status", "payment_failure_reason", "status", "updated_at"])
				return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

			items = list(order.items.all())
			product_ids = [item.product_id for item in items]
			products = Product.objects.select_for_update().filter(id__in=product_ids).in_bulk()

			for item in items:
				product = products.get(item.product_id)
				if not product or not product.is_active:
					order.payment_status = Order.PAYMENT_FAILED
					order.payment_failure_reason = f"{item.product_id} is unavailable."
					order.status = Order.PENDING
					order.save(update_fields=["payment_status", "payment_failure_reason", "status", "updated_at"])
					return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
				if product.stock < item.quantity:
					order.payment_status = Order.PAYMENT_FAILED
					order.payment_failure_reason = f"Insufficient stock for {product.name}."
					order.status = Order.PENDING
					order.save(update_fields=["payment_status", "payment_failure_reason", "status", "updated_at"])
					return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

			for item in items:
				Product.objects.filter(pk=item.product_id).update(stock=F("stock") - item.quantity)

			order.payment_status = Order.PAYMENT_PAID
			order.payment_failure_reason = ""
			order.status = Order.PAID
			order.paid_at = timezone.now()
			if not order.payment_reference:
				order.payment_reference = f"PAY-{uuid.uuid4().hex[:12].upper()}"
			order.save(
				update_fields=[
					"payment_status",
					"payment_failure_reason",
					"status",
					"paid_at",
					"payment_reference",
					"updated_at",
				]
			)

		return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


@extend_schema(summary="List All Orders (Admin)", description="Admin-only: lists every order across all customers.")
class AdminOrderListView(generics.ListAPIView):
	serializer_class = OrderSerializer
	permission_classes = [IsAdminRole]

	def get_queryset(self):
		return (
			Order.objects
			.select_related("user", "delivered_by")
			.prefetch_related("items__product__category")
			.order_by("-created_at")
		)


@extend_schema(summary="Delivery Queue", description="Lists orders that are shipped or pending/confirmed delivery, for delivery agents and admins.")
class DeliveryQueueListView(generics.ListAPIView):
	serializer_class = OrderSerializer
	permission_classes = [IsAdminOrDeliveryRole]

	def get_queryset(self):
		return (
			Order.objects
			.select_related("user", "delivered_by")
			.prefetch_related("items__product__category")
			.filter(status__in=[Order.SHIPPED, Order.DELIVERED_PENDING, Order.DELIVERED])
			.order_by("-created_at")
		)


@extend_schema(summary="Preview Order Pricing", description="Calculates delivery fees and totals for a given subtotal and distance, before placing an order.")
class PricingPreviewView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request):
		subtotal = request.data.get("subtotal", 0.0)
		distance = request.data.get("distance_km", 0.0)
		try:
			calculation = PricingEngine.calculate_fees(subtotal, distance)
			return Response(calculation, status=status.HTTP_200_OK)
		except Exception as e:
			return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
	list=extend_schema(summary="List Fee Rules"),
	create=extend_schema(summary="Create Fee Rule"),
	retrieve=extend_schema(summary="Get Fee Rule"),
	update=extend_schema(summary="Update Fee Rule"),
	partial_update=extend_schema(summary="Partially Update Fee Rule"),
	destroy=extend_schema(summary="Delete Fee Rule"),
)
class AdminFeeRuleViewSet(viewsets.ModelViewSet):
	serializer_class = FeeRuleSerializer
	permission_classes = [IsAdminRole]
	queryset = FeeRule.objects.all()


@extend_schema(summary="List Active Delivery Time Slots", description="Returns delivery time slots customers can choose from at checkout.")
class ActiveDeliveryTimeSlotListView(generics.ListAPIView):
	serializer_class = DeliveryTimeSlotSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		return DeliveryTimeSlot.objects.filter(is_active=True).order_by("sort_order", "id")


@extend_schema_view(
	list=extend_schema(summary="List Delivery Time Slots (Admin)"),
	create=extend_schema(summary="Create Delivery Time Slot"),
	retrieve=extend_schema(summary="Get Delivery Time Slot"),
	update=extend_schema(summary="Update Delivery Time Slot"),
	partial_update=extend_schema(summary="Partially Update Delivery Time Slot"),
	destroy=extend_schema(summary="Delete Delivery Time Slot"),
)
class AdminDeliveryTimeSlotViewSet(viewsets.ModelViewSet):
	serializer_class = DeliveryTimeSlotSerializer
	permission_classes = [IsAdminRole]
	queryset = DeliveryTimeSlot.objects.all()