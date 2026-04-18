/**
 * National Address validation service — SPL (Saudi Post) integration.
 *
 * Saudi National Address is mandatory for legal contracts and shipments.
 * This service validates and normalizes addresses via the SPL API.
 *
 * In production, replace stubs with real SPL API calls.
 */

import crypto from "node:crypto";

const SPL_API_BASE = process.env.SPL_API_BASE ?? "https://api.address.gov.sa/v1";
const SPL_API_KEY = process.env.SPL_API_KEY ?? "";

export interface NationalAddress {
  buildingNumber: string;
  streetName: string;
  district: string;
  city: string;
  postCode: string;
  additionalCode: string;
  unitNumber?: string;
  regionName?: string;
  latitude?: number;
  longitude?: number;
}

export interface AddressValidationResult {
  valid: boolean;
  normalized?: NationalAddress;
  splReferenceId?: string;
  errors?: string[];
}

export interface AddressLookupResult {
  addresses: NationalAddress[];
  totalResults: number;
}

export async function validateAddress(
  address: Partial<NationalAddress>
): Promise<AddressValidationResult> {
  if (!SPL_API_KEY) {
    const referenceId = `SPL-DEV-${crypto.randomBytes(6).toString("hex")}`;
    console.log(`[address] DEV validate → ${address.city}, ${address.district}`);

    if (!address.buildingNumber || !address.postCode || !address.city) {
      return {
        valid: false,
        errors: [
          ...(!address.buildingNumber ? ["buildingNumber is required"] : []),
          ...(!address.postCode ? ["postCode is required"] : []),
          ...(!address.city ? ["city is required"] : []),
        ],
      };
    }

    return {
      valid: true,
      normalized: {
        buildingNumber: address.buildingNumber,
        streetName: address.streetName ?? "",
        district: address.district ?? "",
        city: address.city,
        postCode: address.postCode,
        additionalCode: address.additionalCode ?? "",
        unitNumber: address.unitNumber,
        regionName: address.regionName,
      },
      splReferenceId: referenceId,
    };
  }
  throw new Error("SPL production client not configured");
}

export async function lookupByPostCode(postCode: string): Promise<AddressLookupResult> {
  if (!SPL_API_KEY) {
    console.log(`[address] DEV lookup → postCode=${postCode}`);
    return {
      addresses: [
        {
          buildingNumber: "1234",
          streetName: "King Fahd Road",
          district: "Al Olaya",
          city: "Riyadh",
          postCode,
          additionalCode: "5678",
          regionName: "Riyadh Region",
          latitude: 24.7136,
          longitude: 46.6753,
        },
      ],
      totalResults: 1,
    };
  }
  throw new Error("SPL production client not configured");
}

export async function lookupByCoordinates(
  latitude: number,
  longitude: number
): Promise<AddressLookupResult> {
  if (!SPL_API_KEY) {
    console.log(`[address] DEV reverse geocode → ${latitude}, ${longitude}`);
    return {
      addresses: [
        {
          buildingNumber: "5678",
          streetName: "Prince Mohammed Bin Salman Road",
          district: "KAFD",
          city: "Riyadh",
          postCode: "12382",
          additionalCode: "9012",
          regionName: "Riyadh Region",
          latitude,
          longitude,
        },
      ],
      totalResults: 1,
    };
  }
  throw new Error("SPL production client not configured");
}
