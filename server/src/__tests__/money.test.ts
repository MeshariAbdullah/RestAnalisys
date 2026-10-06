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

describe("constants", () => {
  it("VAT rate is 15%", () => {
    expect(VAT_RATE).toBe(0.15);
  });

  it("platform fee is 20%", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });

  it("halalas per SAR is 100", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });
});

describe("sarToHalalas", () => {
  it("converts whole SAR amounts", () => {
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("rounds fractional halalas", () => {
    expect(sarToHalalas(10.555)).toBe(1056);
    expect(sarToHalalas(10.554)).toBe(1055);
  });

  it("handles large amounts", () => {
    expect(sarToHalalas(100_000)).toBe(10_000_000);
  });
});

describe("halalasToSar", () => {
  it("converts whole halala amounts", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(0)).toBe(0);
  });

  it("preserves fractional SAR", () => {
    expect(halalasToSar(150)).toBe(1.5);
    expect(halalasToSar(1)).toBe(0.01);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix and 2 decimal places", () => {
    const result = formatHalalas(10_000);
    expect(result).toContain("100");
    expect(result).toContain("SAR");
  });

  it("formats zero correctly", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct quote for simple rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });
    expect(quote.dailyPriceHalalas).toBe(10_000);
    expect(quote.durationDays).toBe(7);
    expect(quote.rentalSubtotalHalalas).toBe(70_000);
    expect(quote.platformFeeHalalas).toBe(14_000);
    const preVat = 70_000 + 14_000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * 0.15));
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("uses default 20% platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
    });
    expect(quote.platformFeeHalalas).toBe(2_000);
  });

  it("accepts custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(1_000);
  });

  it("computes VAT at 15% on subtotal + fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 20_000,
      durationDays: 5,
    });
    const subtotal = 20_000 * 5;
    const fee = Math.round((subtotal * 20) / 100);
    const expectedVat = Math.round((subtotal + fee) * 0.15);
    expect(quote.vatHalalas).toBe(expectedVat);
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 5_000,
      durationDays: 1,
    });
    expect(quote.rentalSubtotalHalalas).toBe(5_000);
    expect(quote.totalPayableHalalas).toBeGreaterThan(quote.rentalSubtotalHalalas);
  });

  it("total = subtotal + fee + vat", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 15_000,
      durationDays: 10,
    });
    expect(quote.totalPayableHalalas).toBe(
      quote.rentalSubtotalHalalas + quote.platformFeeHalalas + quote.vatHalalas
    );
  });
});

describe("computeOwnerPayout", () => {
  it("computes net payout correctly", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    expect(payout.grossHalalas).toBe(100_000);
    expect(payout.commissionHalalas).toBe(20_000);
    expect(payout.netHalalas).toBe(80_000);
  });

  it("handles zero commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(50_000);
  });

  it("handles 100% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 100,
    });
    expect(payout.commissionHalalas).toBe(50_000);
    expect(payout.netHalalas).toBe(0);
  });

  it("rounds commission to nearest halala", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 33_333,
      commissionPct: 20,
    });
    expect(payout.commissionHalalas).toBe(Math.round((33_333 * 20) / 100));
    expect(payout.netHalalas).toBe(33_333 - payout.commissionHalalas);
  });
});
