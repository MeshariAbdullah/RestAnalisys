import { describe, it, expect } from "vitest";
import {
  sarToHalalas,
  halalasToSar,
  formatHalalas,
  computeRentalQuote,
  computeOwnerPayout,
} from "../money.js";

// ---------------------------------------------------------------------------
// sarToHalalas
// ---------------------------------------------------------------------------
describe("sarToHalalas", () => {
  it("converts 1 SAR to 100 halalas", () => {
    expect(sarToHalalas(1)).toBe(100);
  });

  it("converts 0 SAR to 0 halalas", () => {
    expect(sarToHalalas(0)).toBe(0);
  });

  it("converts 99.99 SAR to 9999 halalas", () => {
    expect(sarToHalalas(99.99)).toBe(9999);
  });
});

// ---------------------------------------------------------------------------
// halalasToSar
// ---------------------------------------------------------------------------
describe("halalasToSar", () => {
  it("converts 100 halalas to 1 SAR", () => {
    expect(halalasToSar(100)).toBe(1);
  });

  it("converts 0 halalas to 0 SAR", () => {
    expect(halalasToSar(0)).toBe(0);
  });

  it("converts 9999 halalas to 99.99 SAR", () => {
    expect(halalasToSar(9999)).toBe(99.99);
  });
});

// ---------------------------------------------------------------------------
// formatHalalas
// ---------------------------------------------------------------------------
describe("formatHalalas", () => {
  it("includes SAR in the output", () => {
    const result = formatHalalas(150_000);
    expect(result).toContain("SAR");
  });
});

// ---------------------------------------------------------------------------
// computeRentalQuote
// ---------------------------------------------------------------------------
describe("computeRentalQuote", () => {
  it("computes correct subtotal, platform fee, VAT, and total", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 5_000,
      durationDays: 7,
    });

    expect(q.rentalSubtotalHalalas).toBe(35_000);
    // Platform fee = 20% of 35,000 = 7,000
    expect(q.platformFeeHalalas).toBe(7_000);
    // VAT = 15% of (35,000 + 7,000) = 15% of 42,000 = 6,300
    expect(q.vatHalalas).toBe(6_300);
    // Total = 35,000 + 7,000 + 6,300 = 48,300
    expect(q.totalPayableHalalas).toBe(48_300);
  });

  it("uses a custom platformFeePct when provided", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 3,
      platformFeePct: 10,
    });

    expect(q.rentalSubtotalHalalas).toBe(30_000);
    // Platform fee = 10% of 30,000 = 3,000
    expect(q.platformFeeHalalas).toBe(3_000);
    // VAT = 15% of (30,000 + 3,000) = 15% of 33,000 = 4,950
    expect(q.vatHalalas).toBe(4_950);
    // Total = 30,000 + 3,000 + 4,950 = 37,950
    expect(q.totalPayableHalalas).toBe(37_950);
  });

  it("echoes back dailyPriceHalalas and durationDays", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 2_000,
      durationDays: 5,
    });
    expect(q.dailyPriceHalalas).toBe(2_000);
    expect(q.durationDays).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// computeOwnerPayout
// ---------------------------------------------------------------------------
describe("computeOwnerPayout", () => {
  it("computes correct commission and net payout", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 35_000,
      commissionPct: 20,
    });

    expect(p.grossHalalas).toBe(35_000);
    expect(p.commissionHalalas).toBe(7_000);
    expect(p.netHalalas).toBe(28_000);
  });

  it("handles 0% commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(p.commissionHalalas).toBe(0);
    expect(p.netHalalas).toBe(50_000);
  });
});
