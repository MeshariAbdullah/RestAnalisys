/**
 * Saudi Post (SPL) National Address integration service.
 *
 * Validates and resolves Saudi National Addresses using the SPL API.
 * Without an API key, returns synthetic dev data.
 */

import crypto from "node:crypto";

const SPL_API_BASE = process.env.SPL_API_BASE ?? "https://api.address.gov.sa/v3";
const SPL_API_KEY = process.env.SPL_API_KEY ?? "";

export interface NationalAddress {
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  postCode: string;
  additionalCode: string;
  unitNumber?: string;
  latitude?: number;
  longitude?: number;
  isPrimary: boolean;
}

export interface AddressLookupRequest {
  nationalId: string;
  language?: "ar" | "en";
}

export interface AddressLookupResponse {
  addresses: NationalAddress[];
  provider: "spl";
  requestId: string;
}

export async function lookupNationalAddress(
  req: AddressLookupRequest
): Promise<AddressLookupResponse> {
  if (!SPL_API_KEY) {
    return {
      addresses: [
        {
          buildingNumber: "8228",
          street: "King Fahd Road",
          district: "Al Olaya",
          city: "Riyadh",
          postCode: "12211",
          additionalCode: "2121",
          latitude: 24.7136,
          longitude: 46.6753,
          isPrimary: true,
        },
      ],
      provider: "spl",
      requestId: `SPL-DEV-${crypto.randomBytes(6).toString("hex")}`,
    };
  }

  throw new Error("SPL production client not configured");
}

export interface AddressValidateRequest {
  buildingNumber: string;
  postCode: string;
  additionalCode: string;
}

export interface AddressValidateResponse {
  valid: boolean;
  normalizedAddress?: NationalAddress;
  requestId: string;
}

export async function validateNationalAddress(
  req: AddressValidateRequest
): Promise<AddressValidateResponse> {
  if (!SPL_API_KEY) {
    return {
      valid: true,
      normalizedAddress: {
        buildingNumber: req.buildingNumber,
        street: "King Fahd Road",
        district: "Al Olaya",
        city: "Riyadh",
        postCode: req.postCode,
        additionalCode: req.additionalCode,
        latitude: 24.7136,
        longitude: 46.6753,
        isPrimary: false,
      },
      requestId: `SPL-DEV-${crypto.randomBytes(6).toString("hex")}`,
    };
  }

  throw new Error("SPL production client not configured");
}
