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
  it("converts SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10000);
    expect(sarToHalalas(0)).toBe(0);
    expect(sarToHalalas(0.01)).toBe(1);
    expect(sarToHalalas(99.99)).toBe(9999);
  });

  it("rounds to nearest halala", () => {
    expect(sarToHalalas(10.005)).toBe(1001);
    expect(sarToHalalas(10.004)).toBe(1000);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(10000)).toBe(100);
    expect(halalasToSar(0)).toBe(0);
    expect(halalasToSar(1)).toBe(0.01);
    expect(halalasToSar(9999)).toBe(99.99);
  });
});

describe("constants", () => {
  it("has correct VAT rate", () => {
    expect(VAT_RATE).toBe(0.15);
  });
  it("has correct platform fee", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });
  it("has correct halala conversion", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });
});

describe("computeRentalQuote", () => {
  it("computes correct quote for basic rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 7,
    });

    expect(quote.dailyPriceHalalas).toBe(10000);
    expect(quote.durationDays).toBe(7);
    expect(quote.rentalSubtotalHalalas).toBe(70000);
    expect(quote.platformFeeHalalas).toBe(14000); // 20% of 70000
    expect(quote.vatHalalas).toBe(12600); // 15% of (70000 + 14000)
    expect(quote.totalPayableHalalas).toBe(96600); // 70000 + 14000 + 12600
  });

  it("handles zero price", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 0, durationDays: 5 });
    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.platformFeeHalalas).toBe(0);
    expect(quote.vatHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("handles one day rental", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 50000, durationDays: 1 });
    expect(quote.rentalSubtotalHalalas).toBe(50000);
    expect(quote.platformFeeHalalas).toBe(10000);
    expect(quote.vatHalalas).toBe(9000);
    expect(quote.totalPayableHalalas).toBe(69000);
  });

  it("allows custom platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 10,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(10000); // 10% of 100000
  });

  it("rounds to whole halalas", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 333,
      durationDays: 3,
    });
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("computes correct payout", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100000,
      commissionPct: 20,
    });
    expect(payout.grossHalalas).toBe(100000);
    expect(payout.commissionHalalas).toBe(20000);
    expect(payout.netHalalas).toBe(80000);
  });

  it("handles zero subtotal", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 0,
      commissionPct: 20,
    });
    expect(payout.netHalalas).toBe(0);
  });

  it("handles 100% commission edge case", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100000,
      commissionPct: 100,
    });
    expect(payout.netHalalas).toBe(0);
  });

  it("rounds commission to whole halalas", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 333,
      commissionPct: 15,
    });
    expect(Number.isInteger(payout.commissionHalalas)).toBe(true);
    expect(Number.isInteger(payout.netHalalas)).toBe(true);
  });
});

describe("formatHalalas", () => {
  it("formats halalas as SAR string", () => {
    const formatted = formatHalalas(100000);
    expect(formatted).toContain("SAR");
    expect(formatted).toContain("1,000");
  });

  it("formats zero", () => {
    const formatted = formatHalalas(0);
    expect(formatted).toContain("0");
    expect(formatted).toContain("SAR");
  });
});
