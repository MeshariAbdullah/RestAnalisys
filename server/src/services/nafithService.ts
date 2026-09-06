/**
 * Nafith (سند) integration service (PLACEHOLDER).
 *
 * Nafith is the Saudi Ministry of Justice platform for issuing and managing
 * digital promissory notes (Sanad). A Sanad is an enforceable instrument that
 * can be handed directly to the "Najiz" execution courts without needing a
 * prior judgment.
 *
 * In this platform we use Nafith as the legal-enforcement backstop:
 *  1. When a renter takes an item, we issue a Sanad equal to the legal
 *     commitment amount (100% or 150% of evaluated value).
 *  2. On happy return, we discharge the Sanad.
 *  3. On loss or major damage, we push the Sanad into execution.
 */

import crypto from "node:crypto";
import { logIntegrationEvent } from "./integrationLogger.js";

const NAFITH_API_BASE = process.env.NAFITH_API_BASE ?? "https://api.nafith.moj.gov.sa/v1";
const NAFITH_API_KEY = process.env.NAFITH_API_KEY ?? "";

export interface IssueSanadRequest {
  creditorNationalId: string;         // Platform's national commercial ID
  debtorNationalId: string;           // Renter's national ID
  principalHalalas: number;           // Amount in halalas
  maturityDate: string;               // ISO date (YYYY-MM-DD)
  reference: string;                  // Internal rental ref
  description: string;
}

export interface IssueSanadResponse {
  nafithReference: string;
  requestId: string;
  status: "pending_issuance" | "issued" | "rejected";
  issuedAt?: string;
}

export async function issueSanad(req: IssueSanadRequest): Promise<IssueSanadResponse> {
  if (!NAFITH_API_KEY) {
    const response = {
      nafithReference: `NFT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
      requestId: `REQ-${Date.now()}`,
      status: "issued" as const,
      issuedAt: new Date().toISOString(),
    };
    await logIntegrationEvent({
      provider: "nafith",
      eventType: "sanad_issuance",
      referenceId: response.nafithReference,
      payload: { reference: req.reference, principalHalalas: req.principalHalalas, result: response },
    });
    return response;
  }
  throw new Error("Nafith production client not configured");
}

export interface SignSanadResponse {
  nafithReference: string;
  status: "signed" | "pending" | "rejected";
  signedAt?: string;
}

export async function signSanad(nafithReference: string): Promise<SignSanadResponse> {
  if (!NAFITH_API_KEY) {
    return {
      nafithReference,
      status: "signed",
      signedAt: new Date().toISOString(),
    };
  }
  throw new Error("Nafith production client not configured");
}

export interface DischargeSanadResponse {
  nafithReference: string;
  status: "discharged" | "failed";
  dischargedAt?: string;
}

export async function dischargeSanad(nafithReference: string): Promise<DischargeSanadResponse> {
  if (!NAFITH_API_KEY) {
    return {
      nafithReference,
      status: "discharged",
      dischargedAt: new Date().toISOString(),
    };
  }
  throw new Error("Nafith production client not configured");
}

export interface ExecuteSanadRequest {
  nafithReference: string;
  reason: string;
  attachments?: string[]; // URLs to supporting evidence
}

export interface ExecuteSanadResponse {
  nafithReference: string;
  executionCaseNumber: string;
  status: "under_execution" | "rejected";
  submittedAt: string;
}

/**
 * Hand the Sanad to Najiz for execution. This is the final legal backstop
 * when a renter loses or destroys an item and refuses voluntary payment.
 */
export async function executeSanad(req: ExecuteSanadRequest): Promise<ExecuteSanadResponse> {
  if (!NAFITH_API_KEY) {
    const response = {
      nafithReference: req.nafithReference,
      executionCaseNumber: `EXEC-${Date.now()}`,
      status: "under_execution" as const,
      submittedAt: new Date().toISOString(),
    };
    await logIntegrationEvent({
      provider: "nafith",
      eventType: "sanad_execution",
      referenceId: req.nafithReference,
      payload: { reason: req.reason, result: response },
    });
    return response;
  }
  throw new Error("Nafith production client not configured");
}
