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
  it("defines correct VAT rate (15%)", () => {
    expect(VAT_RATE).toBe(0.15);
  });

  it("defines correct platform fee (20%)", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });

  it("defines correct halalas per SAR (100)", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });
});

describe("sarToHalalas", () => {
  it("converts whole SAR", () => {
    expect(sarToHalalas(100)).toBe(10_000);
  });

  it("converts fractional SAR", () => {
    expect(sarToHalalas(99.99)).toBe(9_999);
  });

  it("rounds to avoid floating-point drift", () => {
    expect(sarToHalalas(0.01)).toBe(1);
    expect(sarToHalalas(0.1)).toBe(10);
  });

  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
  });
});

describe("halalasToSar", () => {
  it("converts whole amounts", () => {
    expect(halalasToSar(10_000)).toBe(100);
  });

  it("converts fractional amounts", () => {
    expect(halalasToSar(9_999)).toBe(99.99);
  });

  it("handles zero", () => {
    expect(halalasToSar(0)).toBe(0);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix", () => {
    const result = formatHalalas(10_000);
    expect(result).toContain("SAR");
    expect(result).toContain("100");
  });

  it("formats zero", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("calculates correctly for a basic rental", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 50_000,
      durationDays: 3,
    });

    expect(q.dailyPriceHalalas).toBe(50_000);
    expect(q.durationDays).toBe(3);
    expect(q.rentalSubtotalHalalas).toBe(150_000);
    expect(q.platformFeeHalalas).toBe(30_000); // 20% of 150k
    expect(q.vatHalalas).toBe(27_000); // 15% of (150k + 30k)
    expect(q.totalPayableHalalas).toBe(207_000); // 150k + 30k + 27k
  });

  it("allows custom platform fee", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 100_000,
      durationDays: 1,
      platformFeePct: 10,
    });

    expect(q.rentalSubtotalHalalas).toBe(100_000);
    expect(q.platformFeeHalalas).toBe(10_000); // 10% of 100k
    const preVat = 100_000 + 10_000;
    expect(q.vatHalalas).toBe(Math.round(preVat * 0.15)); // 16500
    expect(q.totalPayableHalalas).toBe(preVat + q.vatHalalas);
  });

  it("handles single day rental", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 20_000,
      durationDays: 1,
    });
    expect(q.rentalSubtotalHalalas).toBe(20_000);
  });

  it("returns integer amounts (no floating-point)", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 33_333,
      durationDays: 7,
    });
    expect(Number.isInteger(q.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(q.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(q.vatHalalas)).toBe(true);
    expect(Number.isInteger(q.totalPayableHalalas)).toBe(true);
  });

  it("total = subtotal + platform fee + VAT", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 75_000,
      durationDays: 5,
    });
    expect(q.totalPayableHalalas).toBe(
      q.rentalSubtotalHalalas + q.platformFeeHalalas + q.vatHalalas
    );
  });
});

describe("computeOwnerPayout", () => {
  it("computes net payout correctly", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 150_000,
      commissionPct: 20,
    });
    expect(p.grossHalalas).toBe(150_000);
    expect(p.commissionHalalas).toBe(30_000);
    expect(p.netHalalas).toBe(120_000);
  });

  it("net = gross - commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 500_000,
      commissionPct: 15,
    });
    expect(p.netHalalas).toBe(p.grossHalalas - p.commissionHalalas);
  });

  it("handles zero commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 0,
    });
    expect(p.commissionHalalas).toBe(0);
    expect(p.netHalalas).toBe(100_000);
  });

  it("returns integer amounts", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 333_333,
      commissionPct: 17,
    });
    expect(Number.isInteger(p.commissionHalalas)).toBe(true);
    expect(Number.isInteger(p.netHalalas)).toBe(true);
  });
});
