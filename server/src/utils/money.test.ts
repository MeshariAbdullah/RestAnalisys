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
  it("converts whole SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10_000);
  });

  it("converts fractional SAR to halalas", () => {
    expect(sarToHalalas(10.5)).toBe(1_050);
  });

  it("rounds to nearest halala", () => {
    expect(sarToHalalas(10.555)).toBe(1_056);
  });

  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(10_000)).toBe(100);
  });

  it("handles fractional SAR", () => {
    expect(halalasToSar(1_050)).toBe(10.5);
  });
});

describe("formatHalalas", () => {
  it("formats halalas as SAR with 2 decimals", () => {
    const result = formatHalalas(150_000);
    expect(result).toMatch(/1,500\.00\s*SAR/);
  });

  it("formats zero", () => {
    const result = formatHalalas(0);
    expect(result).toMatch(/0\.00\s*SAR/);
  });
});

describe("computeRentalQuote", () => {
  it("calculates rental quote correctly", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });

    expect(quote.dailyPriceHalalas).toBe(10_000);
    expect(quote.durationDays).toBe(7);
    expect(quote.rentalSubtotalHalalas).toBe(70_000);
    expect(quote.platformFeeHalalas).toBe(14_000);
    const preVat = 70_000 + 14_000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("uses custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 10,
      platformFeePct: 15,
    });

    expect(quote.rentalSubtotalHalalas).toBe(100_000);
    expect(quote.platformFeeHalalas).toBe(15_000);
  });

  it("defaults to 20% platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
    });

    expect(quote.platformFeeHalalas).toBe(
      Math.round((10_000 * DEFAULT_PLATFORM_FEE_PCT) / 100)
    );
  });

  it("handles single-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50_000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(50_000);
  });

  it("preserves integer arithmetic (no floating point drift)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 33_333,
      durationDays: 3,
    });

    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });

  it("total equals subtotal + fee + vat", () => {
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
  it("calculates payout correctly", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });

    expect(payout.grossHalalas).toBe(100_000);
    expect(payout.commissionHalalas).toBe(20_000);
    expect(payout.netHalalas).toBe(80_000);
  });

  it("handles custom commission rate", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 200_000,
      commissionPct: 15,
    });

    expect(payout.commissionHalalas).toBe(30_000);
    expect(payout.netHalalas).toBe(170_000);
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
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });

    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(50_000);
  });
});
