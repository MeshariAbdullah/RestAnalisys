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

describe("sarToHalalas", () => {
  it("converts whole SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("rounds fractional halalas", () => {
    // 1.005 * 100 = 100.49999... in IEEE 754, rounds to 100
    expect(sarToHalalas(1.005)).toBe(100);
    expect(sarToHalalas(1.006)).toBe(101); // 100.6 rounds to 101
    expect(sarToHalalas(1.004)).toBe(100);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(50)).toBe(0.5);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix and 2 decimal places", () => {
    const formatted = formatHalalas(150_000);
    expect(formatted).toContain("SAR");
    expect(formatted).toContain("1,500.00");
  });

  it("handles zero", () => {
    const formatted = formatHalalas(0);
    expect(formatted).toContain("0.00");
    expect(formatted).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct subtotal for daily price × duration", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000, // 100 SAR/day
      durationDays: 5,
    });
    expect(quote.rentalSubtotalHalalas).toBe(50_000); // 500 SAR
  });

  it("applies default 20% platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 5,
    });
    expect(quote.platformFeeHalalas).toBe(10_000); // 20% of 50,000
  });

  it("applies custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 5,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(5_000); // 10% of 50,000
  });

  it("computes 15% VAT on subtotal + platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 5,
    });
    // pre-VAT = 50,000 + 10,000 = 60,000
    // VAT = 60,000 * 0.15 = 9,000
    expect(quote.vatHalalas).toBe(9_000);
  });

  it("computes correct total payable", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 5,
    });
    // subtotal 50,000 + fee 10,000 + VAT 9,000 = 69,000
    expect(quote.totalPayableHalalas).toBe(69_000);
  });

  it("preserves daily price and duration in output", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 20_000,
      durationDays: 3,
    });
    expect(quote.dailyPriceHalalas).toBe(20_000);
    expect(quote.durationDays).toBe(3);
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 1,
    });
    expect(quote.rentalSubtotalHalalas).toBe(100_000);
    expect(quote.totalPayableHalalas).toBeGreaterThan(quote.rentalSubtotalHalalas);
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
  it("computes commission and net correctly", () => {
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
      rentalSubtotalHalalas: 100_000,
      commissionPct: 0,
    });
    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(100_000);
  });

  it("rounds commission to integer halalas", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 33_333,
      commissionPct: 20,
    });
    expect(Number.isInteger(payout.commissionHalalas)).toBe(true);
    expect(Number.isInteger(payout.netHalalas)).toBe(true);
  });
});

describe("constants", () => {
  it("VAT rate is 15%", () => {
    expect(VAT_RATE).toBe(0.15);
  });

  it("default platform fee is 20%", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });

  it("100 halalas per SAR", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });
});
