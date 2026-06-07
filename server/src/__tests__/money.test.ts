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
} from "../utils/money.js";

describe("sarToHalalas / halalasToSar", () => {
  it("converts SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(1.5)).toBe(150);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("converts halalas to SAR", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(150)).toBe(1.5);
    expect(halalasToSar(0)).toBe(0);
  });

  it("round-trips correctly", () => {
    expect(halalasToSar(sarToHalalas(99.99))).toBeCloseTo(99.99);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix", () => {
    const result = formatHalalas(150_000);
    expect(result).toContain("SAR");
    expect(result).toContain("1,500.00");
  });

  it("formats zero", () => {
    expect(formatHalalas(0)).toContain("0.00");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct totals for a standard rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });
    expect(quote.rentalSubtotalHalalas).toBe(70_000);
    expect(quote.platformFeeHalalas).toBe(14_000);
    const preVat = 70_000 + 14_000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50_000,
      durationDays: 1,
    });
    expect(quote.rentalSubtotalHalalas).toBe(50_000);
    expect(quote.durationDays).toBe(1);
  });

  it("respects custom platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 10,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(10_000);
  });

  it("uses 20% platform fee by default", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 5,
    });
    const expected = Math.round((50_000 * DEFAULT_PLATFORM_FEE_PCT) / 100);
    expect(quote.platformFeeHalalas).toBe(expected);
  });

  it("produces integer amounts (no fractions)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 33_333,
      durationDays: 3,
    });
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });

  it("total = subtotal + fee + vat", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 25_000,
      durationDays: 14,
    });
    expect(quote.totalPayableHalalas).toBe(
      quote.rentalSubtotalHalalas + quote.platformFeeHalalas + quote.vatHalalas
    );
  });
});

describe("computeOwnerPayout", () => {
  it("computes correct net payout", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    expect(payout.grossHalalas).toBe(100_000);
    expect(payout.commissionHalalas).toBe(20_000);
    expect(payout.netHalalas).toBe(80_000);
  });

  it("net = gross - commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 350_000,
      commissionPct: 15,
    });
    expect(payout.netHalalas).toBe(payout.grossHalalas - payout.commissionHalalas);
  });

  it("handles zero commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(payout.netHalalas).toBe(50_000);
    expect(payout.commissionHalalas).toBe(0);
  });

  it("produces integer commission (no fractions)", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 33_333,
      commissionPct: 17,
    });
    expect(Number.isInteger(payout.commissionHalalas)).toBe(true);
  });
});
