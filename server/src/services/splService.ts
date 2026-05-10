/**
 * Saudi Post (SPL) National Address integration service (PLACEHOLDER).
 *
 * SPL provides verified residential and commercial addresses through the
 * National Address system. We use it to validate renter delivery addresses
 * and owner pickup locations.
 *
 * In dev mode (no SPL_API_KEY), all lookups return a plausible stub address.
 */

const SPL_API_BASE = process.env.SPL_API_BASE ?? "https://api.address.gov.sa/v1";
const SPL_API_KEY = process.env.SPL_API_KEY ?? "";

export interface NationalAddress {
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  postCode: string;
  additionalNumber: string;
  unitNumber?: string;
  latitude?: number;
  longitude?: number;
}

export interface ValidateAddressResponse {
  valid: boolean;
  address: NationalAddress | null;
  formattedAddress: string;
}

export async function validateNationalAddress(
  shortAddress: string
): Promise<ValidateAddressResponse> {
  if (!SPL_API_KEY) {
    return {
      valid: true,
      address: {
        buildingNumber: "8228",
        street: "Prince Sultan Road",
        district: "Al Rawdah",
        city: "Jeddah",
        postCode: "23434",
        additionalNumber: "2121",
      },
      formattedAddress: "8228 Prince Sultan Road, Al Rawdah, Jeddah 23434-2121",
    };
  }
  throw new Error("SPL production client not configured");
}

export interface LookupByNationalIdResponse {
  found: boolean;
  addresses: NationalAddress[];
}

export async function lookupAddressByNationalId(
  nationalId: string
): Promise<LookupByNationalIdResponse> {
  if (!SPL_API_KEY) {
    return {
      found: true,
      addresses: [
        {
          buildingNumber: "8228",
          street: "Prince Sultan Road",
          district: "Al Rawdah",
          city: "Jeddah",
          postCode: "23434",
          additionalNumber: "2121",
        },
      ],
    };
  }
  throw new Error("SPL production client not configured");
}

export async function verifyDeliveryAddress(
  address: NationalAddress
): Promise<{ deliverable: boolean; estimatedDays: number }> {
  if (!SPL_API_KEY) {
    return { deliverable: true, estimatedDays: 2 };
  }
  throw new Error("SPL production client not configured");
}
