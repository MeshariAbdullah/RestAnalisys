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

describe("sarToHalalas", () => {
  it("converts SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(0)).toBe(0);
    expect(sarToHalalas(1.5)).toBe(150);
  });

  it("rounds to avoid floating point issues", () => {
    expect(sarToHalalas(99.99)).toBe(9_999);
    expect(sarToHalalas(0.01)).toBe(1);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(0)).toBe(0);
    expect(halalasToSar(150)).toBe(1.5);
  });
});

describe("formatHalalas", () => {
  it("formats halalas as SAR string", () => {
    const result = formatHalalas(10_000);
    expect(result).toContain("SAR");
    expect(result).toContain("100");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct quote with default platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 3,
    });

    expect(quote.dailyPriceHalalas).toBe(100_000);
    expect(quote.durationDays).toBe(3);
    expect(quote.rentalSubtotalHalalas).toBe(300_000);
    expect(quote.platformFeeHalalas).toBe(60_000);
    const preVat = 300_000 + 60_000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("uses custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 1,
      platformFeePct: 10,
    });

    expect(quote.platformFeeHalalas).toBe(10_000);
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50_000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(50_000);
  });

  it("produces integer values for all monetary fields", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 33_333,
      durationDays: 7,
    });

    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });

  it("ensures total = subtotal + fee + vat", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 180_000,
      durationDays: 5,
    });

    expect(quote.totalPayableHalalas).toBe(
      quote.rentalSubtotalHalalas + quote.platformFeeHalalas + quote.vatHalalas
    );
  });
});

describe("computeOwnerPayout", () => {
  it("computes payout with correct commission deduction", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 500_000,
      commissionPct: DEFAULT_PLATFORM_FEE_PCT,
    });

    expect(payout.grossHalalas).toBe(500_000);
    expect(payout.commissionHalalas).toBe(100_000);
    expect(payout.netHalalas).toBe(400_000);
  });

  it("ensures gross = commission + net", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 333_333,
      commissionPct: 20,
    });

    expect(payout.grossHalalas).toBe(
      payout.commissionHalalas + payout.netHalalas
    );
  });

  it("handles 0% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 0,
    });

    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(100_000);
  });
});
