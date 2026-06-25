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

describe("sarToHalalas", () => {
  it("converts whole SAR", () => {
    expect(sarToHalalas(100)).toBe(10_000);
  });

  it("converts fractional SAR", () => {
    expect(sarToHalalas(1.5)).toBe(150);
  });

  it("rounds to nearest halala", () => {
    expect(sarToHalalas(1.995)).toBe(200);
    expect(sarToHalalas(1.004)).toBe(100);
  });

  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
  });
});

describe("halalasToSar", () => {
  it("converts back correctly", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(150)).toBe(1.5);
    expect(halalasToSar(0)).toBe(0);
  });
});

describe("formatHalalas", () => {
  it("formats with two decimal places and SAR suffix", () => {
    const result = formatHalalas(15_050);
    expect(result).toContain("150.50");
    expect(result).toContain("SAR");
  });

  it("formats zero", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0.00");
  });
});

describe("computeRentalQuote", () => {
  it("calculates correct totals for a simple rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 5,
    });

    expect(quote.dailyPriceHalalas).toBe(10_000);
    expect(quote.durationDays).toBe(5);
    expect(quote.rentalSubtotalHalalas).toBe(50_000);
    expect(quote.platformFeeHalalas).toBe(10_000); // 20% of 50,000
    const preVat = 50_000 + 10_000;
    const expectedVat = Math.round(preVat * VAT_RATE);
    expect(quote.vatHalalas).toBe(expectedVat);
    expect(quote.totalPayableHalalas).toBe(preVat + expectedVat);
  });

  it("uses custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });

    expect(quote.platformFeeHalalas).toBe(1_000); // 10% of 10,000
  });

  it("handles single-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 5_000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(5_000);
  });

  it("returns integer halalas (no floating point)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 3_333,
      durationDays: 7,
    });

    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });

  it("total = subtotal + fee + vat", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 7_500,
      durationDays: 10,
    });

    const preVat = quote.rentalSubtotalHalalas + quote.platformFeeHalalas;
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });
});

describe("computeOwnerPayout", () => {
  it("calculates commission and net correctly", () => {
    const result = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });

    expect(result.grossHalalas).toBe(100_000);
    expect(result.commissionHalalas).toBe(20_000);
    expect(result.netHalalas).toBe(80_000);
  });

  it("gross = commission + net", () => {
    const result = computeOwnerPayout({
      rentalSubtotalHalalas: 77_777,
      commissionPct: 20,
    });

    expect(result.grossHalalas).toBe(
      result.commissionHalalas + result.netHalalas
    );
  });

  it("handles zero commission", () => {
    const result = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });

    expect(result.commissionHalalas).toBe(0);
    expect(result.netHalalas).toBe(50_000);
  });
});

describe("constants", () => {
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
