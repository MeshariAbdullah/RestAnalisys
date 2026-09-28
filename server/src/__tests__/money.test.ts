import { describe, it, expect } from "vitest";
import {
  sarToHalalas,
  halalasToSar,
  computeRentalQuote,
  computeOwnerPayout,
  VAT_RATE,
  DEFAULT_PLATFORM_FEE_PCT,
} from "../utils/money.js";

describe("sarToHalalas / halalasToSar", () => {
  it("converts SAR to halalas and back", () => {
    expect(sarToHalalas(100)).toBe(10000);
    expect(halalasToSar(10000)).toBe(100);
  });

  it("rounds fractional halalas", () => {
    expect(sarToHalalas(10.555)).toBe(1056);
  });

  it("handles zero", () => {
    expect(sarToHalalas(0)).toBe(0);
    expect(halalasToSar(0)).toBe(0);
  });
});

describe("computeRentalQuote", () => {
  it("computes a standard 7-day rental correctly", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 50000, durationDays: 7 });
    expect(quote.rentalSubtotalHalalas).toBe(350000);
    expect(quote.platformFeeHalalas).toBe(70000); // 20%
    const preVat = 350000 + 70000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE));
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("accepts a custom platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10000,
      durationDays: 1,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(1000);
  });

  it("returns zero totals for zero price", () => {
    const quote = computeRentalQuote({ dailyPriceHalalas: 0, durationDays: 5 });
    expect(quote.totalPayableHalalas).toBe(0);
  });
});

describe("computeOwnerPayout", () => {
  it("computes net payout after commission", () => {
    const result = computeOwnerPayout({
      rentalSubtotalHalalas: 100000,
      commissionPct: 20,
    });
    expect(result.commissionHalalas).toBe(20000);
    expect(result.netHalalas).toBe(80000);
    expect(result.grossHalalas).toBe(100000);
  });

  it("handles 0% commission", () => {
    const result = computeOwnerPayout({
      rentalSubtotalHalalas: 50000,
      commissionPct: 0,
    });
    expect(result.netHalalas).toBe(50000);
    expect(result.commissionHalalas).toBe(0);
  });
});
