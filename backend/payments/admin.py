from django.contrib import admin

from .models import MpesaTransaction


@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "order",
        "phone_number",
        "amount",
        "status",
        "mpesa_receipt_number",
        "result_code",
        "created_at",
        "updated_at",
    ]
    list_filter = ["status"]
    search_fields = [
        "checkout_request_id",
        "merchant_request_id",
        "mpesa_receipt_number",
        "phone_number",
        "order__id",
    ]
    readonly_fields = [
        "order",
        "phone_number",
        "amount",
        "merchant_request_id",
        "checkout_request_id",
        "status",
        "result_code",
        "result_desc",
        "mpesa_receipt_number",
        "transaction_date",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]
