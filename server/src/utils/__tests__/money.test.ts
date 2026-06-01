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
} from "../money.js";

// ---------------------------------------------------------------------------
// sarToHalalas / halalasToSar
// ---------------------------------------------------------------------------
describe("sarToHalalas", () => {
  it("converts whole SAR to halalas", () => {
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(0)).toBe(0);
    expect(sarToHalalas(1000)).toBe(100_000);
  });

  it("rounds fractional SAR correctly", () => {
    expect(sarToHalalas(9.99)).toBe(999);
    expect(sarToHalalas(0.01)).toBe(1);
    expect(sarToHalalas(49.995)).toBe(5000); // rounds 4999.5 -> 5000
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(0)).toBe(0);
    expect(halalasToSar(100_000)).toBe(1000);
  });

  it("preserves fractional SAR values", () => {
    expect(halalasToSar(50)).toBe(0.5);
    expect(halalasToSar(1)).toBe(0.01);
    expect(halalasToSar(99)).toBe(0.99);
  });
});

// ---------------------------------------------------------------------------
// formatHalalas
// ---------------------------------------------------------------------------
describe("formatHalalas", () => {
  it("formats zero correctly", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0.00");
    expect(result).toContain("SAR");
  });

  it("formats a round amount", () => {
    const result = formatHalalas(10_000);
    expect(result).toContain("100.00");
    expect(result).toContain("SAR");
  });

  it("formats fractional amounts with two decimal places", () => {
    const result = formatHalalas(999);
    expect(result).toContain("9.99");
    expect(result).toContain("SAR");
  });
});

// ---------------------------------------------------------------------------
// computeRentalQuote
// ---------------------------------------------------------------------------
describe("computeRentalQuote", () => {
  it("computes a basic 1-day rental with default fee", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000, // 100 SAR/day
      durationDays: 1,
    });
    // subtotal = 10,000
    expect(q.rentalSubtotalHalalas).toBe(10_000);
    // platform fee 20% of 10,000 = 2,000
    expect(q.platformFeeHalalas).toBe(2_000);
    // preVat = 12,000; VAT 15% = 1,800
    expect(q.vatHalalas).toBe(1_800);
    // total = 12,000 + 1,800 = 13,800
    expect(q.totalPayableHalalas).toBe(13_800);
  });

  it("computes a multi-day rental", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 5_000, // 50 SAR/day
      durationDays: 7,
    });
    expect(q.rentalSubtotalHalalas).toBe(35_000);
    expect(q.platformFeeHalalas).toBe(7_000); // 20% of 35,000
    const preVat = 35_000 + 7_000;
    expect(q.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(q.totalPayableHalalas).toBe(preVat + q.vatHalalas);
  });

  it("uses custom platform fee percentage", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });
    expect(q.platformFeeHalalas).toBe(1_000); // 10% of 10,000
  });

  it("returns correct dailyPriceHalalas and durationDays", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 7_777,
      durationDays: 3,
    });
    expect(q.dailyPriceHalalas).toBe(7_777);
    expect(q.durationDays).toBe(3);
  });

  it("handles zero-day rental (edge case)", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 0,
    });
    expect(q.rentalSubtotalHalalas).toBe(0);
    expect(q.platformFeeHalalas).toBe(0);
    expect(q.vatHalalas).toBe(0);
    expect(q.totalPayableHalalas).toBe(0);
  });

  it("rounds platform fee and VAT to nearest halala", () => {
    // 3 * 3333 = 9999; 20% of 9999 = 1999.8 -> 2000
    const q = computeRentalQuote({
      dailyPriceHalalas: 3_333,
      durationDays: 3,
    });
    expect(Number.isInteger(q.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(q.vatHalalas)).toBe(true);
    expect(Number.isInteger(q.totalPayableHalalas)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeOwnerPayout
// ---------------------------------------------------------------------------
describe("computeOwnerPayout", () => {
  it("computes owner payout with default commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: DEFAULT_PLATFORM_FEE_PCT,
    });
    expect(p.grossHalalas).toBe(100_000);
    expect(p.commissionHalalas).toBe(20_000); // 20%
    expect(p.netHalalas).toBe(80_000);
  });

  it("computes with custom commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 15,
    });
    expect(p.commissionHalalas).toBe(7_500);
    expect(p.netHalalas).toBe(42_500);
  });

  it("handles zero commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(p.commissionHalalas).toBe(0);
    expect(p.netHalalas).toBe(50_000);
  });

  it("rounds commission to the nearest halala", () => {
    // 33333 * 20 / 100 = 6666.6 -> 6667
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 33_333,
      commissionPct: 20,
    });
    expect(Number.isInteger(p.commissionHalalas)).toBe(true);
    expect(p.commissionHalalas).toBe(6_667);
    expect(p.netHalalas).toBe(33_333 - 6_667);
  });
});

// ---------------------------------------------------------------------------
// VAT rate constant
// ---------------------------------------------------------------------------
describe("constants", () => {
  it("has 15% VAT rate", () => {
    expect(VAT_RATE).toBe(0.15);
  });

  it("has 100 halalas per SAR", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });

  it("has 20% default platform fee", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });
});
