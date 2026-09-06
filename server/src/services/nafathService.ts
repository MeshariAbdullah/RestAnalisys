/**
 * Nafath integration service (PLACEHOLDER).
 *
 * Nafath is the Saudi national digital identity platform operated by NIC.
 * In production, this service wraps HTTPS calls to the Nafath Verification API
 * and the Nafath e-signing API. It exposes a stable internal interface so the
 * rest of the system can call `verifyIdentity()` / `requestSignature()` without
 * caring which provider is behind it.
 *
 * Replace NAFATH_API_BASE and implement the `httpPost` calls when credentials
 * are provisioned.
 */

import crypto from "node:crypto";
import { logIntegrationEvent } from "./integrationLogger.js";

const NAFATH_API_BASE = process.env.NAFATH_API_BASE ?? "https://api.nafath.sa/v1";
const NAFATH_API_KEY = process.env.NAFATH_API_KEY ?? "";

export interface NafathVerifyRequest {
  nationalId: string;
  fullNameHint?: string;
}

export interface NafathVerifyResponse {
  transactionId: string;
  status: "pending" | "verified" | "rejected" | "expired";
  verifiedAt?: string;
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  provider: "nafath";
}

/**
 * Initiate a Nafath identity verification. In production this posts to the
 * Nafath API which then prompts the user on the Absher/Nafath mobile app to
 * approve. The response contains a transaction id used for polling.
 */
export async function initiateNafathVerification(
  req: NafathVerifyRequest
): Promise<NafathVerifyResponse> {
  if (!NAFATH_API_KEY) {
    const transactionId = `NAFATH-DEV-${crypto.randomBytes(6).toString("hex")}`;
    const response = {
      transactionId,
      status: "verified" as const,
      verifiedAt: new Date().toISOString(),
      fullName: req.fullNameHint ?? "Test User",
      provider: "nafath" as const,
    };
    await logIntegrationEvent({
      provider: "nafath",
      eventType: "identity_verification",
      referenceId: transactionId,
      payload: { nationalId: req.nationalId, result: response },
    });
    return response;
  }

  // Production: replace with a real HTTP POST.
  throw new Error("Nafath production client not configured");
}

export async function pollNafathStatus(transactionId: string): Promise<NafathVerifyResponse> {
  if (!NAFATH_API_KEY) {
    return {
      transactionId,
      status: "verified",
      verifiedAt: new Date().toISOString(),
      provider: "nafath",
    };
  }
  throw new Error("Nafath production client not configured");
}

/**
 * Request a Nafath e-signature on a document (used for signing the
 * platform-renter legal commitment).
 */
export interface NafathSignRequest {
  nationalId: string;
  documentHash: string;
  documentTitle: string;
  documentPdfUrl?: string;
}

export interface NafathSignResponse {
  transactionId: string;
  status: "pending" | "signed" | "rejected" | "expired";
  signedAt?: string;
  signatureCertificate?: string;
}

export async function requestNafathSignature(
  req: NafathSignRequest
): Promise<NafathSignResponse> {
  if (!NAFATH_API_KEY) {
    const txId = `NAFATH-SIGN-DEV-${crypto.randomBytes(6).toString("hex")}`;
    const response = {
      transactionId: txId,
      status: "signed" as const,
      signedAt: new Date().toISOString(),
      signatureCertificate: "DEV-CERT",
    };
    await logIntegrationEvent({
      provider: "nafath",
      eventType: "e_signature",
      referenceId: txId,
      payload: { documentHash: req.documentHash, result: response },
    });
    return response;
  }
  throw new Error("Nafath production client not configured");
}
