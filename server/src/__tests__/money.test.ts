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
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(0)).toBe(0);
    expect(sarToHalalas(99.99)).toBe(9_999);
  });

  it("rounds to avoid floating point drift", () => {
    expect(sarToHalalas(0.1 + 0.2)).toBe(30);
    expect(sarToHalalas(1.5)).toBe(150);
    expect(sarToHalalas(99.995)).toBe(10000);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(0)).toBe(0);
    expect(halalasToSar(9_999)).toBe(99.99);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix", () => {
    const result = formatHalalas(250_000);
    expect(result).toContain("SAR");
    expect(result).toContain("2,500");
  });

  it("handles zero", () => {
    expect(formatHalalas(0)).toContain("0.00");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct totals for a basic rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });

    expect(quote.rentalSubtotalHalalas).toBe(70_000);
    expect(quote.platformFeeHalalas).toBe(14_000); // 20% of 70_000
    const preVat = 70_000 + 14_000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * 0.15)); // 12_600
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas); // 96_600
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

  it("handles zero duration", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 0,
    });
    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("handles 1-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50_000,
      durationDays: 1,
    });
    expect(quote.rentalSubtotalHalalas).toBe(50_000);
    expect(quote.platformFeeHalalas).toBe(10_000);
  });

  it("all amounts are integers (no FP drift)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 33_333,
      durationDays: 3,
    });
    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("computes commission and net correctly", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    expect(payout.grossHalalas).toBe(100_000);
    expect(payout.commissionHalalas).toBe(20_000);
    expect(payout.netHalalas).toBe(80_000);
  });

  it("handles custom commission rates", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 15,
    });
    expect(payout.commissionHalalas).toBe(15_000);
    expect(payout.netHalalas).toBe(85_000);
  });

  it("handles zero commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 0,
    });
    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(100_000);
  });

  it("rounds commission to avoid FP drift", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 33_333,
      commissionPct: 20,
    });
    expect(Number.isInteger(payout.commissionHalalas)).toBe(true);
    expect(Number.isInteger(payout.netHalalas)).toBe(true);
  });
});

describe("constants", () => {
  it("VAT rate is 15%", () => expect(VAT_RATE).toBe(0.15));
  it("default platform fee is 20%", () => expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20));
});
