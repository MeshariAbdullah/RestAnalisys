import crypto from "node:crypto";

const SPL_API_BASE = process.env.SPL_API_BASE ?? "https://api.address.gov.sa/v3";
const SPL_API_KEY = process.env.SPL_API_KEY ?? "";

export interface NationalAddress {
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  region: string;
  postalCode: string;
  additionalCode: string;
  unitNumber?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
}

export interface AddressValidationResult {
  valid: boolean;
  address?: NationalAddress;
  formattedAddress?: string;
  formattedAddressAr?: string;
  errors?: string[];
  provider: "spl";
}

export interface AddressLookupResult {
  addresses: NationalAddress[];
  totalResults: number;
  provider: "spl";
}

export async function validateAddress(input: {
  buildingNumber: string;
  postalCode: string;
  additionalCode?: string;
}): Promise<AddressValidationResult> {
  if (!SPL_API_KEY) {
    if (!input.buildingNumber || !input.postalCode) {
      return {
        valid: false,
        errors: ["buildingNumber and postalCode are required"],
        provider: "spl",
      };
    }
    return {
      valid: true,
      address: {
        buildingNumber: input.buildingNumber,
        street: "King Fahd Road",
        district: "Al Olaya",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: input.postalCode,
        additionalCode: input.additionalCode ?? "7890",
        latitude: 24.7136,
        longitude: 46.6753,
        isPrimary: true,
      },
      formattedAddress: `${input.buildingNumber} King Fahd Road, Al Olaya, Riyadh ${input.postalCode}`,
      formattedAddressAr: `${input.buildingNumber} طريق الملك فهد، العليا، الرياض ${input.postalCode}`,
      provider: "spl",
    };
  }

  throw new Error("SPL production client not configured");
}

export async function lookupByNationalId(nationalId: string): Promise<AddressLookupResult> {
  if (!SPL_API_KEY) {
    return {
      addresses: [
        {
          buildingNumber: "4321",
          street: "King Fahd Road",
          district: "Al Olaya",
          city: "Riyadh",
          region: "Riyadh",
          postalCode: "12211",
          additionalCode: "7890",
          latitude: 24.7136,
          longitude: 46.6753,
          isPrimary: true,
        },
      ],
      totalResults: 1,
      provider: "spl",
    };
  }

  throw new Error("SPL production client not configured");
}

export async function geocodeAddress(
  lat: number,
  lng: number
): Promise<AddressLookupResult> {
  if (!SPL_API_KEY) {
    return {
      addresses: [
        {
          buildingNumber: "1000",
          street: "Prince Mohammed bin Abdulaziz Road",
          district: "Al Tahlia",
          city: "Riyadh",
          region: "Riyadh",
          postalCode: "12214",
          additionalCode: "1234",
          latitude: lat,
          longitude: lng,
        },
      ],
      totalResults: 1,
      provider: "spl",
    };
  }

  throw new Error("SPL production client not configured");
}

export function formatNationalAddress(addr: NationalAddress): string {
  return [
    addr.buildingNumber,
    addr.street,
    addr.district,
    addr.city,
    addr.postalCode,
    addr.additionalCode ? `(${addr.additionalCode})` : "",
  ]
    .filter(Boolean)
    .join(", ");
}
