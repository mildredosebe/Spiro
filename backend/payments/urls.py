from django.urls import path

from .views import MpesaCallbackView, MpesaStatusView, StkPushInitView

urlpatterns = [
    path("mpesa/stk-push/", StkPushInitView.as_view(), name="mpesa-stk-push"),
    path("mpesa/callback/", MpesaCallbackView.as_view(), name="mpesa-callback"),
    path(
        "mpesa/status/<str:checkout_request_id>/",
        MpesaStatusView.as_view(),
        name="mpesa-status",
    ),
]
