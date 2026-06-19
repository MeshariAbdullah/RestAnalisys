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
  it("converts SAR to halalas correctly", () => {
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(0)).toBe(0);
    expect(sarToHalalas(99.99)).toBe(9999);
    expect(sarToHalalas(1000)).toBe(100_000);
  });

  it("rounds fractional halalas", () => {
    // 1.005 * 100 = 100.49999... in IEEE 754, rounds to 100
    expect(sarToHalalas(1.005)).toBe(100);
    expect(sarToHalalas(1.006)).toBe(101);
    expect(sarToHalalas(1.004)).toBe(100);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR correctly", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(0)).toBe(0);
    expect(halalasToSar(9999)).toBe(99.99);
    expect(halalasToSar(100_000)).toBe(1000);
  });
});

describe("formatHalalas", () => {
  it("formats halalas as SAR string", () => {
    const result = formatHalalas(150_000);
    expect(result).toContain("1,500.00");
    expect(result).toContain("SAR");
  });

  it("handles zero", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0.00");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("calculates correct quote for a standard rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });

    expect(quote.dailyPriceHalalas).toBe(10_000);
    expect(quote.durationDays).toBe(7);
    expect(quote.rentalSubtotalHalalas).toBe(70_000);
    expect(quote.platformFeeHalalas).toBe(
      Math.round((70_000 * DEFAULT_PLATFORM_FEE_PCT) / 100)
    );

    const preVat = quote.rentalSubtotalHalalas + quote.platformFeeHalalas;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("uses default platform fee when not specified", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
    });
    expect(quote.platformFeeHalalas).toBe(
      Math.round((10_000 * DEFAULT_PLATFORM_FEE_PCT) / 100)
    );
  });

  it("allows custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(1_000);
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 5_000,
      durationDays: 1,
    });
    expect(quote.rentalSubtotalHalalas).toBe(5_000);
  });

  it("never produces floating-point amounts", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 3_333,
      durationDays: 3,
    });
    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });

  it("ensures total = subtotal + fee + vat", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 7_777,
      durationDays: 13,
    });
    expect(quote.totalPayableHalalas).toBe(
      quote.rentalSubtotalHalalas + quote.platformFeeHalalas + quote.vatHalalas
    );
  });
});

describe("computeOwnerPayout", () => {
  it("calculates correct payout split", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    expect(payout.grossHalalas).toBe(100_000);
    expect(payout.commissionHalalas).toBe(20_000);
    expect(payout.netHalalas).toBe(80_000);
  });

  it("handles 0% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(50_000);
  });

  it("ensures gross = commission + net", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 77_777,
      commissionPct: 15,
    });
    expect(payout.grossHalalas).toBe(
      payout.commissionHalalas + payout.netHalalas
    );
  });
});

describe("constants", () => {
  it("VAT rate is 15%", () => {
    expect(VAT_RATE).toBe(0.15);
  });

  it("platform fee is 20%", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });

  it("100 halalas per SAR", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });
});
