/**
 * Saudi National Address (SPL/Splonline) integration service (PLACEHOLDER).
 *
 * The Saudi Post (SPL) provides a national addressing system that assigns
 * every location a standardized address with a short code, building number,
 * postal code, and additional code. This service validates and resolves
 * addresses via the SPL API.
 *
 * Replace SPL_API_BASE and implement the HTTP calls when credentials are
 * provisioned.
 */

const SPL_API_BASE = process.env.SPL_API_BASE ?? "https://api.address.gov.sa/v3";
const SPL_API_KEY = process.env.SPL_API_KEY ?? "";

export interface NationalAddress {
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  postalCode: string;
  additionalCode: string;
  shortAddress: string;
  latitude?: number;
  longitude?: number;
}

export interface AddressLookupRequest {
  shortAddress?: string;
  buildingNumber?: string;
  postalCode?: string;
  city?: string;
}

export interface AddressLookupResponse {
  addresses: NationalAddress[];
  provider: "spl";
}

export async function lookupNationalAddress(
  req: AddressLookupRequest
): Promise<AddressLookupResponse> {
  if (!SPL_API_KEY) {
    return {
      addresses: [
        {
          buildingNumber: req.buildingNumber ?? "1234",
          street: "King Fahd Road",
          district: "Al Olaya",
          city: req.city ?? "Riyadh",
          postalCode: req.postalCode ?? "12211",
          additionalCode: "7890",
          shortAddress: req.shortAddress ?? "AAAA1234",
        },
      ],
      provider: "spl",
    };
  }
  throw new Error("SPL National Address production client not configured");
}

export async function validateNationalAddress(
  address: Partial<NationalAddress>
): Promise<{ valid: boolean; normalized?: NationalAddress }> {
  if (!SPL_API_KEY) {
    return {
      valid: true,
      normalized: {
        buildingNumber: address.buildingNumber ?? "1234",
        street: address.street ?? "King Fahd Road",
        district: address.district ?? "Al Olaya",
        city: address.city ?? "Riyadh",
        postalCode: address.postalCode ?? "12211",
        additionalCode: address.additionalCode ?? "7890",
        shortAddress: "AAAA1234",
      },
    };
  }
  throw new Error("SPL National Address production client not configured");
}
