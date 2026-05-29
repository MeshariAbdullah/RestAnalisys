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
    expect(sarToHalalas(0)).toBe(0);
    expect(sarToHalalas(99.99)).toBe(9999);
    expect(sarToHalalas(1234.56)).toBe(123456);
  });

  it("rounds to nearest halala", () => {
    // 1.005 * 100 = 100.49999... due to IEEE 754, rounds to 100
    expect(sarToHalalas(1.005)).toBe(100);
    expect(sarToHalalas(1.006)).toBe(101);
    expect(sarToHalalas(1.004)).toBe(100);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(0)).toBe(0);
    expect(halalasToSar(9999)).toBe(99.99);
    expect(halalasToSar(50)).toBe(0.5);
  });
});

describe("formatHalalas", () => {
  it("formats halalas as SAR string", () => {
    const result = formatHalalas(150000);
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
  it("calculates correct totals for a basic rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });

    expect(quote.dailyPriceHalalas).toBe(10_000);
    expect(quote.durationDays).toBe(7);
    expect(quote.rentalSubtotalHalalas).toBe(70_000);

    const expectedFee = Math.round((70_000 * DEFAULT_PLATFORM_FEE_PCT) / 100);
    expect(quote.platformFeeHalalas).toBe(expectedFee);

    const preVat = 70_000 + expectedFee;
    const expectedVat = Math.round(preVat * VAT_RATE);
    expect(quote.vatHalalas).toBe(expectedVat);
    expect(quote.totalPayableHalalas).toBe(preVat + expectedVat);
  });

  it("uses custom platform fee when provided", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });

    expect(quote.platformFeeHalalas).toBe(1_000);
  });

  it("handles zero duration gracefully", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 0,
    });
    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("never produces fractional halalas", () => {
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
  it("calculates correct payout after commission", () => {
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

  it("rounds commission to nearest halala", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 333,
      commissionPct: 20,
    });
    expect(Number.isInteger(payout.commissionHalalas)).toBe(true);
    expect(payout.grossHalalas).toBe(payout.commissionHalalas + payout.netHalalas);
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
