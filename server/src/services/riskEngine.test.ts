import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "./riskEngine.js";

function baseFeatures(overrides?: Partial<RiskFeatures>): RiskFeatures {
  return {
    accountAgeDays: 120,
    completedRentals: 5,
    disputedRentals: 0,
    cancelledRentals: 0,
    lateReturns: 0,
    nafathVerified: true,
    kycVerified: true,
    phoneVerified: true,
    emailVerified: true,
    priorBlock: false,
    requestedAssetValueHalalas: 500_000, // 5,000 SAR
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  it("approves a trusted user with 100% commitment", () => {
    const d = computeRiskDecision(baseFeatures());
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.legalCommitmentHalalas).toBe(500_000);
    expect(d.riskCategory).toBe("medium");
  });

  it("rejects a blocked user immediately", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/blocked/i);
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("rejects a user without Nafath verification", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/nafath/i);
  });

  it("rejects a user without KYC verification", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/kyc/i);
  });

  it("assigns 150% commitment to new users", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 10, completedRentals: 0 })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(750_000);
  });

  it("penalizes disputes heavily", () => {
    const clean = computeRiskDecision(baseFeatures());
    const disputed = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    expect(disputed.finalScore).toBeLessThan(clean.finalScore);
    expect(disputed.finalScore).toBe(clean.finalScore - 20);
  });

  it("penalizes late returns", () => {
    const clean = computeRiskDecision(baseFeatures());
    const late = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    expect(late.finalScore).toBeLessThan(clean.finalScore);
  });

  it("penalizes high-value assets", () => {
    const low = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 100_000 }));
    const ultra = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
    );
    expect(ultra.finalScore).toBeLessThan(low.finalScore);
  });

  it("rejects users with very low scores", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        cancelledRentals: 5,
        lateReturns: 2,
        requestedAssetValueHalalas: 15_000_000,
        countryIsSaudi: false,
      })
    );
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/threshold/i);
  });

  it("clamps final score to 0..100 range", () => {
    const worst = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 1,
        completedRentals: 0,
        disputedRentals: 10,
        lateReturns: 10,
        cancelledRentals: 10,
        requestedAssetValueHalalas: 20_000_000,
        countryIsSaudi: false,
      })
    );
    expect(worst.finalScore).toBeGreaterThanOrEqual(0);
    expect(worst.finalScore).toBeLessThanOrEqual(100);
  });
});

describe("trustScoreToCategory", () => {
  it("maps scores to correct categories", () => {
    expect(trustScoreToCategory(90)).toBe("low");
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(70)).toBe("medium");
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(50)).toBe("high");
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(20)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
