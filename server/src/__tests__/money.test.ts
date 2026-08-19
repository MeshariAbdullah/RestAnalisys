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
    expect(sarToHalalas(180_000)).toBe(18_000_000);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("rounds fractional SAR correctly", () => {
    expect(sarToHalalas(99.99)).toBe(9999);
    expect(sarToHalalas(0.01)).toBe(1);
    expect(sarToHalalas(0.005)).toBe(1);
  });

  it("converts halalas back to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(18_000_000)).toBe(180_000);
    expect(halalasToSar(0)).toBe(0);
    expect(halalasToSar(1)).toBe(0.01);
  });

  it("round-trips cleanly for whole SAR", () => {
    expect(halalasToSar(sarToHalalas(1234))).toBe(1234);
  });
});

describe("formatHalalas", () => {
  it("formats with two decimal places", () => {
    const result = formatHalalas(180_000);
    expect(result).toContain("1,800.00");
    expect(result).toContain("SAR");
  });

  it("formats zero", () => {
    expect(formatHalalas(0)).toContain("0.00");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct breakdown for a 5-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 120_000,
      durationDays: 5,
    });

    expect(quote.dailyPriceHalalas).toBe(120_000);
    expect(quote.durationDays).toBe(5);
    expect(quote.rentalSubtotalHalalas).toBe(600_000);
    expect(quote.platformFeeHalalas).toBe(120_000);
    const preVat = 600_000 + 120_000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("handles 1-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 250_000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(250_000);
    expect(quote.platformFeeHalalas).toBe(50_000);
  });

  it("accepts custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 3,
      platformFeePct: 10,
    });

    expect(quote.rentalSubtotalHalalas).toBe(300_000);
    expect(quote.platformFeeHalalas).toBe(30_000);
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

  it("produces integer amounts (no floating-point drift)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 333,
      durationDays: 7,
    });

    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("computes correct payout split", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 600_000,
      commissionPct: DEFAULT_PLATFORM_FEE_PCT,
    });

    expect(payout.grossHalalas).toBe(600_000);
    expect(payout.commissionHalalas).toBe(120_000);
    expect(payout.netHalalas).toBe(480_000);
  });

  it("net + commission = gross", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 333_333,
      commissionPct: 20,
    });

    expect(payout.netHalalas + payout.commissionHalalas).toBe(payout.grossHalalas);
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
