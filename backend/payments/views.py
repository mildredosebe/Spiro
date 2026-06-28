import logging
from decimal import Decimal

import requests
from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order

from . import mpesa_client
from .models import MpesaTransaction
from .serializers import MpesaTransactionSerializer, StkPushInitSerializer

logger = logging.getLogger("payments")

DARAJA_QUERY_AFTER_SECONDS = 45


def _result_code_to_status(result_code: int) -> str:
    if result_code == 0:
        return MpesaTransaction.STATUS_SUCCESS
    if result_code == 1032:
        return MpesaTransaction.STATUS_CANCELLED
    if result_code == 1037:
        return MpesaTransaction.STATUS_TIMEOUT
    return MpesaTransaction.STATUS_FAILED


def _get_callback_item(items: list, name: str):
    for item in items:
        if item.get("Name") == name:
            return item.get("Value")
    return None


def _mark_order_paid(order: Order, receipt: str) -> None:
    order.payment_status = Order.PAYMENT_PAID
    order.payment_failure_reason = ""
    order.status = Order.PAID
    order.paid_at = timezone.now()
    order.payment_reference = receipt
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


def _mark_order_failed(order: Order, reason: str) -> None:
    order.payment_status = Order.PAYMENT_FAILED
    order.payment_failure_reason = reason[:255]
    order.status = Order.PENDING
    order.save(
        update_fields=[
            "payment_status",
            "payment_failure_reason",
            "status",
            "updated_at",
        ]
    )


def _apply_query_result(tx: MpesaTransaction, query_data: dict) -> bool:
    """Returns True if the transaction reached a terminal state, False if still pending."""
    response_code = str(query_data.get("ResponseCode", ""))
    result_code_raw = query_data.get("ResultCode")

    if response_code not in ("0", ""):
        logger.warning("STK query non-zero ResponseCode: %s", query_data)
        return False

    if result_code_raw is None:
        return False

    try:
        result_code = int(result_code_raw)
    except (TypeError, ValueError):
        logger.error("Unexpected ResultCode format: %s", result_code_raw)
        return False

    tx_status = _result_code_to_status(result_code)
    tx.status = tx_status
    tx.result_code = result_code
    tx.result_desc = query_data.get("ResultDesc", "")
    tx.save(update_fields=["status", "result_code", "result_desc", "updated_at"])

    order = tx.order
    if result_code == 0:
        receipt = tx.mpesa_receipt_number or tx.checkout_request_id
        _mark_order_paid(order, receipt)
        logger.info("Order %s marked paid via status query", order.id)
    else:
        _mark_order_failed(order, tx.result_desc)
        logger.info(
            "Order %s marked failed via status query (ResultCode=%s)", order.id, result_code
        )

    return True


