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
  it("converts whole SAR", () => expect(sarToHalalas(100)).toBe(10_000));
  it("converts fractional SAR", () => expect(sarToHalalas(99.99)).toBe(9_999));
  it("rounds sub-halala amounts", () => expect(sarToHalalas(10.005)).toBe(1_001));
  it("handles zero", () => expect(sarToHalalas(0)).toBe(0));
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => expect(halalasToSar(10_000)).toBe(100));
  it("handles fractional SAR", () => expect(halalasToSar(9_999)).toBe(99.99));
  it("handles zero", () => expect(halalasToSar(0)).toBe(0));
});

describe("formatHalalas", () => {
  it("formats with SAR suffix", () => {
    const result = formatHalalas(10_000);
    expect(result).toContain("SAR");
    expect(result).toContain("100");
  });
  it("includes two decimal places", () => {
    const result = formatHalalas(10_050);
    expect(result).toContain(".50");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct subtotal", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 50_000, durationDays: 3 });
    expect(quote.rentalSubtotalHalalas).toBe(150_000);
  });

  it("computes 20% platform fee by default", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 50_000, durationDays: 1 });
    expect(quote.platformFeeHalalas).toBe(10_000);
  });

  it("computes 15% VAT on subtotal + fee", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 100_000, durationDays: 1 });
    const preVat = quote.rentalSubtotalHalalas + quote.platformFeeHalalas;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
  });

  it("total = subtotal + fee + vat", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 75_000, durationDays: 7 });
    expect(quote.totalPayableHalalas).toBe(
      quote.rentalSubtotalHalalas + quote.platformFeeHalalas + quote.vatHalalas
    );
  });

  it("accepts custom platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 1,
      platformFeePct: 15,
    });
    expect(quote.platformFeeHalalas).toBe(15_000);
  });

  it("handles zero-day rental", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 50_000, durationDays: 0 });
    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("produces integer halalas (no floating point drift)", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 33_333, durationDays: 7 });
    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("deducts commission from gross", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    expect(payout.grossHalalas).toBe(100_000);
    expect(payout.commissionHalalas).toBe(20_000);
    expect(payout.netHalalas).toBe(80_000);
  });

  it("net + commission = gross", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 333_333,
      commissionPct: 15,
    });
    expect(payout.netHalalas + payout.commissionHalalas).toBe(payout.grossHalalas);
  });

  it("handles zero commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(payout.netHalalas).toBe(50_000);
    expect(payout.commissionHalalas).toBe(0);
  });
});
