/**
 * Saudi Post (SPL) National Address service (PLACEHOLDER).
 *
 * The Saudi Post SPL API resolves and validates National Addresses —
 * the official addressing system used by government and logistics. In
 * production this wraps HTTPS calls to the SPL Address Validation API.
 * Drop real credentials into SPL_API_KEY to switch from dev stubs.
 */

import crypto from "node:crypto";

const SPL_API_BASE = process.env.SPL_API_BASE ?? "https://api.address.gov.sa/v1";
const SPL_API_KEY = process.env.SPL_API_KEY ?? "";

export interface NationalAddress {
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  postalCode: string;
  additionalCode: string;
  unitNumber?: string;
  latitude?: number;
  longitude?: number;
}

export interface AddressValidationRequest {
  buildingNumber: string;
  postalCode: string;
  additionalCode: string;
}

export interface AddressValidationResponse {
  valid: boolean;
  address?: NationalAddress;
  confidence: number;
  provider: "spl";
  requestId: string;
}

export interface AddressLookupRequest {
  latitude: number;
  longitude: number;
}

export async function validateNationalAddress(
  req: AddressValidationRequest
): Promise<AddressValidationResponse> {
  if (!SPL_API_KEY) {
    return {
      valid: true,
      address: {
        buildingNumber: req.buildingNumber,
        street: "King Fahd Road",
        district: "Al Olaya",
        city: "Riyadh",
        postalCode: req.postalCode,
        additionalCode: req.additionalCode,
        latitude: 24.7136,
        longitude: 46.6753,
      },
      confidence: 1.0,
      provider: "spl",
      requestId: `SPL-DEV-${crypto.randomBytes(6).toString("hex")}`,
    };
  }
  throw new Error("SPL production client not configured");
}

export async function lookupByCoordinates(
  req: AddressLookupRequest
): Promise<AddressValidationResponse> {
  if (!SPL_API_KEY) {
    return {
      valid: true,
      address: {
        buildingNumber: "1234",
        street: "King Fahd Road",
        district: "Al Olaya",
        city: "Riyadh",
        postalCode: "12244",
        additionalCode: "7654",
        latitude: req.latitude,
        longitude: req.longitude,
      },
      confidence: 0.95,
      provider: "spl",
      requestId: `SPL-DEV-${crypto.randomBytes(6).toString("hex")}`,
    };
  }
  throw new Error("SPL production client not configured");
}

export async function searchAddress(
  query: string
): Promise<AddressValidationResponse[]> {
  if (!SPL_API_KEY) {
    return [
      {
        valid: true,
        address: {
          buildingNumber: "1234",
          street: "King Fahd Road",
          district: "Al Olaya",
          city: "Riyadh",
          postalCode: "12244",
          additionalCode: "7654",
          latitude: 24.7136,
          longitude: 46.6753,
        },
        confidence: 0.9,
        provider: "spl",
        requestId: `SPL-DEV-${crypto.randomBytes(6).toString("hex")}`,
      },
    ];
  }
  throw new Error("SPL production client not configured");
}
