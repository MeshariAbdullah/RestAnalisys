import { describe, it, expect } from "vitest";
import {
  sarToHalalas,
  halalasToSar,
  computeRentalQuote,
  computeOwnerPayout,
  VAT_RATE,
  DEFAULT_PLATFORM_FEE_PCT,
} from "./money.js";

describe("sarToHalalas", () => {
  it("converts SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("rounds to nearest halala", () => {
    expect(sarToHalalas(10.555)).toBe(1056);
  });
});

describe("halalasToSar", () => {
  it("converts halalas to SAR", () => {
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(150)).toBe(1.5);
  });
});

describe("computeRentalQuote", () => {
  it("computes correct subtotal", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 1000, durationDays: 5 });
    expect(q.rentalSubtotalHalalas).toBe(5000);
  });

  it("applies 20% platform fee by default", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 1000, durationDays: 5 });
    expect(q.platformFeeHalalas).toBe(1000);
  });

  it("applies custom platform fee", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 1000,
      durationDays: 10,
      platformFeePct: 15,
    });
    expect(q.platformFeeHalalas).toBe(1500);
  });

  it("applies 15% VAT on subtotal + fee", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 1000, durationDays: 10 });
    const preVat = q.rentalSubtotalHalalas + q.platformFeeHalalas;
    expect(q.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
  });

  it("total = subtotal + fee + vat", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 1800_00, durationDays: 3 });
    expect(q.totalPayableHalalas).toBe(
      q.rentalSubtotalHalalas + q.platformFeeHalalas + q.vatHalalas
    );
  });

  it("preserves input fields", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 500, durationDays: 7 });
    expect(q.dailyPriceHalalas).toBe(500);
    expect(q.durationDays).toBe(7);
  });
});

describe("computeOwnerPayout", () => {
  it("computes commission correctly", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 10_000,
      commissionPct: 20,
    });
    expect(p.commissionHalalas).toBe(2000);
    expect(p.netHalalas).toBe(8000);
    expect(p.grossHalalas).toBe(10_000);
  });

  it("net = gross - commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 54_000_00,
      commissionPct: 15,
    });
    expect(p.netHalalas).toBe(p.grossHalalas - p.commissionHalalas);
  });
});
