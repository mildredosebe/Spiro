from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product

from .models import Cart, CartItem
from .serializers import CartSerializer


def _get_cart_with_items(user) -> Cart:
	"""get_or_create + prefetch_related chained in one call silently drops the prefetch, so this splits the two operations."""
	cart, _ = Cart.objects.get_or_create(user=user)
	return Cart.objects.prefetch_related("items__product").get(pk=cart.pk)


@extend_schema(summary="Get Cart", tags=["cart"])
class CartView(APIView):
	serializer_class = CartSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		cart = _get_cart_with_items(request.user)
		return Response(CartSerializer(cart).data)


@extend_schema(summary="Add or Update Cart Item", tags=["cart"])
class CartItemUpsertView(APIView):
	serializer_class = CartSerializer
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request):
		product_id = request.data.get("product_id")
		try:
			quantity = int(request.data.get("quantity", 1))
		except (TypeError, ValueError):
			return Response({"detail": "Quantity must be a number"}, status=status.HTTP_400_BAD_REQUEST)

		if quantity < 1:
			return Response({"detail": "Quantity must be at least 1"}, status=status.HTTP_400_BAD_REQUEST)

		product = Product.objects.filter(id=product_id, is_active=True).first()
		if not product:
			return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

		cart, _ = Cart.objects.get_or_create(user=request.user)
		CartItem.objects.update_or_create(
			cart=cart,
			product=product,
			defaults={"quantity": quantity},
		)

		return Response(CartSerializer(_get_cart_with_items(request.user)).data)


@extend_schema(summary="Remove Cart Item", tags=["cart"])
class CartItemDeleteView(APIView):
	serializer_class = CartSerializer
	permission_classes = [permissions.IsAuthenticated]

	def delete(self, request, item_id):
		cart, _ = Cart.objects.get_or_create(user=request.user)
		item = get_object_or_404(CartItem, id=item_id, cart=cart)
		item.delete()

		return Response(CartSerializer(_get_cart_with_items(request.user)).data)


@extend_schema(summary="Sync Guest Cart", description="Bulk-merges a list of items (e.g. from a guest's local cart) into the authenticated user's cart.", tags=["cart"])
class CartSyncView(APIView):
	serializer_class = CartSerializer
	permission_classes = [permissions.IsAuthenticated]

	def post(self, request):
		items_data = request.data.get("items", [])
		cart, _ = Cart.objects.get_or_create(user=request.user)

		product_ids = [
			d.get("product_id") for d in items_data if d.get("product_id") and d.get("quantity")
		]
		products_map = {
			p.id: p for p in Product.objects.filter(id__in=product_ids, is_active=True)
		}

		for item_data in items_data:
			product_id = item_data.get("product_id")
			quantity = item_data.get("quantity")
			if not product_id or not quantity:
				continue
			product = products_map.get(product_id)
			if not product:
				continue
			CartItem.objects.update_or_create(
				cart=cart,
				product=product,
				defaults={"quantity": quantity},
			)

		return Response(CartSerializer(_get_cart_with_items(request.user)).data)