/**
 * Payment service — abstracts over a Saudi payment gateway (HyperPay / Moyasar /
 * PayTabs). Placeholder implementation: if no API key is present, we auto-
 * authorize and auto-capture so the rest of the system can be exercised.
 */

import crypto from "node:crypto";
import { recordIntegrationEvent } from "./integrationEventService.js";

const GATEWAY = process.env.PAYMENT_GATEWAY ?? "hyperpay"; // hyperpay | moyasar | paytabs
const GATEWAY_API_KEY = process.env.PAYMENT_GATEWAY_API_KEY ?? "";

export type PaymentGateway = "hyperpay" | "moyasar" | "paytabs";

export interface ChargeRequest {
  amountHalalas: number;
  description: string;
  rentalReference: string;
  renterUserId: number;
  paymentMethodToken?: string; // tokenized card / STCPay / Apple Pay
}

export interface ChargeResponse {
  gateway: PaymentGateway;
  transactionId: string;
  status: "pending" | "authorized" | "captured" | "failed";
  capturedAt?: string;
  raw: Record<string, unknown>;
}

export async function chargeCard(req: ChargeRequest): Promise<ChargeResponse> {
  if (!GATEWAY_API_KEY) {
    const transactionId = `PAY-DEV-${crypto.randomBytes(6).toString("hex")}`;
    const response: ChargeResponse = {
      gateway: GATEWAY as PaymentGateway,
      transactionId,
      status: "captured",
      capturedAt: new Date().toISOString(),
      raw: { dev: true, ...req },
    };
    await recordIntegrationEvent({
      provider: "hyperpay",
      eventType: "charge_captured",
      referenceId: transactionId,
      payload: { rentalReference: req.rentalReference, amountHalalas: req.amountHalalas, response },
    });
    return response;
  }
  throw new Error("Payment gateway production client not configured");
}

export async function refundPayment(
  transactionId: string,
  amountHalalas: number
): Promise<{ transactionId: string; refundId: string; status: "refunded" }> {
  if (!GATEWAY_API_KEY) {
    return {
      transactionId,
      refundId: `RFD-DEV-${crypto.randomBytes(6).toString("hex")}`,
      status: "refunded",
    };
  }
  throw new Error("Payment gateway production client not configured");
}

/**
 * ZATCA e-invoicing placeholder.
 * On capture, we synchronously generate a compliant e-invoice XML + QR.
 */
export interface InvoiceInput {
  paymentId: number;
  rentalReference: string;
  customerName: string;
  customerVatNumber?: string;
  lineItems: Array<{ description: string; amountHalalas: number; vatHalalas: number }>;
  totalHalalas: number;
}

export async function generateZatcaInvoice(i: InvoiceInput) {
  const invoiceNumber = `INV-${new Date().getFullYear()}-${i.paymentId
    .toString()
    .padStart(8, "0")}`;
  // Real impl: build UBL 2.1 XML, sign with CSID, POST to ZATCA Fatoora API.
  // Dev impl: return placeholder URLs + a stub QR.
  return {
    invoiceNumber,
    invoiceXmlUrl: `https://zatca-stub.local/${invoiceNumber}.xml`,
    invoiceQrBase64: Buffer.from(`${invoiceNumber}:${i.totalHalalas}`).toString("base64"),
    invoicedAt: new Date().toISOString(),
  };
}
