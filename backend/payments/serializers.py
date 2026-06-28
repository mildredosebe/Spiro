"""
payments/serializers.py
─────────────────────────
Input/output serializers for the payments app.
"""

from rest_framework import serializers

from .models import MpesaTransaction
from .mpesa_client import normalise_phone


class StkPushInitSerializer(serializers.Serializer):
    """Validates a request to initiate an M-Pesa STK Push."""

    order_id = serializers.CharField()
    phone = serializers.CharField(max_length=20)

    def validate_phone(self, value: str) -> str:
        try:
            return normalise_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class MpesaTransactionSerializer(serializers.ModelSerializer):
    """Read-only serializer — used for the status polling endpoint."""

    order_payment_status = serializers.CharField(source="order.payment_status", read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)

    class Meta:
        model = MpesaTransaction
        fields = [
            "checkout_request_id",
            "status",
            "result_code",
            "result_desc",
            "mpesa_receipt_number",
            "transaction_date",
            "order_status",
            "order_payment_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
