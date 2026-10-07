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
  it("converts SAR to halalas", () => {
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(1800)).toBe(180_000);
  });

  it("rounds fractional halalas", () => {
    expect(sarToHalalas(10.555)).toBe(1056);
    expect(sarToHalalas(0.001)).toBe(0);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(180_000)).toBe(1800);
    expect(halalasToSar(50)).toBe(0.5);
  });
});

describe("formatHalalas", () => {
  it("formats halalas as SAR string", () => {
    const result = formatHalalas(180_000);
    expect(result).toContain("1,800");
    expect(result).toContain("SAR");
  });

  it("formats zero", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("calculates correct quote for a 3-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 180_000,
      durationDays: 3,
    });

    expect(quote.dailyPriceHalalas).toBe(180_000);
    expect(quote.durationDays).toBe(3);
    expect(quote.rentalSubtotalHalalas).toBe(540_000);

    const expectedFee = Math.round((540_000 * DEFAULT_PLATFORM_FEE_PCT) / 100);
    expect(quote.platformFeeHalalas).toBe(expectedFee);

    const preVat = 540_000 + expectedFee;
    const expectedVat = Math.round(preVat * VAT_RATE);
    expect(quote.vatHalalas).toBe(expectedVat);

    expect(quote.totalPayableHalalas).toBe(preVat + expectedVat);
  });

  it("uses custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 1,
      platformFeePct: 10,
    });

    expect(quote.platformFeeHalalas).toBe(10_000);
  });

  it("handles zero price gracefully", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 0,
      durationDays: 5,
    });

    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.platformFeeHalalas).toBe(0);
    expect(quote.vatHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 250_000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(250_000);
  });

  it("produces integer halalas (no floating point drift)", () => {
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
  it("calculates correct payout with default commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 540_000,
      commissionPct: 20,
    });

    expect(payout.grossHalalas).toBe(540_000);
    expect(payout.commissionHalalas).toBe(108_000);
    expect(payout.netHalalas).toBe(432_000);
  });

  it("net + commission = gross", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 1_000_000,
      commissionPct: 15,
    });

    expect(payout.netHalalas + payout.commissionHalalas).toBe(payout.grossHalalas);
  });

  it("handles zero commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 500_000,
      commissionPct: 0,
    });

    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(500_000);
  });
});
