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
    expect(sarToHalalas(10.5)).toBe(1050);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("rounds fractional halalas", () => {
    // 1.005 * 100 = 100.49999... due to IEEE 754, so Math.round yields 100
    expect(sarToHalalas(1.005)).toBe(100);
    expect(sarToHalalas(1.006)).toBe(101);
    expect(sarToHalalas(1.004)).toBe(100);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(1050)).toBe(10.5);
    expect(halalasToSar(0)).toBe(0);
  });
});

describe("formatHalalas", () => {
  it("formats as SAR with 2 decimal places", () => {
    const formatted = formatHalalas(150000);
    expect(formatted).toContain("1,500.00");
    expect(formatted).toContain("SAR");
  });

  it("handles zero", () => {
    const formatted = formatHalalas(0);
    expect(formatted).toContain("0.00");
    expect(formatted).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct totals with default platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000, // 100 SAR/day
      durationDays: 7,
    });

    expect(quote.rentalSubtotalHalalas).toBe(70_000);
    expect(quote.platformFeeHalalas).toBe(14_000); // 20% of 70,000
    const preVat = 70_000 + 14_000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE)); // 15% of 84,000 = 12,600
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("respects custom platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 10,
      platformFeePct: 15,
    });

    expect(quote.rentalSubtotalHalalas).toBe(100_000);
    expect(quote.platformFeeHalalas).toBe(15_000); // 15% of 100,000
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50_000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(50_000);
    expect(quote.durationDays).toBe(1);
    expect(quote.dailyPriceHalalas).toBe(50_000);
  });

  it("produces integer halalas (no floating point)", () => {
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
  it("computes correct payout with commission deduction", () => {
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

  it("produces integer halalas", () => {
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
});
