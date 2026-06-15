/**
 * Money helpers. All amounts are stored in halalas (1 SAR = 100 halalas) to
 * avoid floating-point drift.
 */

export const VAT_RATE = 0.15;               // 15% Saudi VAT
export const DEFAULT_PLATFORM_FEE_PCT = 20; // 20% platform commission
export const HALALAS_PER_SAR = 100;

export function sarToHalalas(sar: number): number {
  return Math.round(sar * HALALAS_PER_SAR);
}

export function halalasToSar(halalas: number): number {
  return halalas / HALALAS_PER_SAR;
}

export function formatHalalas(halalas: number): string {
  return `${(halalas / HALALAS_PER_SAR).toLocaleString("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} SAR`;
}

export interface RentalQuote {
  dailyPriceHalalas: number;
  durationDays: number;
  rentalSubtotalHalalas: number;
  platformFeeHalalas: number;
  vatHalalas: number;
  totalPayableHalalas: number;
}

export function computeRentalQuote(args: {
  dailyPriceHalalas: number;
  durationDays: number;
  platformFeePct?: number;
}): RentalQuote {
  const platformFeePct = args.platformFeePct ?? DEFAULT_PLATFORM_FEE_PCT;
  const rentalSubtotalHalalas = args.dailyPriceHalalas * args.durationDays;
  const platformFeeHalalas = Math.round((rentalSubtotalHalalas * platformFeePct) / 100);
  const preVat = rentalSubtotalHalalas + platformFeeHalalas;
  const vatHalalas = Math.round(preVat * VAT_RATE);
  const totalPayableHalalas = preVat + vatHalalas;

  return {
    dailyPriceHalalas: args.dailyPriceHalalas,
    durationDays: args.durationDays,
    rentalSubtotalHalalas,
    platformFeeHalalas,
    vatHalalas,
    totalPayableHalalas,
  };
}

export function computeOwnerPayout(args: {
  rentalSubtotalHalalas: number;
  commissionPct: number;
  penaltyDeductionHalalas?: number;
}) {
  const adjustedGross = args.rentalSubtotalHalalas - (args.penaltyDeductionHalalas ?? 0);
  const grossHalalas = Math.max(0, adjustedGross);
  const commissionHalalas = Math.round((grossHalalas * args.commissionPct) / 100);
  const netHalalas = grossHalalas - commissionHalalas;
  return {
    grossHalalas,
    commissionHalalas,
    netHalalas,
    penaltyDeductionHalalas: args.penaltyDeductionHalalas ?? 0,
  };
}