@extend_schema(
    summary="Initiate M-Pesa STK Push",
    description="Starts an M-Pesa STK push payment request for an order. Returns a checkout_request_id used to poll payment status.",
)
class StkPushInitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = StkPushInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order_id: str = serializer.validated_data["order_id"]
        phone: str = serializer.validated_data["phone"]

        order = (
            Order.objects.select_related("mpesa_transaction")
            .filter(order_number=order_id)
            .first()
        )
        if not order:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if order.user_id != request.user.id:
            return Response(
                {"detail": "You can only pay for your own orders."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status in {
            Order.CANCELLED,
            Order.SHIPPED,
            Order.DELIVERED_PENDING,
            Order.DELIVERED,
        }:
            return Response(
                {"detail": "This order cannot be paid in its current status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Idempotency: if a non-terminal STK push already exists, reuse it
        existing_tx = getattr(order, "mpesa_transaction", None)
        if existing_tx and not existing_tx.is_terminal:
            logger.info(
                "STK push already pending for order %s — returning existing CheckoutRequestID",
                order_id,
            )
            return Response(
                {"checkout_request_id": existing_tx.checkout_request_id},
                status=status.HTTP_200_OK,
            )

        amount = max(1, round(float(order.total_amount) + 1))
        order_ref = f"ORD-{order.id}"
        description = f"Kitas Order {order.id}"

        try:
            daraja_response = mpesa_client.initiate_stk_push(
                phone=phone,
                amount=amount,
                order_ref=order_ref,
                description=description,
            )
        except (requests.RequestException, ValueError, RuntimeError) as exc:
            logger.error("STK push failed for order %s: %s", order_id, exc)
            return Response(
                {"detail": f"M-Pesa request failed: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        checkout_request_id: str = daraja_response["CheckoutRequestID"]
        merchant_request_id: str = daraja_response["MerchantRequestID"]

        with transaction.atomic():
            if existing_tx and existing_tx.is_terminal:
                existing_tx.delete()

            MpesaTransaction.objects.create(
                order=order,
                phone_number=phone,
                amount=Decimal(str(amount)),
                merchant_request_id=merchant_request_id,
                checkout_request_id=checkout_request_id,
                status=MpesaTransaction.STATUS_PENDING,
            )

            order.payment_status = Order.PAYMENT_PROCESSING
            order.save(update_fields=["payment_status", "updated_at"])

        return Response(
            {"checkout_request_id": checkout_request_id},
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name="dispatch")
@extend_schema(
    summary="M-Pesa Payment Callback",
    description="Public webhook used by Safaricom to deliver the STK push result. Not for direct client use. Always responds 200 to prevent Safaricom retries.",
)
class MpesaCallbackView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            self._process(request.data)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unhandled error in M-Pesa callback: %s", exc)

        return Response({"ResultCode": 0, "ResultDesc": "Accepted"}, status=status.HTTP_200_OK)

    def _process(self, data: dict) -> None:
        try:
            stk_callback = data["Body"]["stkCallback"]
        except (KeyError, TypeError):
            logger.error("Malformed M-Pesa callback payload: %s", data)
            return

        checkout_request_id: str = stk_callback.get("CheckoutRequestID", "")
        result_code: int = stk_callback.get("ResultCode", -1)
        result_desc: str = stk_callback.get("ResultDesc", "")

        logger.info(
            "M-Pesa callback received: CheckoutRequestID=%s ResultCode=%s",
            checkout_request_id,
            result_code,
        )

        tx = MpesaTransaction.objects.select_related("order").filter(
            checkout_request_id=checkout_request_id
        ).first()

        if not tx:
            logger.warning(
                "No MpesaTransaction found for CheckoutRequestID=%s", checkout_request_id
            )
            return

        if tx.is_terminal:
            logger.info("Transaction %s already in terminal state — ignoring callback", tx.pk)
            return

        with transaction.atomic():
            tx_status = _result_code_to_status(result_code)
            tx.status = tx_status
            tx.result_code = result_code
            tx.result_desc = result_desc

            if result_code == 0:
                items = stk_callback.get("CallbackMetadata", {}).get("Item", [])
                receipt = _get_callback_item(items, "MpesaReceiptNumber") or ""
                tx_date = str(_get_callback_item(items, "TransactionDate") or "")
                tx.mpesa_receipt_number = receipt
                tx.transaction_date = tx_date
                tx.save(
                    update_fields=[
                        "status", "result_code", "result_desc",
                        "mpesa_receipt_number", "transaction_date", "updated_at",
                    ]
                )
                _mark_order_paid(tx.order, receipt)
                logger.info(
                    "Payment SUCCESS for order %s — receipt %s", tx.order_id, receipt
                )
            else:
                tx.save(update_fields=["status", "result_code", "result_desc", "updated_at"])
                _mark_order_failed(tx.order, result_desc)
                logger.info(
                    "Payment FAILED for order %s — ResultCode=%s desc=%s",
                    tx.order_id, result_code, result_desc,
                )


@extend_schema(
    summary="Check M-Pesa Payment Status",
    description="Polled by the frontend to check STK push payment status. If the transaction is still pending after 45 seconds, queries Daraja directly as a fallback for cases where the callback hasn't arrived (mainly relevant in sandbox environments).",
)
class MpesaStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, checkout_request_id: str):
        tx = (
            MpesaTransaction.objects.select_related("order")
            .filter(checkout_request_id=checkout_request_id)
            .first()
        )
        if not tx:
            return Response(
                {"detail": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if tx.order.user_id != request.user.id:
            return Response(
                {"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN
            )

        if not tx.is_terminal:
            age_seconds = (timezone.now() - tx.created_at).total_seconds()
            if age_seconds >= DARAJA_QUERY_AFTER_SECONDS:
                logger.info(
                    "Tx %s is %ds old and still pending — querying Daraja directly",
                    tx.pk, age_seconds,
                )
                try:
                    query_data = mpesa_client.query_stk_status(checkout_request_id)
                    _apply_query_result(tx, query_data)
                    tx.refresh_from_db()
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Daraja status query failed: %s", exc)

        serializer = MpesaTransactionSerializer(tx)
        return Response(serializer.data, status=status.HTTP_200_OK)