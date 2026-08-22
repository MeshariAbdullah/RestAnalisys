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

describe("sarToHalalas", () => {
  it("converts whole SAR", () => {
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(1800)).toBe(180000);
  });

  it("rounds fractional halalas", () => {
    expect(sarToHalalas(10.005)).toBe(1001);
    expect(sarToHalalas(99.999)).toBe(10000);
  });

  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(180000)).toBe(1800);
    expect(halalasToSar(50)).toBe(0.5);
  });

  it("handles zero", () => {
    expect(halalasToSar(0)).toBe(0);
  });
});

describe("formatHalalas", () => {
  it("formats with two decimal places and SAR suffix", () => {
    const result = formatHalalas(180000);
    expect(result).toContain("1,800");
    expect(result).toContain("SAR");
  });

  it("formats sub-SAR amounts", () => {
    const result = formatHalalas(50);
    expect(result).toContain("0.50");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct breakdown for a 3-day rental at 1800 SAR/day", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: sarToHalalas(1800),
      durationDays: 3,
    });

    expect(quote.dailyPriceHalalas).toBe(180000);
    expect(quote.durationDays).toBe(3);
    expect(quote.rentalSubtotalHalalas).toBe(540000);
    expect(quote.platformFeeHalalas).toBe(108000);

    const preVat = 540000 + 108000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("uses custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100000,
      durationDays: 1,
      platformFeePct: 10,
    });

    expect(quote.rentalSubtotalHalalas).toBe(100000);
    expect(quote.platformFeeHalalas).toBe(10000);
  });

  it("handles single-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(50000);
    expect(quote.totalPayableHalalas).toBeGreaterThan(quote.rentalSubtotalHalalas);
  });

  it("all amounts are integers (no floating point drift)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 33333,
      durationDays: 7,
    });

    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("computes correct payout with 20% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 540000,
      commissionPct: 20,
    });

    expect(payout.grossHalalas).toBe(540000);
    expect(payout.commissionHalalas).toBe(108000);
    expect(payout.netHalalas).toBe(432000);
  });

  it("gross = commission + net", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 333333,
      commissionPct: 20,
    });

    expect(payout.grossHalalas).toBe(payout.commissionHalalas + payout.netHalalas);
  });

  it("handles zero commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100000,
      commissionPct: 0,
    });

    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(100000);
  });
});
