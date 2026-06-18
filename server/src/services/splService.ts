/**
 * Saudi Post (SPL) National Address integration (PLACEHOLDER).
 *
 * The SPL API validates and enriches Saudi national addresses (short code,
 * building number, postal code, district, city). In dev mode, this service
 * accepts any address and returns mock enrichment data.
 *
 * Replace SPL_API_BASE and implement the HTTP calls when credentials are
 * provisioned by Saudi Post.
 */

import crypto from "node:crypto";

const SPL_API_BASE = process.env.SPL_API_BASE ?? "https://api.address.gov.sa/v3";
const SPL_API_KEY = process.env.SPL_API_KEY ?? "";

export interface NationalAddress {
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  postalCode: string;
  additionalCode: string;
  unitNumber?: string;
  regionName?: string;
  shortAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface AddressValidationRequest {
  buildingNumber?: string;
  postalCode?: string;
  additionalCode?: string;
  city?: string;
  district?: string;
  street?: string;
  shortAddress?: string;
}

export interface AddressValidationResponse {
  valid: boolean;
  normalizedAddress?: NationalAddress;
  confidence: number;
  provider: "spl" | "dev";
  requestId: string;
}

export interface AddressLookupResponse {
  addresses: NationalAddress[];
  totalResults: number;
  provider: "spl" | "dev";
}

export async function validateAddress(
  req: AddressValidationRequest
): Promise<AddressValidationResponse> {
  const requestId = `SPL-${crypto.randomBytes(6).toString("hex")}`;

  if (!SPL_API_KEY) {
    const normalized: NationalAddress = {
      buildingNumber: req.buildingNumber ?? "1234",
      street: req.street ?? "King Fahd Road",
      district: req.district ?? "Al Olaya",
      city: req.city ?? "Riyadh",
      postalCode: req.postalCode ?? "12211",
      additionalCode: req.additionalCode ?? "7890",
      regionName: "Riyadh Region",
      shortAddress: req.shortAddress ?? "RRRD1234",
      latitude: 24.7136,
      longitude: 46.6753,
    };

    return {
      valid: true,
      normalizedAddress: normalized,
      confidence: 0.95,
      provider: "dev",
      requestId,
    };
  }

  throw new Error("SPL production client not configured");
}

export async function lookupByShortAddress(
  shortAddress: string
): Promise<AddressLookupResponse> {
  if (!SPL_API_KEY) {
    return {
      addresses: [
        {
          buildingNumber: "1234",
          street: "King Fahd Road",
          district: "Al Olaya",
          city: "Riyadh",
          postalCode: "12211",
          additionalCode: "7890",
          regionName: "Riyadh Region",
          shortAddress,
          latitude: 24.7136,
          longitude: 46.6753,
        },
      ],
      totalResults: 1,
      provider: "dev",
    };
  }

  throw new Error("SPL production client not configured");
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<AddressLookupResponse> {
  if (!SPL_API_KEY) {
    return {
      addresses: [
        {
          buildingNumber: "5678",
          street: "Olaya Street",
          district: "Al Olaya",
          city: "Riyadh",
          postalCode: "12244",
          additionalCode: "3456",
          regionName: "Riyadh Region",
          shortAddress: "RRRD5678",
          latitude,
          longitude,
        },
      ],
      totalResults: 1,
      provider: "dev",
    };
  }

  throw new Error("SPL production client not configured");
}
