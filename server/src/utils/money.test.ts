import { describe, it, expect } from "vitest";
import {
  sarToHalalas,
  halalasToSar,
  formatHalalas,
  computeRentalQuote,
  computeOwnerPayout,
  VAT_RATE,
  DEFAULT_PLATFORM_FEE_PCT,
} from "./money.js";

describe("sarToHalalas / halalasToSar", () => {
  it("converts SAR to halalas correctly", () => {
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(0)).toBe(0);
    expect(sarToHalalas(1.5)).toBe(150);
    expect(sarToHalalas(999.99)).toBe(99_999);
  });

  it("converts halalas to SAR correctly", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(150)).toBe(1.5);
    expect(halalasToSar(0)).toBe(0);
  });

  it("roundtrips correctly", () => {
    expect(halalasToSar(sarToHalalas(42.42))).toBe(42.42);
  });
});

describe("formatHalalas", () => {
  it("formats with 2 decimal places and SAR suffix", () => {
    const result = formatHalalas(150_000);
    expect(result).toContain("1,500.00");
    expect(result).toContain("SAR");
  });

  it("formats zero", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0.00");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes a standard rental correctly", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000, // 100 SAR/day
      durationDays: 7,
    });

    expect(quote.rentalSubtotalHalalas).toBe(70_000);
    expect(quote.platformFeeHalalas).toBe(14_000); // 20% of 70k
    const preVat = 70_000 + 14_000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE)); // 15% of 84k = 12,600
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("handles zero-duration edge case", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 0 });
    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("uses custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 10,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(10_000); // 10% of 100k
  });

  it("never produces floating-point amounts", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 33_333, durationDays: 3 });
    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("computes net payout after commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    expect(payout.grossHalalas).toBe(100_000);
    expect(payout.commissionHalalas).toBe(20_000);
    expect(payout.netHalalas).toBe(80_000);
  });

  it("handles zero commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 0,
    });
    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(100_000);
  });
});
