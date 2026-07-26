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
import { db } from "../db/index.js";
import { integrationEvents } from "../db/schema.js";

const NAFATH_API_BASE = process.env.NAFATH_API_BASE ?? "https://api.nafath.sa/v1";
const NAFATH_API_KEY = process.env.NAFATH_API_KEY ?? "";

async function logEvent(eventType: string, referenceId: string, payload: unknown) {
  try {
    await db.insert(integrationEvents).values({
      provider: "nafath",
      eventType,
      referenceId,
      payloadJson: payload as object,
      processed: true,
      processedAt: new Date(),
    });
  } catch { /* best-effort logging */ }
}

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
    const response: NafathVerifyResponse = {
      transactionId,
      status: "verified",
      verifiedAt: new Date().toISOString(),
      fullName: req.fullNameHint ?? "Test User",
      provider: "nafath",
    };
    await logEvent("verify", transactionId, { request: req, response });
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
    const tid = `NAFATH-SIGN-DEV-${crypto.randomBytes(6).toString("hex")}`;
    const response: NafathSignResponse = {
      transactionId: tid,
      status: "signed",
      signedAt: new Date().toISOString(),
      signatureCertificate: "DEV-CERT",
    };
    await logEvent("sign", tid, { request: req, response });
    return response;
  }
  throw new Error("Nafath production client not configured");
}
