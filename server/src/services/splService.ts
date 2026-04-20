import crypto from "node:crypto";

const SPL_API_KEY = process.env.SPL_API_KEY ?? "";

export interface NationalAddress {
  buildingNumber: string;
  streetName: string;
  district: string;
  city: string;
  postCode: string;
  additionalNumber: string;
  unitNumber?: string;
  regionName?: string;
  shortAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface SplLookupRequest {
  nationalId: string;
  language?: "A" | "E";
}

export interface SplLookupResponse {
  requestId: string;
  status: "found" | "not_found" | "error";
  addresses: NationalAddress[];
  provider: "spl";
}

export async function lookupNationalAddress(
  req: SplLookupRequest
): Promise<SplLookupResponse> {
  const requestId = `SPL-${crypto.randomBytes(6).toString("hex")}`;

  if (!SPL_API_KEY) {
    return {
      requestId,
      status: "found",
      addresses: [
        {
          buildingNumber: "1234",
          streetName: req.language === "E" ? "King Fahd Road" : "طريق الملك فهد",
          district: req.language === "E" ? "Al Olaya" : "العليا",
          city: req.language === "E" ? "Riyadh" : "الرياض",
          postCode: "12211",
          additionalNumber: "5678",
          regionName: req.language === "E" ? "Riyadh Region" : "منطقة الرياض",
          shortAddress: "RBBA1234",
          latitude: 24.7136,
          longitude: 46.6753,
        },
      ],
      provider: "spl",
    };
  }

  // Production: POST to https://api.address.gov.sa/ServiceEndPoints/NationalAddress
  throw new Error("SPL production client not configured");
}

export interface SplValidateRequest {
  buildingNumber: string;
  postCode: string;
  additionalNumber: string;
}

export async function validateAddress(
  req: SplValidateRequest
): Promise<{ valid: boolean; normalized?: NationalAddress }> {
  if (!SPL_API_KEY) {
    return {
      valid: true,
      normalized: {
        buildingNumber: req.buildingNumber,
        streetName: "طريق الملك فهد",
        district: "العليا",
        city: "الرياض",
        postCode: req.postCode,
        additionalNumber: req.additionalNumber,
        shortAddress: `RBBA${req.buildingNumber}`,
      },
    };
  }

  throw new Error("SPL production client not configured");
}
