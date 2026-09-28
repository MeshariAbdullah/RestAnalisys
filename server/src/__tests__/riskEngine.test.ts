import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "../services/riskEngine.js";

function baseFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
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
    requestedAssetValueHalalas: 500000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision hard rejects", () => {
  it("rejects blocked users", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/blocked/i);
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("rejects unverified Nafath", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.notes).toContain("hard_reject:nafath_required");
  });

  it("rejects unverified KYC", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.notes).toContain("hard_reject:kyc_required");
  });
});

describe("computeRiskDecision scoring", () => {
  it("approves a trusted user with 100% commitment", () => {
    const d = computeRiskDecision(baseFeatures());
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.legalCommitmentHalalas).toBe(500000);
    expect(d.riskCategory).toBe("medium");
    expect(d.finalScore).toBe(70);
  });

  it("assigns 150% commitment to new users", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 10, completedRentals: 0 })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(750000);
  });

  it("penalizes disputed rentals", () => {
    const clean = computeRiskDecision(baseFeatures());
    const disputed = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    expect(disputed.finalScore).toBeLessThan(clean.finalScore);
  });

  it("penalizes late returns", () => {
    const clean = computeRiskDecision(baseFeatures());
    const late = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    expect(late.finalScore).toBeLessThan(clean.finalScore);
  });

  it("flags high-value assets as riskier", () => {
    const low = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 100000 }));
    const ultra = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 15000000 }));
    expect(ultra.finalScore).toBeLessThan(low.finalScore);
  });

  it("clamps score to 0-100 range", () => {
    const d = computeRiskDecision(
      baseFeatures({
        disputedRentals: 10,
        lateReturns: 10,
        cancelledRentals: 10,
        requestedAssetValueHalalas: 20000000,
        countryIsSaudi: false,
        accountAgeDays: 1,
        completedRentals: 0,
      })
    );
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
    expect(d.finalScore).toBeLessThanOrEqual(100);
  });

  it("requires manual review for borderline scores", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        requestedAssetValueHalalas: 15000000,
        countryIsSaudi: false,
      })
    );
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
  });
});

describe("trustScoreToCategory", () => {
  it("maps scores to categories", () => {
    expect(trustScoreToCategory(90)).toBe("low");
    expect(trustScoreToCategory(70)).toBe("medium");
    expect(trustScoreToCategory(40)).toBe("high");
    expect(trustScoreToCategory(20)).toBe("ultra_high");
  });

  it("handles boundary values", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
