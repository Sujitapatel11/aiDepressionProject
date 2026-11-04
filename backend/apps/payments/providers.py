import base64
import hashlib
import hmac
import json
import os
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings


class PaymentProviderError(Exception):
    pass


def _required_env(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise PaymentProviderError(f"Payment provider is not configured: {name}")
    return value


def _frontend_url():
    return os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def _backend_url():
    value = os.environ.get("BACKEND_URL", "").strip().rstrip("/")
    if not value:
        raise PaymentProviderError("Payment provider is not configured: BACKEND_URL")
    return value


def initiate_esewa(transaction):
    product_code = _required_env("ESEWA_PRODUCT_CODE")
    secret = _required_env("ESEWA_SECRET_KEY")
    base_url = os.environ.get("ESEWA_FORM_URL", "https://epay.esewa.com.np/api/epay/main/v2/form")
    transaction_uuid = str(transaction.id)
    total = f"{Decimal(transaction.amount_minor) / Decimal(100):.2f}"
    signed_fields = "total_amount,transaction_uuid,product_code"
    message = f"total_amount={total},transaction_uuid={transaction_uuid},product_code={product_code}"
    signature = base64.b64encode(hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()).decode()
    payload = {
        "amount": total,
        "tax_amount": "0",
        "total_amount": total,
        "transaction_uuid": transaction_uuid,
        "product_code": product_code,
        "product_service_charge": "0",
        "product_delivery_charge": "0",
        "success_url": f"{_backend_url()}/api/payments/return/esewa/",
        "failure_url": f"{_frontend_url()}/payment/failed",
        "signed_field_names": signed_fields,
        "signature": signature,
    }
    return {"checkout_url": base_url, "payload": payload, "reference": transaction_uuid}


def verify_esewa(encoded_data, transaction):
    try:
        decoded = json.loads(base64.b64decode(encoded_data).decode("utf-8"))
    except Exception as exc:
        raise PaymentProviderError("Invalid eSewa response payload.") from exc

    secret = _required_env("ESEWA_SECRET_KEY")
    product_code = _required_env("ESEWA_PRODUCT_CODE")
    signed_names = decoded.get("signed_field_names", "")
    if not signed_names or "signature" not in decoded:
        raise PaymentProviderError("eSewa response is missing signature fields.")
    message = ",".join(f"{name}={decoded.get(name, '')}" for name in signed_names.split(","))
    expected = base64.b64encode(hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()).decode()
    if not hmac.compare_digest(expected, decoded["signature"]):
        raise PaymentProviderError("eSewa response signature verification failed.")
    expected_amount = f"{Decimal(transaction.amount_minor) / Decimal(100):.2f}"
    if decoded.get("transaction_uuid") != str(transaction.id) or decoded.get("product_code") != product_code:
        raise PaymentProviderError("eSewa transaction reference mismatch.")
    try:
        returned_amount = Decimal(str(decoded.get("total_amount", "0")).replace(",", ""))
    except InvalidOperation as exc:
        raise PaymentProviderError("Invalid eSewa amount.") from exc
    if returned_amount != Decimal(expected_amount):
        raise PaymentProviderError("eSewa amount mismatch.")
    return decoded


def initiate_khalti(transaction, customer=None):
    secret = _required_env("KHALTI_SECRET_KEY")
    base_url = os.environ.get("KHALTI_INITIATE_URL", "https://a.khalti.com/api/v2/epayment/initiate/")
    callback = f"{_backend_url()}/api/payments/return/khalti/"
    user = transaction.user
    payload = {
        "return_url": callback,
        "website_url": _frontend_url(),
        "amount": transaction.amount_minor,
        "purchase_order_id": str(transaction.id),
        "purchase_order_name": transaction.plan.name,
        "customer_info": {
            "name": user.get_full_name() or user.get_username(),
            "email": user.email or "",
            "phone": (customer or {}).get("phone", ""),
        },
    }
    response = requests.post(base_url, json=payload, headers={"Authorization": f"Key {secret}", "Content-Type": "application/json"}, timeout=20)
    if response.status_code not in (200, 201):
        raise PaymentProviderError(f"Khalti initiation failed ({response.status_code}).")
    data = response.json()
    if not data.get("payment_url") or not data.get("pidx"):
        raise PaymentProviderError("Khalti returned an incomplete checkout response.")
    return {"checkout_url": data["payment_url"], "payload": data, "reference": data["pidx"]}


def verify_khalti(pidx, transaction):
    secret = _required_env("KHALTI_SECRET_KEY")
    url = os.environ.get("KHALTI_LOOKUP_URL", "https://a.khalti.com/api/v2/epayment/lookup/")
    response = requests.post(url, json={"pidx": pidx}, headers={"Authorization": f"Key {secret}", "Content-Type": "application/json"}, timeout=20)
    if response.status_code != 200:
        raise PaymentProviderError(f"Khalti lookup failed ({response.status_code}).")
    data = response.json()
    if data.get("status") != "Completed":
        raise PaymentProviderError("Khalti payment is not completed.")
    if int(data.get("total_amount", -1)) != transaction.amount_minor:
        raise PaymentProviderError("Khalti amount mismatch.")
    if data.get("purchase_order_id") != str(transaction.id):
        raise PaymentProviderError("Khalti transaction reference mismatch.")
    return data
