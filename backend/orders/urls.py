from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AdminOrderListView,
    DeliveryQueueListView,
    OrderCustomerConfirmView,
    OrderDeliveryConfirmView,
    OrderDetailView,
    OrderListCreateView,
    OrderProcessPaymentView,
    OrderStatusUpdateView,
    OrderReviewsSubmitView,
    PricingPreviewView,
    AdminFeeRuleViewSet,
    ActiveDeliveryTimeSlotListView,
    AdminDeliveryTimeSlotViewSet,
)

router = DefaultRouter()
router.register("fee-rules", AdminFeeRuleViewSet, basename="fee-rule")
router.register("delivery-time-slots", AdminDeliveryTimeSlotViewSet, basename="delivery-time-slot")

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="order-list-create"),
    path("admin/", AdminOrderListView.as_view(), name="order-admin-list"),
    path("delivery-queue/", DeliveryQueueListView.as_view(), name="order-delivery-queue"),
    path("delivery-time-slots/", ActiveDeliveryTimeSlotListView.as_view(), name="active-delivery-time-slots"),
    path("pricing-preview/", PricingPreviewView.as_view(), name="order-pricing-preview"),
    path("admin/", include(router.urls)),
    path("<str:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<str:pk>/status/", OrderStatusUpdateView.as_view(), name="order-status-update"),
    path("<str:pk>/process-payment/", OrderProcessPaymentView.as_view(), name="order-process-payment"),
    path("<str:pk>/confirm-delivery/", OrderDeliveryConfirmView.as_view(), name="order-confirm-delivery"),
    path("<str:pk>/customer-confirm/", OrderCustomerConfirmView.as_view(), name="order-customer-confirm"),
    path("<str:pk>/reviews/", OrderReviewsSubmitView.as_view(), name="order-reviews-submit"),
]
