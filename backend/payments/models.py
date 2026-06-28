import logging

from django.db import models

from orders.models import Order

logger = logging.getLogger("payments")


class MpesaTransaction(models.Model):
    """Tracks a single Lipa Na M-Pesa STK Push request and its outcome."""

    # ── Status choices ──────────────────────────────────────────────────────
    STATUS_PENDING = "pending"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"
    STATUS_CANCELLED = "cancelled"
    STATUS_TIMEOUT = "timeout"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
        (STATUS_CANCELLED, "Cancelled by user"),
        (STATUS_TIMEOUT, "Timeout"),
    ]

    # ── Relationships ────────────────────────────────────────────────────────
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="mpesa_transaction",
    )

    # ── Payment details ──────────────────────────────────────────────────────
    phone_number = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # ── Daraja identifiers (set when STK push is accepted) ───────────────────
    merchant_request_id = models.CharField(max_length=100, blank=True, db_index=True)
    checkout_request_id = models.CharField(max_length=100, unique=True, db_index=True)

    # ── Result (set by callback or status query) ─────────────────────────────
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True
    )
    result_code = models.IntegerField(null=True, blank=True)
    result_desc = models.CharField(max_length=255, blank=True)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)
    transaction_date = models.CharField(max_length=20, blank=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "M-Pesa Transaction"
        verbose_name_plural = "M-Pesa Transactions"

    def __str__(self):
        return f"MpesaTx<order={self.order_id} status={self.status}>"

    @property
    def is_terminal(self) -> bool:
        """True once the transaction has reached a final state."""
        return self.status in {
            self.STATUS_SUCCESS,
            self.STATUS_FAILED,
            self.STATUS_CANCELLED,
            self.STATUS_TIMEOUT,
        }
