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
    expect(sarToHalalas(1500.5)).toBe(150050);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(150050)).toBe(1500.5);
    expect(halalasToSar(0)).toBe(0);
  });

  it("round-trips without drift", () => {
    const sar = 99999.99;
    expect(halalasToSar(sarToHalalas(sar))).toBe(sar);
  });
});

describe("formatHalalas", () => {
  it("formats as SAR string", () => {
    const result = formatHalalas(150000);
    expect(result).toContain("SAR");
    expect(result).toContain("1,500");
  });
});

describe("computeRentalQuote", () => {
  it("computes a basic quote correctly", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 7,
    });
    expect(quote.dailyPriceHalalas).toBe(10000);
    expect(quote.durationDays).toBe(7);
    expect(quote.rentalSubtotalHalalas).toBe(70000);
    expect(quote.platformFeeHalalas).toBe(Math.round(70000 * 0.2));
    const preVat = 70000 + quote.platformFeeHalalas;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(
      preVat + quote.vatHalalas
    );
  });

  it("uses custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 10,
      platformFeePct: 15,
    });
    expect(quote.platformFeeHalalas).toBe(Math.round(100000 * 0.15));
  });

  it("handles zero duration", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 0,
    });
    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("all amounts are integers (no FP drift)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 33333,
      durationDays: 3,
    });
    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("calculates commission and net correctly", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100000,
      commissionPct: 20,
    });
    expect(payout.grossHalalas).toBe(100000);
    expect(payout.commissionHalalas).toBe(20000);
    expect(payout.netHalalas).toBe(80000);
  });

  it("handles zero commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 50000,
      commissionPct: 0,
    });
    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(50000);
  });
});
