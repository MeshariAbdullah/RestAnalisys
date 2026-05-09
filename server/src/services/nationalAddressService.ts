import { v4 as uuidv4 } from "uuid";

export interface NationalAddress {
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  postalCode: string;
  additionalCode: string;
  unitNumber?: string;
  isPrimary: boolean;
  latitude?: number;
  longitude?: number;
}

export interface AddressValidationResult {
  valid: boolean;
  address?: NationalAddress;
  formattedAddress?: string;
  requestId: string;
  source: "live" | "stub";
}

const SPL_API_BASE = process.env.SPL_API_BASE;
const SPL_API_KEY = process.env.SPL_API_KEY;

function isLive(): boolean {
  return !!(SPL_API_BASE && SPL_API_KEY);
}

export async function validateNationalAddress(
  postalCode: string,
  additionalCode: string
): Promise<AddressValidationResult> {
  if (isLive()) {
    // TODO: Wire real SPL API client when credentials are available
  }

  return {
    valid: true,
    address: {
      buildingNumber: "1234",
      street: "شارع الملك فهد",
      district: "العليا",
      city: "الرياض",
      postalCode,
      additionalCode,
      isPrimary: true,
      latitude: 24.7136,
      longitude: 46.6753,
    },
    formattedAddress: `1234 شارع الملك فهد، العليا، الرياض ${postalCode}`,
    requestId: `SPL-${uuidv4().slice(0, 8)}`,
    source: "stub",
  };
}

export async function lookupByNationalId(
  nationalId: string
): Promise<AddressValidationResult> {
  if (isLive()) {
    // TODO: Wire real SPL API client when credentials are available
  }

  return {
    valid: true,
    address: {
      buildingNumber: "5678",
      street: "شارع التحلية",
      district: "السليمانية",
      city: "الرياض",
      postalCode: "12234",
      additionalCode: "7890",
      isPrimary: true,
      latitude: 24.6918,
      longitude: 46.6853,
    },
    formattedAddress: "5678 شارع التحلية، السليمانية، الرياض 12234",
    requestId: `SPL-${uuidv4().slice(0, 8)}`,
    source: "stub",
  };
}
