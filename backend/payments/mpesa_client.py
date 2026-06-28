"""
payments/mpesa_client.py
────────────────────────
Thread-safe Daraja API client for Lipa Na M-Pesa STK Push.

Responsibilities:
  • OAuth token management with in-memory TTL cache
  • STK push initiation
  • STK push status query (used as sandbox callback fallback)

All credentials are read from Django settings (populated from env vars).
"""

import base64
import logging
import threading
import time
from datetime import datetime
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger("payments")

# ── Constants ──────────────────────────────────────────────────────────────
SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
PRODUCTION_BASE_URL = "https://api.safaricom.co.ke"

TOKEN_URL = "/oauth/v1/generate?grant_type=client_credentials"
STK_PUSH_URL = "/mpesa/stkpush/v1/processrequest"
STK_QUERY_URL = "/mpesa/stkpushquery/v1/query"

# Shave 60 s off the expiry to avoid using a near-expired token
TOKEN_TTL_BUFFER = 60


# ── Thread-safe token cache ────────────────────────────────────────────────
class _TokenCache:
    """Simple in-memory cache for the Daraja OAuth access token."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._token: str = ""
        self._expires_at: float = 0.0

    def get(self) -> str:
        with self._lock:
            return self._token if time.time() < self._expires_at else ""

    def set(self, token: str, expires_in: int) -> None:
        with self._lock:
            self._token = token
            self._expires_at = time.time() + expires_in - TOKEN_TTL_BUFFER


_token_cache = _TokenCache()


# ── Internal helpers ───────────────────────────────────────────────────────
def _base_url() -> str:
    env = getattr(settings, "MPESA_ENVIRONMENT", "sandbox")
    return SANDBOX_BASE_URL if env == "sandbox" else PRODUCTION_BASE_URL


def _get_credentials() -> tuple[str, str]:
    key = getattr(settings, "MPESA_CONSUMER_KEY", "")
    secret = getattr(settings, "MPESA_CONSUMER_SECRET", "")
    if not key or not secret:
        raise RuntimeError(
            "MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET must be set in environment variables."
        )
    return key, secret


def _fetch_fresh_token() -> str:
    """Hit the Daraja OAuth endpoint and return a fresh access token."""
    key, secret = _get_credentials()
    credentials = base64.b64encode(f"{key}:{secret}".encode()).decode()

    url = f"{_base_url()}{TOKEN_URL}"
    response = requests.get(
        url,
        headers={"Authorization": f"Basic {credentials}"},
        timeout=15,
    )
    response.raise_for_status()

    data = response.json()
    token: str = data["access_token"]
    expires_in = int(data.get("expires_in", 3600))
    _token_cache.set(token, expires_in)
    logger.info("M-Pesa access token refreshed (expires_in=%s s)", expires_in)
    return token


def _get_access_token() -> str:
    """Return a cached token or fetch a new one if expired."""
    cached = _token_cache.get()
    if cached:
        return cached
    return _fetch_fresh_token()


def _generate_timestamp() -> str:
    """Return current UTC timestamp in Daraja format: YYYYMMDDHHmmss."""
    return datetime.utcnow().strftime("%Y%m%d%H%M%S")


def _generate_password(timestamp: str) -> str:
    """
    Daraja password = base64(shortcode + passkey + timestamp)
    """
    shortcode = getattr(settings, "MPESA_SHORTCODE", "")
    passkey = getattr(settings, "MPESA_PASSKEY", "")
    if not shortcode or not passkey:
        raise RuntimeError(
            "MPESA_SHORTCODE and MPESA_PASSKEY must be set in environment variables."
        )
    raw = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(raw.encode()).decode()


def _build_callback_url() -> str:
    base = getattr(settings, "MPESA_CALLBACK_BASE_URL", "").rstrip("/")
    if not base:
        raise RuntimeError(
            "MPESA_CALLBACK_BASE_URL must be set (e.g. https://backend.kitas.co.ke)."
        )
    return f"{base}/api/payments/mpesa/callback/"


# ── Public API ─────────────────────────────────────────────────────────────
def initiate_stk_push(
    phone: str,
    amount: int,
    order_ref: str,
    description: str = "Payment",
) -> dict[str, Any]:
    """
    Trigger an STK Push prompt on the customer's phone.

    Args:
        phone: In format 254XXXXXXXXX (no +, no leading 0)
        amount: Whole KES integer (minimum 1)
        order_ref: Short account reference (max 12 chars recommended)
        description: Transaction description shown in prompt

    Returns:
        Daraja response dict containing MerchantRequestID,
        CheckoutRequestID, ResponseCode, CustomerMessage.

    Raises:
        RuntimeError: If credentials are missing.
        requests.HTTPError: On Daraja HTTP errors.
    """
    shortcode = getattr(settings, "MPESA_SHORTCODE", "")
    token = _get_access_token()
    timestamp = _generate_timestamp()
    password = _generate_password(timestamp)
    callback_url = _build_callback_url()

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": order_ref[:20],
        "TransactionDesc": description[:20],
    }

    url = f"{_base_url()}{STK_PUSH_URL}"
    logger.info(
        "Initiating STK push: phone=%s amount=%s ref=%s", phone, amount, order_ref
    )

    response = requests.post(
        url,
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        logger.error("Daraja HTTP Error: %s - Response body: %s", exc, response.text)
        raise ValueError(f"Daraja API Error: {response.text}") from exc

    data = response.json()

    if data.get("ResponseCode") != "0":
        logger.error("STK push rejected by Daraja: %s", data)
        raise ValueError(
            data.get("errorMessage") or data.get("ResponseDescription", "STK push failed")
        )

    logger.info(
        "STK push accepted: CheckoutRequestID=%s", data.get("CheckoutRequestID")
    )
    return data


def query_stk_status(checkout_request_id: str) -> dict[str, Any]:
    """
    Query the status of a pending STK Push request.
    Used as a fallback when Daraja callbacks are unreliable (sandbox).

    Returns:
        Daraja query response dict containing ResultCode, ResultDesc.
    """
    shortcode = getattr(settings, "MPESA_SHORTCODE", "")
    token = _get_access_token()
    timestamp = _generate_timestamp()
    password = _generate_password(timestamp)

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }

    url = f"{_base_url()}{STK_QUERY_URL}"
    logger.info("Querying STK status for CheckoutRequestID=%s", checkout_request_id)

    response = requests.post(
        url,
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()
    logger.info("STK query result: %s", data)
    return data


def normalise_phone(raw: str) -> str:
    """
    Normalise a Kenyan phone number to 254XXXXXXXXX format.

    Accepts: 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX, 01XXXXXXXX
    Raises ValueError for invalid formats.
    """
    phone = raw.strip().replace(" ", "").replace("-", "")

    if phone.startswith("+"):
        phone = phone[1:]

    if phone.startswith("0"):
        phone = "254" + phone[1:]

    if not phone.startswith("254"):
        raise ValueError(
            f"Invalid Kenyan phone number '{raw}'. Expected format: 07XXXXXXXX or 254XXXXXXXXX."
        )

    if len(phone) != 12:
        raise ValueError(
            f"Phone number '{raw}' has incorrect length after normalisation ({len(phone)} digits, expected 12)."
        )

    return phone
