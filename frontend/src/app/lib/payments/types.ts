// ---------------------------------------------------------------------------
// Payments domain — TypeScript types
// ---------------------------------------------------------------------------

export interface MpesaStkResponse {
  checkout_request_id: string;
}

export interface MpesaStatusResponse {
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout';
  mpesa_receipt_number?: string;
  result_desc?: string;
  order_status: string;
  order_payment_status: string;
}
