from django.core.cache import cache
from django.db.models import Count, Sum
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from catalog.models import Product
from orders.models import Order

from .permissions import IsAdminRole

CACHE_KEY = "spiro:admin_dashboard_analytics"
CACHE_TIMEOUT_SECONDS = 300


class DashboardTotalsSerializer(serializers.Serializer):
    users = serializers.IntegerField()
    products = serializers.IntegerField()
    orders = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)


class RecentOrderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    created_at = serializers.DateTimeField()
    user__email = serializers.EmailField()


class RecentUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    is_active = serializers.BooleanField()
    date_joined = serializers.DateTimeField()


class DashboardAnalyticsSerializer(serializers.Serializer):
    totals = DashboardTotalsSerializer()
    status_breakdown = serializers.DictField(child=serializers.IntegerField())
    recent_orders = RecentOrderSerializer(many=True)
    recent_users = RecentUserSerializer(many=True)


def _fetch_analytics() -> dict:
    status_counts = {
        item["status"]: item["count"]
        for item in Order.objects.values("status").annotate(count=Count("id"))
    }

    recent_orders = (
        Order.objects.select_related("user")
        .order_by("-created_at")[:5]
        .values("id", "status", "total_amount", "created_at", "user__email")
    )

    recent_users = User.objects.order_by("-date_joined")[:5].values(
        "id", "email", "first_name", "last_name", "is_active", "date_joined"
    )

    revenue = (
        Order.objects.filter(
            status__in=[Order.PAID, Order.SHIPPED, Order.DELIVERED_PENDING, Order.DELIVERED]
        ).aggregate(total=Sum("total_amount"))["total"]
        or 0
    )

    return {
        "totals": {
            "users": User.objects.filter(is_active=True).count(),
            "products": Product.objects.filter(is_active=True).count(),
            "orders": Order.objects.count(),
            "revenue": revenue,
        },
        "status_breakdown": status_counts,
        "recent_orders": list(recent_orders),
        "recent_users": list(recent_users),
    }


@extend_schema(
    summary="Admin Dashboard Analytics",
    description="Returns aggregate totals, order status breakdown, and recent orders/users for the admin dashboard. Cached for 5 minutes.",
    responses=DashboardAnalyticsSerializer,
)
class AdminDashboardAnalyticsView(APIView):
    serializer_class = DashboardAnalyticsSerializer
    permission_classes = [IsAdminRole]

    def get(self, request):
        payload = cache.get_or_set(CACHE_KEY, _fetch_analytics, timeout=CACHE_TIMEOUT_SECONDS)
        return Response(payload)