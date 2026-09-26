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

describe("sarToHalalas", () => {
  it("converts whole SAR to halalas", () => {
    expect(sarToHalalas(1)).toBe(100);
    expect(sarToHalalas(100)).toBe(10_000);
    expect(sarToHalalas(0)).toBe(0);
  });

  it("rounds fractional halalas", () => {
    expect(sarToHalalas(1.006)).toBe(101); // rounds 100.6 -> 101
    expect(sarToHalalas(1.004)).toBe(100); // rounds 100.4 -> 100
  });
});

describe("halalasToSar", () => {
  it("converts halalas back to SAR", () => {
    expect(halalasToSar(100)).toBe(1);
    expect(halalasToSar(10_000)).toBe(100);
    expect(halalasToSar(0)).toBe(0);
  });

  it("preserves fractional SAR", () => {
    expect(halalasToSar(150)).toBe(1.5);
    expect(halalasToSar(1)).toBe(0.01);
  });
});

describe("formatHalalas", () => {
  it("formats halalas as SAR string", () => {
    const result = formatHalalas(500_000);
    expect(result).toContain("5,000.00");
    expect(result).toContain("SAR");
  });

  it("formats zero", () => {
    const result = formatHalalas(0);
    expect(result).toContain("0.00");
    expect(result).toContain("SAR");
  });
});

describe("computeRentalQuote", () => {
  it("computes a basic quote correctly", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000, // 100 SAR/day
      durationDays: 7,
    });

    expect(quote.dailyPriceHalalas).toBe(10_000);
    expect(quote.durationDays).toBe(7);
    expect(quote.rentalSubtotalHalalas).toBe(70_000); // 700 SAR
    expect(quote.platformFeeHalalas).toBe(14_000);    // 20% of 700
    const preVat = 70_000 + 14_000;
    expect(quote.vatHalalas).toBe(Math.round(preVat * VAT_RATE)); // 15% of 840
    expect(quote.totalPayableHalalas).toBe(preVat + quote.vatHalalas);
  });

  it("uses default 20% platform fee", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
    });
    expect(quote.platformFeeHalalas).toBe(2_000);
  });

  it("accepts custom platform fee percentage", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 1,
      platformFeePct: 10,
    });
    expect(quote.platformFeeHalalas).toBe(1_000);
  });

  it("handles single-day rental", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 50_000,
      durationDays: 1,
    });
    expect(quote.rentalSubtotalHalalas).toBe(50_000);
  });

  it("ensures total = subtotal + fee + VAT", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 33_333,
      durationDays: 13,
    });
    const expectedTotal =
      quote.rentalSubtotalHalalas + quote.platformFeeHalalas + quote.vatHalalas;
    expect(quote.totalPayableHalalas).toBe(expectedTotal);
  });

  it("uses integer arithmetic (no floating point drift)", () => {
    const quote = computeRentalQuote({
      dailyPriceHalalas: 1,
      durationDays: 3,
    });
    expect(Number.isInteger(quote.rentalSubtotalHalalas)).toBe(true);
    expect(Number.isInteger(quote.platformFeeHalalas)).toBe(true);
    expect(Number.isInteger(quote.vatHalalas)).toBe(true);
    expect(Number.isInteger(quote.totalPayableHalalas)).toBe(true);
  });
});

describe("computeOwnerPayout", () => {
  it("computes net payout after commission", () => {
    const result = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    expect(result.grossHalalas).toBe(100_000);
    expect(result.commissionHalalas).toBe(20_000);
    expect(result.netHalalas).toBe(80_000);
  });

  it("handles zero commission", () => {
    const result = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    expect(result.commissionHalalas).toBe(0);
    expect(result.netHalalas).toBe(50_000);
  });

  it("rounds commission to integer halalas", () => {
    const result = computeOwnerPayout({
      rentalSubtotalHalalas: 33_333,
      commissionPct: 20,
    });
    expect(Number.isInteger(result.commissionHalalas)).toBe(true);
    expect(result.netHalalas).toBe(
      result.grossHalalas - result.commissionHalalas
    );
  });
});

describe("constants", () => {
  it("VAT rate is 15%", () => {
    expect(VAT_RATE).toBe(0.15);
  });

  it("platform fee is 20%", () => {
    expect(DEFAULT_PLATFORM_FEE_PCT).toBe(20);
  });

  it("100 halalas per SAR", () => {
    expect(HALALAS_PER_SAR).toBe(100);
  });
});
