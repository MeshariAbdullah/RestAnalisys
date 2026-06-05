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
  it("converts whole SAR", () => {
    expect(sarToHalalas(100)).toBe(10_000);
  });
  it("converts fractional SAR", () => {
    expect(sarToHalalas(99.99)).toBe(9_999);
  });
  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
  });
  it("rounds to nearest halala", () => {
    expect(sarToHalalas(1.555)).toBe(156);
  });
});

describe("halalasToSar", () => {
  it("converts to SAR", () => {
    expect(halalasToSar(15_000)).toBe(150);
  });
  it("preserves fractional SAR", () => {
    expect(halalasToSar(9_999)).toBe(99.99);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix", () => {
    const result = formatHalalas(100_000);
    expect(result).toContain("SAR");
    expect(result).toContain("1,000");
  });
  it("formats zero", () => {
    expect(formatHalalas(0)).toContain("0");
    expect(formatHalalas(0)).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct totals for a standard rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 5 });
    expect(q.rentalSubtotalHalalas).toBe(50_000);
    expect(q.platformFeeHalalas).toBe(10_000); // 20% of 50k
    const preVat = 50_000 + 10_000;
    expect(q.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(q.totalPayableHalalas).toBe(preVat + q.vatHalalas);
  });

  it("uses custom platform fee percentage", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 10,
      platformFeePct: 10,
    });
    expect(q.rentalSubtotalHalalas).toBe(100_000);
    expect(q.platformFeeHalalas).toBe(10_000); // 10% of 100k
  });

  it("handles single day rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 5_000, durationDays: 1 });
    expect(q.rentalSubtotalHalalas).toBe(5_000);
  });

  it("preserves daily price and duration", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 7_500, durationDays: 14 });
    expect(q.dailyPriceHalalas).toBe(7_500);
    expect(q.durationDays).toBe(14);
  });

  it("total is subtotal + fee + vat", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 20_000, durationDays: 3 });
    expect(q.totalPayableHalalas).toBe(
      q.rentalSubtotalHalalas + q.platformFeeHalalas + q.vatHalalas
    );
  });

  it("all amounts are integers (no floating point)", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 33_333, durationDays: 7 });
    expect(Number.isInteger(q.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(q.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(q.vatHalalas)).toBe(true);
    expect(Number.isInteger(q.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("computes net payout after commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    expect(p.grossHalalas).toBe(100_000);
    expect(p.commissionHalalas).toBe(20_000);
    expect(p.netHalalas).toBe(80_000);
  });

  it("handles zero commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(p.netHalalas).toBe(50_000);
    expect(p.commissionHalalas).toBe(0);
  });

  it("net + commission = gross", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 75_000,
      commissionPct: 15,
    });
    expect(p.netHalalas + p.commissionHalalas).toBe(p.grossHalalas);
  });
});
