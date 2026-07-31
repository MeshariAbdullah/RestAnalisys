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
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(10.5)).toBe(1050);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("rounds to avoid floating-point drift", () => {
    expect(sarToHalalas(1.999)).toBe(200);
    expect(sarToHalalas(0.001)).toBe(0);
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
  it("formats halalas as SAR string", () => {
    const result = formatHalalas(150000);
    expect(result).toContain("SAR");
    expect(result).toContain("1,500.00");
  });

  it("handles zero", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0.00");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct rental pricing", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 7,
    });

    expect(quote.dailyPriceHalalas).toBe(10000);
    expect(quote.durationDays).toBe(7);
    expect(quote.rentalSubtotalHalalas).toBe(70000);
    expect(quote.platformFeeHalalas).toBe(14000); // 20% of 70000
    const preVat = 70000 + 14000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE)); // 15% VAT
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("accepts custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 1,
      platformFeePct: 10,
    });

    expect(quote.platformFeeHalalas).toBe(1000); // 10% of 10000
  });

  it("handles zero daily price", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 0,
      durationDays: 7,
    });

    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.platformFeeHalalas).toBe(0);
    expect(quote.vatHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(50000);
  });
});

describe("computeOwnerPayout", () => {
  it("computes correct payout after commission", () => {
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
      rentalSubtotalHalalas: 100000,
      commissionPct: 0,
    });

    expect(payout.netHalalas).toBe(100000);
  });
});

describe("constants", () => {
  it("has correct VAT rate for Saudi Arabia", () => {
    expect(VAT_RATE).toBe(0.15);
  });

  it("has correct halalas per SAR", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });

  it("has default platform fee of 20%", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });
});
