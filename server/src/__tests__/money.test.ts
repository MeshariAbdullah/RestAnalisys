import { describe, it, expect } from "vitest";
import {
  sarToHalalas,
  halalasToSar,
  formatHalalas,
  computeRentalQuote,
  computeOwnerPayout,
  VAT_RATE,
} from "../utils/money.js";

describe("currency conversion", () => {
  it("converts SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(0.5)).toBe(50);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("converts halalas to SAR", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(50)).toBe(0.5);
    expect(halalasToSar(0)).toBe(0);
  });

  it("rounds correctly for fractional halalas", () => {
    expect(sarToHalalas(1.999)).toBe(200);
    expect(sarToHalalas(1.006)).toBe(101);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix and two decimal places", () => {
    const formatted = formatHalalas(150_000);
    expect(formatted).toContain("SAR");
    expect(formatted).toContain("1,500.00");
  });

  it("formats zero correctly", () => {
    expect(formatHalalas(0)).toContain("0.00");
  });
});

describe("computeRentalQuote", () => {
  it("calculates correct subtotal for daily price x duration", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });
    expect(q.rentalSubtotalHalalas).toBe(70_000);
  });

  it("applies default 20% platform fee", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });
    expect(q.platformFeeHalalas).toBe(14_000);
  });

  it("applies custom platform fee percentage", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
      platformFeePct: 10,
    });
    expect(q.platformFeeHalalas).toBe(7_000);
  });

  it("applies 15% VAT on subtotal + fee", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });
    const expectedPreVat = 70_000 + 14_000;
    const expectedVat = Math.round(expectedPreVat * VAT_RATE);
    expect(q.vatHalalas).toBe(expectedVat);
  });

  it("calculates total as subtotal + fee + VAT", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });
    expect(q.totalPayableHalalas).toBe(
      q.rentalSubtotalHalalas + q.platformFeeHalalas + q.vatHalalas
    );
  });

  it("handles single day rental", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 50_000,
      durationDays: 1,
    });
    expect(q.rentalSubtotalHalalas).toBe(50_000);
    expect(q.durationDays).toBe(1);
  });

  it("handles zero daily price", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 0,
      durationDays: 7,
    });
    expect(q.rentalSubtotalHalalas).toBe(0);
    expect(q.platformFeeHalalas).toBe(0);
    expect(q.vatHalalas).toBe(0);
    expect(q.totalPayableHalalas).toBe(0);
  });
});

describe("computeOwnerPayout", () => {
  it("calculates commission and net payout", () => {
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
      rentalSubtotalHalalas: 100_000,
      commissionPct: 0,
    });
    expect(p.commissionHalalas).toBe(0);
    expect(p.netHalalas).toBe(100_000);
  });
});
