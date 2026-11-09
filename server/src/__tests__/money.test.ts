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
  it("converts 1 SAR to 100 halalas", () => {
    expect(sarToHalalas(1)).toBe(100);
  });

  it("converts fractional SAR correctly", () => {
    expect(sarToHalalas(1.5)).toBe(150);
    expect(sarToHalalas(0.01)).toBe(1);
  });

  it("rounds to the nearest halala", () => {
    expect(sarToHalalas(1.006)).toBe(101);
    expect(sarToHalalas(1.004)).toBe(100);
  });

  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
  });

  it("handles large amounts", () => {
    expect(sarToHalalas(100_000)).toBe(10_000_000);
  });
});

describe("halalasToSar", () => {
  it("converts 100 halalas to 1 SAR", () => {
    expect(halalasToSar(100)).toBe(1);
  });

  it("converts 0 halalas to 0 SAR", () => {
    expect(halalasToSar(0)).toBe(0);
  });

  it("handles odd amounts", () => {
    expect(halalasToSar(150)).toBe(1.5);
    expect(halalasToSar(1)).toBe(0.01);
  });
});

describe("formatHalalas", () => {
  it("formats with two decimal places and SAR suffix", () => {
    const result = formatHalalas(10000);
    expect(result).toContain("100");
    expect(result).toContain("SAR");
  });

  it("formats zero correctly", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0");
    expect(result).toContain("SAR");
  });

  it("formats fractional SAR", () => {
    const result = formatHalalas(150);
    expect(result).toContain("1.50");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes subtotal as daily price * days", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 5000, durationDays: 7 });
    expect(q.rentalSubtotalHalalas).toBe(35_000);
  });

  it("applies the default 20% platform fee", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 5000, durationDays: 7 });
    expect(q.platformFeeHalalas).toBe(Math.round(35_000 * 0.20));
  });

  it("applies a custom platform fee percentage", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 10,
      platformFeePct: 15,
    });
    expect(q.platformFeeHalalas).toBe(Math.round(100_000 * 0.15));
  });

  it("computes 15% VAT on subtotal + platform fee", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 5000, durationDays: 7 });
    const preVat = q.rentalSubtotalHalalas + q.platformFeeHalalas;
    expect(q.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
  });

  it("computes total as subtotal + fee + VAT", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 5000, durationDays: 7 });
    expect(q.totalPayableHalalas).toBe(
      q.rentalSubtotalHalalas + q.platformFeeHalalas + q.vatHalalas
    );
  });

  it("returns the daily price and duration in the result", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 3000, durationDays: 3 });
    expect(q.dailyPriceHalalas).toBe(3000);
    expect(q.durationDays).toBe(3);
  });

  it("handles zero daily price", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 0, durationDays: 5 });
    expect(q.rentalSubtotalHalalas).toBe(0);
    expect(q.platformFeeHalalas).toBe(0);
    expect(q.vatHalalas).toBe(0);
    expect(q.totalPayableHalalas).toBe(0);
  });

  it("handles 1-day rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10000, durationDays: 1 });
    expect(q.rentalSubtotalHalalas).toBe(10_000);
  });

  it("produces integer results (no floating point drift)", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 3333, durationDays: 7 });
    expect(Number.isInteger(q.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(q.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(q.vatHalalas)).toBe(true);
    expect(Number.isInteger(q.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("deducts commission from gross to get net", () => {
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

  it("rounds commission to nearest halala", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 33_333,
      commissionPct: 20,
    });
    expect(Number.isInteger(p.commissionHalalas)).toBe(true);
    expect(p.commissionHalalas).toBe(Math.round(33_333 * 0.20));
    expect(p.netHalalas).toBe(33_333 - p.commissionHalalas);
  });

  it("handles 100% commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 100,
    });
    expect(p.commissionHalalas).toBe(100_000);
    expect(p.netHalalas).toBe(0);
  });
});
