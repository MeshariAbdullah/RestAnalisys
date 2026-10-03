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
  it("converts SAR to halalas", () => {
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(99.99)).toBe(9999);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("rounds fractional halalas", () => {
    expect(sarToHalalas(1.006)).toBe(101);
    expect(sarToHalalas(1.004)).toBe(100);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(9999)).toBe(99.99);
    expect(halalasToSar(0)).toBe(0);
  });
});

describe("formatHalalas", () => {
  it("formats as SAR string", () => {
    const result = formatHalalas(150000);
    expect(result).toContain("SAR");
    expect(result).toContain("1,500.00");
  });

  it("handles zero", () => {
    expect(formatHalalas(0)).toContain("0.00");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct rental quote with default fee", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10000, durationDays: 7 });
    expect(q.dailyPriceHalalas).toBe(10000);
    expect(q.durationDays).toBe(7);
    expect(q.rentalSubtotalHalalas).toBe(70000);
    expect(q.platformFeeHalalas).toBe(14000); // 20%
    const preVat = 70000 + 14000;
    expect(q.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(q.totalPayableHalalas).toBe(preVat + q.vatHalalas);
  });

  it("accepts custom platform fee", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 10,
      platformFeePct: 10,
    });
    expect(q.platformFeeHalalas).toBe(10000); // 10% of 100000
  });

  it("handles single day rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 5000, durationDays: 1 });
    expect(q.rentalSubtotalHalalas).toBe(5000);
  });

  it("never produces negative amounts", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 0, durationDays: 0 });
    expect(q.rentalSubtotalHalalas).toBe(0);
    expect(q.platformFeeHalalas).toBe(0);
    expect(q.vatHalalas).toBe(0);
    expect(q.totalPayableHalalas).toBe(0);
  });
});

describe("computeOwnerPayout", () => {
  it("computes correct payout", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 100000,
      commissionPct: 20,
    });
    expect(p.grossHalalas).toBe(100000);
    expect(p.commissionHalalas).toBe(20000);
    expect(p.netHalalas).toBe(80000);
  });

  it("gross = commission + net always holds", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 77777,
      commissionPct: 15,
    });
    expect(p.grossHalalas).toBe(p.commissionHalalas + p.netHalalas);
  });
});
