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
  it("converts whole SAR to halalas", () => {
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(500)).toBe(50_000);
  });

  it("converts fractional SAR to halalas", () => {
    expect(sarToHalalas(1.5)).toBe(150);
    expect(sarToHalalas(99.99)).toBe(9999);
  });

  it("rounds to nearest halala", () => {
    expect(sarToHalalas(0.005)).toBe(1);
    expect(sarToHalalas(0.004)).toBe(0);
  });

  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(150)).toBe(1.5);
    expect(halalasToSar(50_000)).toBe(500);
  });

  it("handles zero", () => {
    expect(halalasToSar(0)).toBe(0);
  });
});

describe("formatHalalas", () => {
  it("formats with two decimal places", () => {
    const formatted = formatHalalas(150_000);
    expect(formatted).toContain("1,500.00");
    expect(formatted).toContain("SAR");
  });

  it("formats zero", () => {
    const formatted = formatHalalas(0);
    expect(formatted).toContain("0.00");
    expect(formatted).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct totals for a standard rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 7 });
    expect(q.rentalSubtotalHalalas).toBe(70_000);
    expect(q.platformFeeHalalas).toBe(14_000);
    const preVat = 70_000 + 14_000;
    expect(q.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(q.totalPayableHalalas).toBe(preVat + q.vatHalalas);
  });

  it("uses default platform fee when not specified", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 1 });
    expect(q.platformFeeHalalas).toBe(
      Math.round((10_000 * DEFAULT_PLATFORM_FEE_PCT) / 100)
    );
  });

  it("uses custom platform fee when specified", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });
    expect(q.platformFeeHalalas).toBe(1_000);
  });

  it("returns correct duration and daily price", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 5_000, durationDays: 14 });
    expect(q.dailyPriceHalalas).toBe(5_000);
    expect(q.durationDays).toBe(14);
  });

  it("handles single day rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 100_000, durationDays: 1 });
    expect(q.rentalSubtotalHalalas).toBe(100_000);
  });

  it("total always equals subtotal + fee + vat", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 7_777, durationDays: 13 });
    expect(q.totalPayableHalalas).toBe(
      q.rentalSubtotalHalalas + q.platformFeeHalalas + q.vatHalalas
    );
  });
});

describe("computeOwnerPayout", () => {
  it("computes correct payout after commission", () => {
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
    expect(p.commissionHalalas).toBe(0);
    expect(p.netHalalas).toBe(50_000);
  });

  it("net + commission = gross", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 73_333,
      commissionPct: 15,
    });
    expect(p.netHalalas + p.commissionHalalas).toBe(p.grossHalalas);
  });
});
