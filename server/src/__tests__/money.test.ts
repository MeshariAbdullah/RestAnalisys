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
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(1000)).toBe(100_000);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("handles fractional SAR correctly", () => {
    expect(sarToHalalas(99.99)).toBe(9999);
    expect(sarToHalalas(0.01)).toBe(1);
  });

  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(100_000)).toBe(1000);
    expect(halalasToSar(0)).toBe(0);
  });

  it("round-trips correctly", () => {
    expect(halalasToSar(sarToHalalas(1234))).toBe(1234);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix", () => {
    const result = formatHalalas(100_000);
    expect(result).toContain("SAR");
    expect(result).toContain("1,000.00");
  });

  it("formats zero", () => {
    expect(formatHalalas(0)).toContain("0.00");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct subtotal", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 3,
    });
    expect(quote.rentalSubtotalHalalas).toBe(300_000);
  });

  it("applies default 20% platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 1,
    });
    expect(quote.platformFeeHalalas).toBe(20_000);
  });

  it("applies custom platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 1,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(10_000);
  });

  it("applies 15% VAT on subtotal + fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 1,
    });
    const preVat = quote.rentalSubtotalHalalas + quote.platformFeeHalalas;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
  });

  it("total = subtotal + fee + VAT", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 180_000,
      durationDays: 5,
    });
    expect(quote.totalPayableHalalas).toBe(
      quote.rentalSubtotalHalalas +
        quote.platformFeeHalalas +
        quote.vatHalalas
    );
  });

  it("uses integer arithmetic (no floating point drift)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 33_333,
      durationDays: 7,
    });
    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("deducts commission correctly", () => {
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
      rentalSubtotalHalalas: 543_210,
      commissionPct: 15,
    });
    expect(payout.netHalalas).toBe(
      payout.grossHalalas - payout.commissionHalalas
    );
  });
});
