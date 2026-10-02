import { describe, it, expect } from "vitest";
import {
  sarToHalalas,
  halalasToSar,
  formatHalalas,
  computeRentalQuote,
  computeOwnerPayout,
  VAT_RATE,
  DEFAULT_PLATFORM_FEE_PCT,
} from "../utils/money.js";

describe("sarToHalalas / halalasToSar", () => {
  it("converts SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(0)).toBe(0);
    expect(sarToHalalas(99.99)).toBe(9_999);
  });

  it("converts halalas to SAR", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(0)).toBe(0);
    expect(halalasToSar(150)).toBe(1.5);
  });

  it("round-trips correctly", () => {
    expect(halalasToSar(sarToHalalas(42.5))).toBe(42.5);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix and 2 decimals", () => {
    const formatted = formatHalalas(10_050);
    expect(formatted).toContain("SAR");
    expect(formatted).toContain("100.50");
  });

  it("handles zero", () => {
    expect(formatHalalas(0)).toContain("0");
  });
});

describe("computeRentalQuote", () => {
  it("calculates correct totals for a standard rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 3,
    });
    expect(quote.dailyPriceHalalas).toBe(10_000);
    expect(quote.durationDays).toBe(3);
    expect(quote.rentalSubtotalHalalas).toBe(30_000);
    expect(quote.platformFeeHalalas).toBe(6_000);
    expect(quote.vatHalalas).toBe(Math.round(36_000 * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(30_000 + 6_000 + quote.vatHalalas);
  });

  it("handles single-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50_000,
      durationDays: 1,
    });
    expect(quote.rentalSubtotalHalalas).toBe(50_000);
    expect(quote.totalPayableHalalas).toBeGreaterThan(50_000);
  });

  it("handles custom platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(1_000);
  });

  it("produces integer halalas (no floating point)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 333,
      durationDays: 7,
    });
    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });

  it("zero daily price yields zero total", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 0,
      durationDays: 5,
    });
    expect(quote.totalPayableHalalas).toBe(0);
  });
});

describe("computeOwnerPayout", () => {
  it("deducts commission correctly", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: DEFAULT_PLATFORM_FEE_PCT,
    });
    expect(payout.grossHalalas).toBe(100_000);
    expect(payout.commissionHalalas).toBe(20_000);
    expect(payout.netHalalas).toBe(80_000);
  });

  it("handles zero commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(payout.netHalalas).toBe(50_000);
    expect(payout.commissionHalalas).toBe(0);
  });

  it("produces integer amounts", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 33_333,
      commissionPct: 15,
    });
    expect(Number.isInteger(payout.commissionHalalas)).toBe(true);
    expect(Number.isInteger(payout.netHalalas)).toBe(true);
  });
});
