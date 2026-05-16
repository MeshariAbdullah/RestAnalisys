import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sarToHalalas,
  halalasToSar,
  formatHalalas,
  computeRentalQuote,
  computeOwnerPayout,
  VAT_RATE,
  DEFAULT_PLATFORM_FEE_PCT,
} from "../utils/money.js";

describe("Money — SAR/Halalas conversion", () => {
  it("converts SAR to halalas", () => {
    assert.equal(sarToHalalas(100), 10_000);
    assert.equal(sarToHalalas(0.5), 50);
    assert.equal(sarToHalalas(0), 0);
  });

  it("converts halalas to SAR", () => {
    assert.equal(halalasToSar(10_000), 100);
    assert.equal(halalasToSar(50), 0.5);
    assert.equal(halalasToSar(0), 0);
  });

  it("round-trips correctly", () => {
    assert.equal(halalasToSar(sarToHalalas(99.99)), 99.99);
  });

  it("formats halalas as SAR string", () => {
    const formatted = formatHalalas(150_000);
    assert.ok(formatted.includes("SAR"));
    assert.ok(formatted.includes("1,500") || formatted.includes("1500"));
  });
});

describe("Money — rental quote", () => {
  it("computes rental totals correctly", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000, // 100 SAR/day
      durationDays: 7,
    });

    assert.equal(q.dailyPriceHalalas, 10_000);
    assert.equal(q.durationDays, 7);
    assert.equal(q.rentalSubtotalHalalas, 70_000); // 700 SAR

    const expectedFee = Math.round((70_000 * DEFAULT_PLATFORM_FEE_PCT) / 100);
    assert.equal(q.platformFeeHalalas, expectedFee); // 140 SAR

    const preVat = 70_000 + expectedFee;
    const expectedVat = Math.round(preVat * VAT_RATE);
    assert.equal(q.vatHalalas, expectedVat);

    assert.equal(q.totalPayableHalalas, preVat + expectedVat);
  });

  it("handles zero price", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 0, durationDays: 5 });
    assert.equal(q.rentalSubtotalHalalas, 0);
    assert.equal(q.platformFeeHalalas, 0);
    assert.equal(q.vatHalalas, 0);
    assert.equal(q.totalPayableHalalas, 0);
  });

  it("handles single day rental", () => {
    const q = computeRentalQuote({ dailyPriceHalalas: 50_000, durationDays: 1 });
    assert.equal(q.rentalSubtotalHalalas, 50_000);
  });

  it("allows custom platform fee", () => {
    const q = computeRentalQuote({
      dailyPriceHalalas: 10_000,
      durationDays: 10,
      platformFeePct: 10,
    });
    assert.equal(q.platformFeeHalalas, 10_000); // 10% of 100,000
  });
});

describe("Money — owner payout", () => {
  it("computes net payout after commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 100_000,
      commissionPct: 20,
    });
    assert.equal(p.grossHalalas, 100_000);
    assert.equal(p.commissionHalalas, 20_000);
    assert.equal(p.netHalalas, 80_000);
  });

  it("gross = commission + net", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 333_333,
      commissionPct: 15,
    });
    assert.equal(p.grossHalalas, p.commissionHalalas + p.netHalalas);
  });

  it("handles zero commission", () => {
    const p = computeOwnerPayout({
      rentalSubtotalHalalas: 50_000,
      commissionPct: 0,
    });
    assert.equal(p.netHalalas, 50_000);
    assert.equal(p.commissionHalalas, 0);
  });
});
