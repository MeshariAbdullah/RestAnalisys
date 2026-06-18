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
    expect(sarToHalalas(0.01)).toBe(1);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("converts halalas to SAR", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(1)).toBe(0.01);
    expect(halalasToSar(0)).toBe(0);
  });

  it("is a round-trip", () => {
    const amounts = [0, 1, 50, 100, 999, 10_000, 5_000_000];
    for (const h of amounts) {
      expect(sarToHalalas(halalasToSar(h))).toBe(h);
    }
  });
});

describe("formatHalalas", () => {
  it("formats halalas as SAR string", () => {
    const result = formatHalalas(150_000);
    expect(result).toContain("1,500.00");
    expect(result).toContain("SAR");
  });

  it("handles zero", () => {
    expect(formatHalalas(0)).toContain("0.00");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct totals for a basic rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50_000, // 500 SAR/day
      durationDays: 3,
    });

    expect(quote.dailyPriceHalalas).toBe(50_000);
    expect(quote.durationDays).toBe(3);
    expect(quote.rentalSubtotalHalalas).toBe(150_000); // 1,500 SAR
    expect(quote.platformFeeHalalas).toBe(30_000); // 20% of 150k
    expect(quote.vatHalalas).toBe(27_000); // 15% of (150k + 30k)
    expect(quote.totalPayableHalalas).toBe(207_000); // 150k + 30k + 27k
  });

  it("handles single-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
    });
    expect(quote.rentalSubtotalHalalas).toBe(10_000);
  });

  it("handles custom platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 1,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(10_000); // 10% of 100k
  });

  it("never produces floating-point amounts", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 33_333,
      durationDays: 7,
    });
    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });

  it("total = subtotal + fee + VAT", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 75_000,
      durationDays: 5,
    });
    expect(quote.totalPayableHalalas).toBe(
      quote.rentalSubtotalHalalas + quote.platformFeeHalalas + quote.vatHalalas
    );
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

  it("gross = commission + net", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 333_333,
      commissionPct: 20,
    });
    expect(payout.grossHalalas).toBe(payout.commissionHalalas + payout.netHalalas);
  });
});

describe("constants", () => {
  it("VAT_RATE is 15%", () => expect(VAT_RATE).toBe(0.15));
  it("platform fee is 20%", () => expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20));
});
