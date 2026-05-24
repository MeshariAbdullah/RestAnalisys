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
// Constants
// ---------------------------------------------------------------------------
describe("money constants", () => {
  it("VAT rate is 15%", () => {
    expect(VAT_RATE).toBe(0.15);
  });

  it("default platform fee is 20%", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });

  it("100 halalas per SAR", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// sarToHalalas
// ---------------------------------------------------------------------------
describe("sarToHalalas", () => {
  it("converts whole SAR to halalas", () => {
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(50)).toBe(5_000);
  });

  it("converts fractional SAR with rounding", () => {
    expect(sarToHalalas(1.5)).toBe(150);
    expect(sarToHalalas(99.99)).toBe(9_999);
    expect(sarToHalalas(0.005)).toBe(1); // rounds 0.5 up
  });

  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
  });

  it("handles large amounts", () => {
    expect(sarToHalalas(100_000)).toBe(10_000_000);
  });
});

// ---------------------------------------------------------------------------
// halalasToSar
// ---------------------------------------------------------------------------
describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(5_000)).toBe(50);
  });

  it("handles fractional results", () => {
    expect(halalasToSar(150)).toBe(1.5);
    expect(halalasToSar(1)).toBe(0.01);
  });

  it("handles zero", () => {
    expect(halalasToSar(0)).toBe(0);
  });

  it("round-trips with sarToHalalas", () => {
    expect(halalasToSar(sarToHalalas(42))).toBe(42);
    expect(halalasToSar(sarToHalalas(0))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatHalalas
// ---------------------------------------------------------------------------
describe("formatHalalas", () => {
  it("formats with two decimal places and SAR suffix", () => {
    const result = formatHalalas(50_000);
    expect(result).toMatch(/500\.00/);
    expect(result).toContain("SAR");
  });

  it("formats zero", () => {
    const result = formatHalalas(0);
    expect(result).toMatch(/0\.00/);
    expect(result).toContain("SAR");
  });

  it("formats fractional halalas", () => {
    const result = formatHalalas(150);
    expect(result).toMatch(/1\.50/);
    expect(result).toContain("SAR");
  });

  it("formats large amounts with separators", () => {
    const result = formatHalalas(10_000_000); // 100,000 SAR
    expect(result).toContain("SAR");
    // Should contain the numeric value 100000 or 100,000
    expect(result).toMatch(/100[,.]?000\.00/);
  });
});

// ---------------------------------------------------------------------------
// computeRentalQuote
// ---------------------------------------------------------------------------
describe("computeRentalQuote", () => {
  it("computes subtotal as daily price * days", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 3 });
    expect(q.rentalSubtotalHalalas).toBe(30_000);
  });

  it("applies 20% default platform fee on subtotal", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 3 });
    // 30,000 * 20% = 6,000
    expect(q.platformFeeHalalas).toBe(6_000);
  });

  it("applies 15% VAT on (subtotal + platform fee)", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 3 });
    // (30,000 + 6,000) * 15% = 5,400
    expect(q.vatHalalas).toBe(5_400);
  });

  it("computes total = subtotal + fee + vat", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 3 });
    // 30,000 + 6,000 + 5,400 = 41,400
    expect(q.totalPayableHalalas).toBe(41_400);
  });

  it("echoes back dailyPriceHalalas and durationDays", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 7_777, durationDays: 5 });
    expect(q.dailyPriceHalalas).toBe(7_777);
    expect(q.durationDays).toBe(5);
  });

  it("allows custom platform fee percentage", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });
    // subtotal = 10,000; fee = 1,000; preVat = 11,000; vat = 1,650
    expect(q.platformFeeHalalas).toBe(1_000);
    expect(q.vatHalalas).toBe(1_650);
    expect(q.totalPayableHalalas).toBe(12_650);
  });

  it("handles zero-day rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 0 });
    expect(q.rentalSubtotalHalalas).toBe(0);
    expect(q.platformFeeHalalas).toBe(0);
    expect(q.vatHalalas).toBe(0);
    expect(q.totalPayableHalalas).toBe(0);
  });

  it("handles zero price", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 0, durationDays: 5 });
    expect(q.rentalSubtotalHalalas).toBe(0);
    expect(q.totalPayableHalalas).toBe(0);
  });

  it("handles 0% platform fee", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 0,
    });
    expect(q.platformFeeHalalas).toBe(0);
    // VAT on subtotal only: 10,000 * 0.15 = 1,500
    expect(q.vatHalalas).toBe(1_500);
    expect(q.totalPayableHalalas).toBe(11_500);
  });

  it("rounds fee and VAT to whole halalas", () => {
    // e.g., 333 * 3 = 999 subtotal; 999 * 20% = 199.8 -> 200
    const q = computeRentalQuote({ dailyPriceHalalas: 333, durationDays: 3 });
    expect(Number.isInteger(q.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(q.vatHalalas)).toBe(true);
    expect(Number.isInteger(q.totalPayableHalalas)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeOwnerPayout
// ---------------------------------------------------------------------------
describe("computeOwnerPayout", () => {
  it("computes commission and net correctly", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    expect(p.grossHalalas).toBe(100_000);
    expect(p.commissionHalalas).toBe(20_000);
    expect(p.netHalalas).toBe(80_000);
  });

  it("handles 0% commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(p.commissionHalalas).toBe(0);
    expect(p.netHalalas).toBe(50_000);
  });

  it("handles 100% commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 100,
    });
    expect(p.commissionHalalas).toBe(50_000);
    expect(p.netHalalas).toBe(0);
  });

  it("handles zero subtotal", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 0,
      commissionPct: 20,
    });
    expect(p.grossHalalas).toBe(0);
    expect(p.commissionHalalas).toBe(0);
    expect(p.netHalalas).toBe(0);
  });

  it("rounds commission to whole halalas", () => {
    // 333 * 20% = 66.6 -> 67
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 333,
      commissionPct: 20,
    });
    expect(p.commissionHalalas).toBe(67);
    expect(p.netHalalas).toBe(266);
    expect(Number.isInteger(p.commissionHalalas)).toBe(true);
  });
});
