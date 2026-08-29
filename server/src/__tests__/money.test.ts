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

describe("sarToHalalas / halalasToSar", () => {
  it("converts SAR to halalas", () => {
    expect(sarToHalalas(100)).toBe(10000);
    expect(sarToHalalas(0.5)).toBe(50);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("converts halalas to SAR", () => {
    expect(halalasToSar(10000)).toBe(100);
    expect(halalasToSar(50)).toBe(0.5);
    expect(halalasToSar(0)).toBe(0);
  });

  it("roundtrips correctly", () => {
    expect(halalasToSar(sarToHalalas(99.99))).toBe(99.99);
  });
});

describe("formatHalalas", () => {
  it("formats halalas as SAR string", () => {
    const formatted = formatHalalas(150000);
    expect(formatted).toContain("SAR");
    expect(formatted).toContain("1,500.00");
  });
});

describe("computeRentalQuote", () => {
  it("calculates correct totals for a basic rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 7,
    });

    expect(quote.rentalSubtotalHalalas).toBe(70000);
    expect(quote.platformFeeHalalas).toBe(14000);

    const preVat = 70000 + 14000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("accepts a custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 10,
      platformFeePct: 10,
    });

    expect(quote.platformFeeHalalas).toBe(10000);
  });

  it("handles zero daily price", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 0,
      durationDays: 5,
    });

    expect(quote.rentalSubtotalHalalas).toBe(0);
    expect(quote.totalPayableHalalas).toBe(0);
  });

  it("handles single day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50000,
      durationDays: 1,
    });

    expect(quote.rentalSubtotalHalalas).toBe(50000);
    expect(quote.durationDays).toBe(1);
  });
});

describe("computeOwnerPayout", () => {
  it("computes correct payout after commission", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 100000,
      commissionPct: 20,
    });

    expect(payout.grossHalalas).toBe(100000);
    expect(payout.commissionHalalas).toBe(20000);
    expect(payout.netHalalas).toBe(80000);
  });

  it("preserves the identity: gross = commission + net", () => {
    const payout = computeOwnerPayout({
      rentalSubtotalHalalas: 333333,
      commissionPct: 15,
    });

    expect(payout.grossHalalas).toBe(
      payout.commissionHalalas + payout.netHalalas
    );
  });
});
