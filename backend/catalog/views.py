from django.core.cache import cache
from django.db.models import Avg, Count, ProtectedError
from django.db.models.functions import Coalesce
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, permissions, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .cloudinary_utils import delete_image
from .features.daily_products.service import get_daily_products
from .models import Category, Product, ProductImage
from .serializers import CategorySerializer, ProductDetailSerializer, ProductSerializer

CATEGORIES_CACHE_KEY = "kitas:categories_public"
CATEGORIES_CACHE_TIMEOUT_SECONDS = 3600
PRODUCT_DETAIL_CACHE_TIMEOUT_SECONDS = 1800


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class CatalogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@extend_schema_view(
    list=extend_schema(summary="List Categories", tags=["categories"]),
    create=extend_schema(summary="Create Category", tags=["categories"]),
    retrieve=extend_schema(summary="Get Category", tags=["categories"]),
    update=extend_schema(summary="Update Category", tags=["categories"]),
    partial_update=extend_schema(summary="Partially Update Category", tags=["categories"]),
    destroy=extend_schema(summary="Delete Category", tags=["categories"]),
)
class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        queryset = Category.objects.all().order_by("name")
        if not (self.request.user and self.request.user.is_staff):
            queryset = queryset.filter(is_active=True)
        return queryset

    def list(self, request, *args, **kwargs):
        is_staff = request.user and request.user.is_staff
        if is_staff:
            return super().list(request, *args, **kwargs)

        cached_data = cache.get(CATEGORIES_CACHE_KEY)
        if cached_data is not None:
            return Response(cached_data)

        response = super().list(request, *args, **kwargs)
        cache.set(CATEGORIES_CACHE_KEY, response.data, timeout=CATEGORIES_CACHE_TIMEOUT_SECONDS)
        return response

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        image_public_id = instance.image_public_id
        try:
            self.perform_destroy(instance)
            delete_image(image_public_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            instance.is_active = False
            instance.save()
            return Response(
                {"detail": "Category has linked products. It has been deactivated instead of deleted."},
                status=status.HTTP_200_OK,
            )


@extend_schema_view(
    list=extend_schema(summary="List Products", tags=["products"]),
    create=extend_schema(summary="Create Product", tags=["products"]),
    retrieve=extend_schema(summary="Get Product", tags=["products"]),
    update=extend_schema(summary="Update Product", tags=["products"]),
    partial_update=extend_schema(summary="Partially Update Product", tags=["products"]),
    destroy=extend_schema(summary="Delete Product", tags=["products"]),
)
class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = CatalogPagination

    def get_queryset(self):
        queryset = (
            Product.objects
            .select_related("category")
            .prefetch_related("images")
            .annotate(
                average_rating=Coalesce(Avg("reviews__rating"), 0.0),
                reviews_count=Count("reviews", distinct=True),
            )
        )

        if not (self.request.user and self.request.user.is_staff):
            queryset = queryset.filter(is_active=True)

        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        price_min = self.request.query_params.get("price_min")
        price_max = self.request.query_params.get("price_max")

        if category:
            queryset = queryset.filter(category__slug=category)
        if search:
            queryset = queryset.filter(name__icontains=search)
        if price_min:
            queryset = queryset.filter(price__gte=price_min)
        if price_max:
            queryset = queryset.filter(price__lte=price_max)

        ordering = self.request.query_params.get("ordering", "-created_at")
        valid_orderings = {
            "price": "price",
            "-price": "-price",
            "rating": "-average_rating",
            "-created_at": "-created_at",
            "popularity": "-reviews_count",
        }
        order_field = valid_orderings.get(ordering, "-created_at")
        return queryset.order_by(order_field)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductSerializer

    def list(self, request, *args, **kwargs):
        daily_flag = request.query_params.get("daily", "").lower() in {"1", "true", "yes"}
        if not daily_flag:
            return super().list(request, *args, **kwargs)

        queryset = self.filter_queryset(self.get_queryset())
        ordered_products = get_daily_products(queryset)
        page = self.paginate_queryset(ordered_products)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(ordered_products, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        is_staff = request.user and request.user.is_staff
        if is_staff:
            return super().retrieve(request, *args, **kwargs)

        product_id = kwargs.get("pk")
        cache_key = f"kitas:product_detail:{product_id}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        response = super().retrieve(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=PRODUCT_DETAIL_CACHE_TIMEOUT_SECONDS)
        return response

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            delete_image(instance.image_public_id)
            for img in instance.images.all():
                delete_image(img.public_id)
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            instance.is_active = False
            instance.save()
            return Response(
                {"detail": "Product is linked to existing orders. It has been deactivated instead of deleted."},
                status=status.HTTP_200_OK,
            )


@extend_schema(summary="Delete Product Image", tags=["products"])
class ProductImageDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return ProductImage.objects.filter(product_id=self.kwargs["product_id"])

    def perform_destroy(self, instance):
        delete_image(instance.public_id)
        instance.delete()