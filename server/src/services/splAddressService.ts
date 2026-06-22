/**
 * Saudi Post (SPL) National Address integration.
 *
 * In dev mode (no SPL_API_KEY), returns plausible stub data.
 * Drop a real API key into .env to activate live validation.
 */

export interface NationalAddress {
  buildingNumber: string;
  street: string;
  district: string;
  city: string;
  region: string;
  postalCode: string;
  additionalCode: string;
  unitNumber?: string;
  isPrimary: boolean;
  latitude?: number;
  longitude?: number;
}

export interface AddressValidationResult {
  valid: boolean;
  normalized?: NationalAddress;
  error?: string;
}

const isLive = () => !!process.env.SPL_API_KEY;

export async function validateNationalAddress(
  shortAddress: string
): Promise<AddressValidationResult> {
  if (isLive()) {
    const res = await fetch(
      `${process.env.SPL_API_BASE ?? "https://api.address.gov.sa"}/v3/lookup?shortAddress=${encodeURIComponent(shortAddress)}`,
      {
        headers: {
          "x-api-key": process.env.SPL_API_KEY!,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) {
      return { valid: false, error: `SPL API returned ${res.status}` };
    }
    const data = await res.json() as { addresses?: NationalAddress[] };
    if (!data.addresses?.length) {
      return { valid: false, error: "Address not found" };
    }
    return { valid: true, normalized: data.addresses[0] };
  }

  // Dev-mode stub
  console.log(`[spl-stub] validateNationalAddress("${shortAddress}")`);
  return {
    valid: true,
    normalized: {
      buildingNumber: "8228",
      street: "King Fahd Road",
      district: "Al Olaya",
      city: "Riyadh",
      region: "Riyadh Region",
      postalCode: "12241",
      additionalCode: "2121",
      isPrimary: true,
      latitude: 24.7136,
      longitude: 46.6753,
    },
  };
}

export async function lookupByNationalId(
  nationalId: string
): Promise<NationalAddress[] | null> {
  if (isLive()) {
    const res = await fetch(
      `${process.env.SPL_API_BASE ?? "https://api.address.gov.sa"}/v3/national-id/${encodeURIComponent(nationalId)}`,
      {
        headers: {
          "x-api-key": process.env.SPL_API_KEY!,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as { addresses?: NationalAddress[] };
    return data.addresses ?? null;
  }

  // Dev-mode stub
  console.log(`[spl-stub] lookupByNationalId("${nationalId}")`);
  return [
    {
      buildingNumber: "8228",
      street: "King Fahd Road",
      district: "Al Olaya",
      city: "Riyadh",
      region: "Riyadh Region",
      postalCode: "12241",
      additionalCode: "2121",
      isPrimary: true,
      latitude: 24.7136,
      longitude: 46.6753,
    },
    {
      buildingNumber: "4452",
      street: "Prince Sultan Road",
      district: "Al Rawdah",
      city: "Jeddah",
      region: "Makkah Region",
      postalCode: "23433",
      additionalCode: "7654",
      isPrimary: false,
      latitude: 21.5169,
      longitude: 39.2192,
    },
  ];
}
