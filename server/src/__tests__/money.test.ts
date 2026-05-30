import { describe, it, expect } from "vitest";
import {
  sarToHalalas,
  halalasToSar,
  formatHalalas,
  computeRentalQuote,
  computeOwnerPayout,
} from "../utils/money.js";

describe("SAR <-> Halalas conversion", () => {
  it("converts SAR to halalas correctly", () => {
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(99.99)).toBe(9999);
    expect(sarToHalalas(0)).toBe(0);
    expect(sarToHalalas(1500)).toBe(150_000);
  });

  it("converts halalas to SAR correctly", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(9999)).toBe(99.99);
    expect(halalasToSar(0)).toBe(0);
  });

  it("formats halalas as SAR string", () => {
    const result = formatHalalas(150_000);
    expect(result).toContain("1,500.00");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes quote for a standard rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 7,
    });

    expect(quote.dailyPriceHalalas).toBe(10_000);
    expect(quote.durationDays).toBe(7);
    expect(quote.rentalSubtotalHalalas).toBe(70_000);
    expect(quote.platformFeeHalalas).toBe(14_000);
    expect(quote.vatHalalas).toBe(12_600);
    expect(quote.totalPayableHalalas).toBe(96_600);
  });

  it("handles custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });

    expect(quote.platformFeeHalalas).toBe(1_000);
  });

  it("handles single-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 5_000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(5_000);
  });

  it("produces integer halalas (no floating point)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 333,
      durationDays: 3,
    });

    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });

  it("total = subtotal + platformFee + vat", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 7_777,
      durationDays: 14,
    });

    expect(quote.totalPayableHalalas).toBe(
      quote.rentalSubtotalHalalas + quote.platformFeeHalalas + quote.vatHalalas
    );
  });
});

describe("computeOwnerPayout", () => {
  it("computes payout correctly with 20% commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });

    expect(payout.grossHalalas).toBe(100_000);
    expect(payout.commissionHalalas).toBe(20_000);
    expect(payout.netHalalas).toBe(80_000);
  });

  it("net + commission = gross", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 77_777,
      commissionPct: 15,
    });

    expect(payout.netHalalas + payout.commissionHalalas).toBe(payout.grossHalalas);
  });
});
