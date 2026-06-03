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
}) {
  const commissionHalalas = Math.round((args.rentalSubtotalHalalas * args.commissionPct) / 100);
  const netHalalas = args.rentalSubtotalHalalas - commissionHalalas;
  return {
    grossHalalas: args.rentalSubtotalHalalas,
    commissionHalalas,
    netHalalas,
  };
}

export const LATE_RETURN_DAILY_PENALTY_PCT = 5;
export const LATE_RETURN_MAX_PENALTY_PCT = 50;

export interface LatePenalty {
  lateDays: number;
  dailyPenaltyPct: number;
  penaltyHalalas: number;
  cappedAtMax: boolean;
}

export function computeLatePenalty(args: {
  endDate: string;
  returnedAt: Date | string;
  dailyPriceHalalas: number;
}): LatePenalty {
  const endMs = new Date(args.endDate + "T23:59:59Z").getTime();
  const returnMs = new Date(args.returnedAt).getTime();

  if (returnMs <= endMs) {
    return { lateDays: 0, dailyPenaltyPct: LATE_RETURN_DAILY_PENALTY_PCT, penaltyHalalas: 0, cappedAtMax: false };
  }

  const lateDays = Math.ceil((returnMs - endMs) / (1000 * 60 * 60 * 24));
  const uncappedPct = lateDays * LATE_RETURN_DAILY_PENALTY_PCT;
  const effectivePct = Math.min(uncappedPct, LATE_RETURN_MAX_PENALTY_PCT);
  const penaltyHalalas = Math.round((args.dailyPriceHalalas * lateDays * LATE_RETURN_DAILY_PENALTY_PCT) / 100) * 100;

  return {
    lateDays,
    dailyPenaltyPct: LATE_RETURN_DAILY_PENALTY_PCT,
    penaltyHalalas,
    cappedAtMax: uncappedPct > LATE_RETURN_MAX_PENALTY_PCT,
  };
}
