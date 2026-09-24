import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "./riskEngine.js";

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
    requestedAssetValueHalalas: 1_000_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  it("approves a trusted user with 100% commitment", () => {
    const decision = computeRiskDecision(baseFeatures());
    expect(decision.approved).toBe(true);
    expect(decision.legalCommitmentPct).toBe(100);
    expect(decision.legalCommitmentHalalas).toBe(1_000_000);
  });

  it("hard rejects a blocked user", () => {
    const decision = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(decision.approved).toBe(false);
    expect(decision.rejectionReason).toContain("blocked");
    expect(decision.riskCategory).toBe("ultra_high");
  });

  it("hard rejects without Nafath verification", () => {
    const decision = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(decision.approved).toBe(false);
    expect(decision.rejectionReason).toContain("Nafath");
  });

  it("hard rejects without KYC", () => {
    const decision = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(decision.approved).toBe(false);
    expect(decision.rejectionReason).toContain("KYC");
  });

  it("assigns 150% commitment to new users", () => {
    const decision = computeRiskDecision(
      baseFeatures({ accountAgeDays: 10, completedRentals: 0 })
    );
    expect(decision.approved).toBe(true);
    expect(decision.legalCommitmentPct).toBe(150);
    expect(decision.legalCommitmentHalalas).toBe(1_500_000);
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

  it("penalizes excessive cancellations", () => {
    const clean = computeRiskDecision(baseFeatures());
    const cancelled = computeRiskDecision(baseFeatures({ cancelledRentals: 3 }));
    expect(cancelled.finalScore).toBeLessThan(clean.finalScore);
  });

  it("penalizes ultra-high value assets", () => {
    const normal = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 500_000 }));
    const ultra = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 15_000_000 }));
    expect(ultra.finalScore).toBeLessThan(normal.finalScore);
  });

  it("rejects when score falls below threshold", () => {
    const decision = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        lateReturns: 2,
        cancelledRentals: 3,
        requestedAssetValueHalalas: 15_000_000,
        phoneVerified: false,
        emailVerified: false,
        countryIsSaudi: false,
      })
    );
    expect(decision.approved).toBe(false);
    expect(decision.riskCategory).toBe("ultra_high");
  });

  it("clamps score between 0 and 100", () => {
    const excellent = computeRiskDecision(
      baseFeatures({ accountAgeDays: 500, completedRentals: 15 })
    );
    expect(excellent.finalScore).toBeLessThanOrEqual(100);
    expect(excellent.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("flags manual review for borderline scores", () => {
    const decision = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 1,
        requestedAssetValueHalalas: 5_000_000,
      })
    );
    if (decision.approved && decision.finalScore < 40) {
      expect(decision.requiresReview).toBe(true);
    }
  });
});

describe("trustScoreToCategory", () => {
  it("maps 80+ to low", () => expect(trustScoreToCategory(85)).toBe("low"));
  it("maps 60-79 to medium", () => expect(trustScoreToCategory(65)).toBe("medium"));
  it("maps 25-59 to high", () => expect(trustScoreToCategory(30)).toBe("high"));
  it("maps <25 to ultra_high", () => expect(trustScoreToCategory(10)).toBe("ultra_high"));
  it("maps boundary 80 to low", () => expect(trustScoreToCategory(80)).toBe("low"));
  it("maps boundary 60 to medium", () => expect(trustScoreToCategory(60)).toBe("medium"));
  it("maps boundary 25 to high", () => expect(trustScoreToCategory(25)).toBe("high"));
});
