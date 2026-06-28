from django.urls import path

from .views import CartItemDeleteView, CartItemUpsertView, CartSyncView, CartView

urlpatterns = [
    path("", CartView.as_view(), name="cart-detail"),
    path("items/", CartItemUpsertView.as_view(), name="cart-item-upsert"),
    path("items/<int:item_id>/", CartItemDeleteView.as_view(), name="cart-item-delete"),
    path("sync/", CartSyncView.as_view(), name="cart-sync"),
]
