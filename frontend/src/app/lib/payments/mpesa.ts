// ---------------------------------------------------------------------------
// Payments domain — API functions
// ---------------------------------------------------------------------------

import { request } from "../core/api-client";
import type { MpesaStkResponse, MpesaStatusResponse } from "./types";

export type { MpesaStkResponse, MpesaStatusResponse } from "./types";

/**
 * Initiates an M-Pesa STK Push prompt on the customer's phone.
 * @param orderId The order to pay for
 * @param phone The M-Pesa phone number (format 254XXXXXXXXX)
 */
export async function initiateMpesaPayment(orderId: string, phone: string) {
  return request<MpesaStkResponse>(
    "/payments/mpesa/stk-push/",
    {
      method: "POST",
      body: JSON.stringify({ order_id: orderId, phone }),
    },
    true
  );
}

/**
 * Polls the status of an ongoing M-Pesa transaction.
 * @param checkoutRequestId The ID returned by initiateMpesaPayment
 */
export async function getMpesaPaymentStatus(checkoutRequestId: string) {
  return request<MpesaStatusResponse>(
    `/payments/mpesa/status/${checkoutRequestId}/`,
    {
      method: "GET",
    },
    true
  );
}
