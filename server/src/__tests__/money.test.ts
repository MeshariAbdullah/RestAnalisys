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
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(500)).toBe(50_000);
  });

  it("converts fractional SAR with rounding", () => {
    expect(sarToHalalas(1.5)).toBe(150);
    expect(sarToHalalas(99.999)).toBe(10000);
  });

  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(150)).toBe(1.5);
    expect(halalasToSar(0)).toBe(0);
  });
});

describe("formatHalalas", () => {
  it("formats with SAR suffix and 2 decimal places", () => {
    const result = formatHalalas(150_000);
    expect(result).toContain("SAR");
    expect(result).toContain("1,500.00");
  });

  it("formats zero", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0.00");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes correct breakdown for a standard rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 10_000, durationDays: 5 });

    expect(q.dailyPriceHalalas).toBe(10_000);
    expect(q.durationDays).toBe(5);
    expect(q.rentalSubtotalHalalas).toBe(50_000);
    expect(q.platformFeeHalalas).toBe(10_000); // 20% of 50,000
    const preVat = 50_000 + 10_000;
    expect(q.vatHalalas).toBe(Math.round(preVat * VAT_RATE)); // 15% of 60,000 = 9,000
    expect(q.totalPayableHalalas).toBe(preVat + q.vatHalalas);
  });

  it("uses custom platform fee percentage", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 3,
      platformFeePct: 10,
    });
    expect(q.rentalSubtotalHalalas).toBe(30_000);
    expect(q.platformFeeHalalas).toBe(3_000); // 10% of 30,000
  });

  it("handles single-day rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 5_000, durationDays: 1 });
    expect(q.rentalSubtotalHalalas).toBe(5_000);
  });

  it("uses integer arithmetic (no floating point drift)", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 33_333, durationDays: 7 });
    expect(Number.isInteger(q.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(q.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(q.vatHalalas)).toBe(true);
    expect(Number.isInteger(q.totalPayableHalalas)).toBe(true);
  });

  it("total = subtotal + fee + vat", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 7_777, durationDays: 13 });
    expect(q.totalPayableHalalas).toBe(
      q.rentalSubtotalHalalas + q.platformFeeHalalas + q.vatHalalas
    );
  });
});

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
      rentalSubtotalHalalas: 77_777,
      commissionPct: 20,
    });
    expect(p.netHalalas + p.commissionHalalas).toBe(p.grossHalalas);
  });
});
