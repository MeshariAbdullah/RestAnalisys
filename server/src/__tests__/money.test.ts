import { describe, it, expect } from "vitest";
import {
  sarToHalalas,
  halalasToSar,
  formatHalalas,
  computeRentalQuote,
  computeOwnerPayout,
} from "../utils/money.js";

// ─── sarToHalalas ────────────────────────────────────────────────────────────

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

  it("converts fractional SAR correctly", () => {
    expect(sarToHalalas(0.5)).toBe(50);
  });

  it("converts large SAR amounts", () => {
    expect(sarToHalalas(1000)).toBe(100000);
  });
});

// ─── halalasToSar ────────────────────────────────────────────────────────────

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

  it("converts 50 halalas to 0.5 SAR", () => {
    expect(halalasToSar(50)).toBe(0.5);
  });

  it("round-trips with sarToHalalas", () => {
    expect(halalasToSar(sarToHalalas(42.42))).toBe(42.42);
  });
});

// ─── formatHalalas ───────────────────────────────────────────────────────────

describe("formatHalalas", () => {
  it("formats 100 halalas as 1.00 SAR", () => {
    const result = formatHalalas(100);
    expect(result).toContain("1.00");
    expect(result).toContain("SAR");
  });

  it("formats 9999 halalas as 99.99 SAR", () => {
    const result = formatHalalas(9999);
    expect(result).toContain("99.99");
    expect(result).toContain("SAR");
  });

  it("formats 0 halalas as 0.00 SAR", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0.00");
    expect(result).toContain("SAR");
  });

  it("formats large amounts", () => {
    const result = formatHalalas(10000000); // 100,000 SAR
    expect(result).toContain("SAR");
    expect(result).toContain("100");
  });
});

// ─── computeRentalQuote ──────────────────────────────────────────────────────

describe("computeRentalQuote", () => {
  it("computes a basic 3-day quote correctly", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 3,
      platformFeePct: 20,
    });

    // subtotal = 10000 * 3 = 30000
    expect(quote.rentalSubtotalHalalas).toBe(30000);

    // platform fee = 20% of 30000 = 6000
    expect(quote.platformFeeHalalas).toBe(6000);

    // VAT base = subtotal + platform fee = 36000
    // VAT = 15% of 36000 = 5400
    expect(quote.vatHalalas).toBe(5400);

    // total = 30000 + 6000 + 5400 = 41400
    expect(quote.totalPayableHalalas).toBe(41400);
  });

  it("applies a custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 3,
      platformFeePct: 10,
    });

    expect(quote.rentalSubtotalHalalas).toBe(30000);
    // 10% of 30000 = 3000
    expect(quote.platformFeeHalalas).toBe(3000);
    // VAT = 15% of (30000 + 3000) = 15% of 33000 = 4950
    expect(quote.vatHalalas).toBe(4950);
    // total = 30000 + 3000 + 4950 = 37950
    expect(quote.totalPayableHalalas).toBe(37950);
  });

  it("handles a single-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 5000,
      durationDays: 1,
      platformFeePct: 20,
    });

    expect(quote.rentalSubtotalHalalas).toBe(5000);
    expect(quote.platformFeeHalalas).toBe(1000);
    // VAT = 15% of 6000 = 900
    expect(quote.vatHalalas).toBe(900);
    expect(quote.totalPayableHalalas).toBe(6900);
  });

  it("handles zero daily price", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 0,
      durationDays: 5,
      platformFeePct: 20,
    });

    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.platformFeeHalalas).toBe(0);
    expect(quote.vatHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("uses default platform fee (20%) when not specified", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 1,
    });

    expect(quote.platformFeeHalalas).toBe(2000); // 20% of 10000
  });

  it("echoes dailyPriceHalalas and durationDays in the result", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 7500,
      durationDays: 4,
    });

    expect(quote.dailyPriceHalalas).toBe(7500);
    expect(quote.durationDays).toBe(4);
  });
});

// ─── computeOwnerPayout ──────────────────────────────────────────────────────

describe("computeOwnerPayout", () => {
  it("computes payout with standard 20% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 30000,
      commissionPct: 20,
    });

    // commission = 20% of 30000 = 6000
    expect(payout.commissionHalalas).toBe(6000);
    // owner receives = 30000 - 6000 = 24000
    expect(payout.netHalalas).toBe(24000);
    // gross preserved
    expect(payout.grossHalalas).toBe(30000);
  });

  it("computes payout with 0% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 30000,
      commissionPct: 0,
    });

    expect(payout.commissionHalalas).toBe(0);
    expect(payout.netHalalas).toBe(30000);
  });

  it("computes payout with 50% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100000,
      commissionPct: 50,
    });

    expect(payout.commissionHalalas).toBe(50000);
    expect(payout.netHalalas).toBe(50000);
  });

  it("computes payout with 15% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 20000,
      commissionPct: 15,
    });

    // 15% of 20000 = 3000
    expect(payout.commissionHalalas).toBe(3000);
    expect(payout.netHalalas).toBe(17000);
  });
});
