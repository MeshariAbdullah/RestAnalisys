import { describe, it, expect } from "vitest";
import {
  sarToHalalas,
  halalasToSar,
  formatHalalas,
  computeRentalQuote,
  computeOwnerPayout,
  VAT_RATE,
  DEFAULT_PLATFORM_FEE_PCT,
  HALALAS_PER_SAR,
} from "../money.js";

// ── Constants ──────────────────────────────────────────────────────────────

describe("money constants", () => {
  it("VAT rate is 15%", () => {
    expect(VAT_RATE).toBe(0.15);
  });

  it("default platform fee is 20%", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });

  it("100 halalas per SAR", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });
});

// ── SAR/halalas conversion ─────────────────────────────────────────────────

describe("sarToHalalas", () => {
  it("converts whole SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10000);
  });

  it("converts fractional SAR and rounds", () => {
    expect(sarToHalalas(10.5)).toBe(1050);
    expect(sarToHalalas(10.999)).toBe(1100);
  });

  it("converts 0 SAR", () => {
    expect(sarToHalalas(0)).toBe(0);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(10000)).toBe(100);
  });

  it("produces fractional SAR", () => {
    expect(halalasToSar(1050)).toBe(10.5);
  });

  it("converts 0 halalas", () => {
    expect(halalasToSar(0)).toBe(0);
  });
});

// ── formatHalalas ──────────────────────────────────────────────────────────

describe("formatHalalas", () => {
  it("formats halalas as SAR string with 2 decimal places", () => {
    const result = formatHalalas(10000);
    expect(result).toContain("100.00");
    expect(result).toContain("SAR");
  });

  it("formats zero", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0.00");
    expect(result).toContain("SAR");
  });
});

// ── computeRentalQuote ─────────────────────────────────────────────────────

describe("computeRentalQuote", () => {
  it("computes a basic rental quote with default platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000, // 100 SAR/day
      durationDays: 3,
    });

    expect(quote.dailyPriceHalalas).toBe(10000);
    expect(quote.durationDays).toBe(3);

    // subtotal = 10000 * 3 = 30000
    expect(quote.rentalSubtotalHalalas).toBe(30000);

    // platform fee = 30000 * 20% = 6000
    expect(quote.platformFeeHalalas).toBe(6000);

    // pre-VAT = 30000 + 6000 = 36000
    // VAT = 36000 * 15% = 5400
    expect(quote.vatHalalas).toBe(5400);

    // total = 36000 + 5400 = 41400
    expect(quote.totalPayableHalalas).toBe(41400);
  });

  it("computes with a custom platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 1,
      platformFeePct: 10,
    });

    // subtotal = 10000
    expect(quote.rentalSubtotalHalalas).toBe(10000);

    // platform fee = 10000 * 10% = 1000
    expect(quote.platformFeeHalalas).toBe(1000);

    // pre-VAT = 10000 + 1000 = 11000
    // VAT = 11000 * 15% = 1650
    expect(quote.vatHalalas).toBe(1650);

    // total = 11000 + 1650 = 12650
    expect(quote.totalPayableHalalas).toBe(12650);
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 5000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(5000);
    expect(quote.platformFeeHalalas).toBe(1000);
    // pre-VAT = 6000, VAT = 900
    expect(quote.vatHalalas).toBe(900);
    expect(quote.totalPayableHalalas).toBe(6900);
  });

  it("handles large rental (30 days)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50000, // 500 SAR/day
      durationDays: 30,
    });

    // subtotal = 50000 * 30 = 1,500,000
    expect(quote.rentalSubtotalHalalas).toBe(1500000);
    // platform fee = 1,500,000 * 20% = 300,000
    expect(quote.platformFeeHalalas).toBe(300000);
    // pre-VAT = 1,800,000
    // VAT = 1,800,000 * 15% = 270,000
    expect(quote.vatHalalas).toBe(270000);
    // total = 2,070,000
    expect(quote.totalPayableHalalas).toBe(2070000);
  });

  it("rounds VAT and platform fee to whole halalas", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 333, // triggers rounding
      durationDays: 1,
    });

    // subtotal = 333
    expect(quote.rentalSubtotalHalalas).toBe(333);
    // platform fee = 333 * 20% = 66.6 -> 67 (Math.round)
    expect(quote.platformFeeHalalas).toBe(67);
    // pre-VAT = 333 + 67 = 400
    // VAT = 400 * 0.15 = 60
    expect(quote.vatHalalas).toBe(60);
    expect(quote.totalPayableHalalas).toBe(460);
  });

  it("handles zero daily price", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 0,
      durationDays: 5,
    });

    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.platformFeeHalalas).toBe(0);
    expect(quote.vatHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("applies 0% platform fee when explicitly set", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 1,
      platformFeePct: 0,
    });

    expect(quote.platformFeeHalalas).toBe(0);
    // pre-VAT = 10000
    // VAT = 10000 * 15% = 1500
    expect(quote.vatHalalas).toBe(1500);
    expect(quote.totalPayableHalalas).toBe(11500);
  });
});

// ── computeOwnerPayout ─────────────────────────────────────────────────────

describe("computeOwnerPayout", () => {
  it("calculates owner payout after commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100000,
      commissionPct: 20,
    });

    expect(payout.grossHalalas).toBe(100000);
    expect(payout.commissionHalalas).toBe(20000);
    expect(payout.netHalalas).toBe(80000);
  });

  it("handles 0% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 50000,
      commissionPct: 0,
    });

    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(50000);
  });

  it("rounds commission to whole halalas", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 333,
      commissionPct: 20,
    });

    // 333 * 20% = 66.6 -> 67
    expect(payout.commissionHalalas).toBe(67);
    expect(payout.netHalalas).toBe(266);
  });
});
