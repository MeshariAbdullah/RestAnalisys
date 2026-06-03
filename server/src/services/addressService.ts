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
  formattedAddress: string;
  formattedAddressAr: string;
}

export interface AddressLookupRequest {
  buildingNumber: string;
  postalCode: string;
  additionalCode?: string;
}

export interface AddressVerifyRequest {
  nationalId: string;
}

export async function lookupAddress(req: AddressLookupRequest): Promise<NationalAddress | null> {
  if (!SPL_API_KEY) {
    return {
      buildingNumber: req.buildingNumber,
      street: "طريق الملك فهد",
      district: "العليا",
      city: "الرياض",
      region: "منطقة الرياض",
      postalCode: req.postalCode || "12211",
      additionalCode: req.additionalCode || "7654",
      latitude: 24.7136,
      longitude: 46.6753,
      formattedAddress: `${req.buildingNumber} King Fahd Road, Al Olaya, Riyadh 12211`,
      formattedAddressAr: `${req.buildingNumber} طريق الملك فهد، العليا، الرياض 12211`,
    };
  }
  throw new Error("SPL National Address production client not configured");
}

export async function verifyNationalAddress(req: AddressVerifyRequest): Promise<NationalAddress | null> {
  if (!SPL_API_KEY) {
    return {
      buildingNumber: "4321",
      street: "شارع التحلية",
      district: "السليمانية",
      city: "الرياض",
      region: "منطقة الرياض",
      postalCode: "12244",
      additionalCode: "8899",
      latitude: 24.6938,
      longitude: 46.6854,
      formattedAddress: "4321 Tahlia Street, Sulaimaniya, Riyadh 12244",
      formattedAddressAr: "4321 شارع التحلية، السليمانية، الرياض 12244",
    };
  }
  throw new Error("SPL National Address production client not configured");
}

export interface DeliveryZone {
  zoneId: string;
  name: string;
  nameAr: string;
  region: string;
  deliveryAvailable: boolean;
  estimatedDays: number;
  surchargeHalalas: number;
}

const DELIVERY_ZONES: DeliveryZone[] = [
  { zoneId: "RUH", name: "Riyadh", nameAr: "الرياض", region: "central", deliveryAvailable: true, estimatedDays: 1, surchargeHalalas: 0 },
  { zoneId: "JED", name: "Jeddah", nameAr: "جدة", region: "western", deliveryAvailable: true, estimatedDays: 2, surchargeHalalas: 0 },
  { zoneId: "DMM", name: "Dammam", nameAr: "الدمام", region: "eastern", deliveryAvailable: true, estimatedDays: 2, surchargeHalalas: 0 },
  { zoneId: "MKH", name: "Makkah", nameAr: "مكة المكرمة", region: "western", deliveryAvailable: true, estimatedDays: 2, surchargeHalalas: 5000 },
  { zoneId: "MED", name: "Madinah", nameAr: "المدينة المنورة", region: "western", deliveryAvailable: true, estimatedDays: 3, surchargeHalalas: 5000 },
  { zoneId: "KHM", name: "Khamis Mushait", nameAr: "خميس مشيط", region: "southern", deliveryAvailable: true, estimatedDays: 3, surchargeHalalas: 7500 },
  { zoneId: "TAB", name: "Tabuk", nameAr: "تبوك", region: "northwestern", deliveryAvailable: true, estimatedDays: 4, surchargeHalalas: 10000 },
  { zoneId: "HAL", name: "Hail", nameAr: "حائل", region: "northern", deliveryAvailable: true, estimatedDays: 4, surchargeHalalas: 10000 },
];

export function getDeliveryZones(): DeliveryZone[] {
  return DELIVERY_ZONES;
}

export function getDeliveryZone(city: string): DeliveryZone | undefined {
  const lower = city.toLowerCase();
  return DELIVERY_ZONES.find(
    (z) => z.name.toLowerCase() === lower || z.nameAr === city || z.zoneId.toLowerCase() === lower
  );
}
