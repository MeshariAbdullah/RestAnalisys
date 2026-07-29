import { describe, it, expect } from "vitest";
import { computeRiskDecision, trustScoreToCategory, type RiskFeatures } from "./riskEngine.js";

function baseFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    accountAgeDays: 180,
    completedRentals: 5,
    disputedRentals: 0,
    cancelledRentals: 0,
    lateReturns: 0,
    nafathVerified: true,
    kycVerified: true,
    phoneVerified: true,
    emailVerified: true,
    priorBlock: false,
    requestedAssetValueHalalas: 500_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  it("approves a trusted user with 100% commitment", () => {
    const d = computeRiskDecision(baseFeatures({
      accountAgeDays: 400,
      completedRentals: 10,
    }));
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.riskCategory).toBe("low");
    expect(d.requiresReview).toBe(false);
  });

  it("hard rejects a blocked user", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("blocked");
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("hard rejects without Nafath verification", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("Nafath");
  });

  it("hard rejects without KYC", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("KYC");
  });

  it("assigns 150% commitment for new/untrusted users", () => {
    const d = computeRiskDecision(baseFeatures({
      accountAgeDays: 10,
      completedRentals: 0,
    }));
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(750_000);
  });

  it("penalizes disputes", () => {
    const clean = computeRiskDecision(baseFeatures());
    const disputed = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    expect(disputed.finalScore).toBeLessThan(clean.finalScore);
    expect(disputed.legalCommitmentPct).toBe(150);
  });

  it("penalizes late returns", () => {
    const clean = computeRiskDecision(baseFeatures());
    const late = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    expect(late.finalScore).toBeLessThan(clean.finalScore);
    const lateMod = late.modifiers.find(m => m.key === "late_returns");
    expect(lateMod).toBeDefined();
    expect(lateMod!.delta).toBe(-15);
  });

  it("penalizes excessive cancellations", () => {
    const clean = computeRiskDecision(baseFeatures());
    const cancelled = computeRiskDecision(baseFeatures({ cancelledRentals: 3 }));
    expect(cancelled.finalScore).toBeLessThan(clean.finalScore);
  });

  it("applies higher risk for ultra-high-value assets", () => {
    const normal = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 100_000 }));
    const ultra = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 10_000_000 }));
    expect(ultra.finalScore).toBeLessThan(normal.finalScore);
  });

  it("gives bonus for phone and email verification", () => {
    const verified = computeRiskDecision(baseFeatures());
    const unverified = computeRiskDecision(baseFeatures({
      phoneVerified: false,
      emailVerified: false,
    }));
    expect(verified.finalScore).toBeGreaterThan(unverified.finalScore);
  });

  it("penalizes non-Saudi users", () => {
    const saudi = computeRiskDecision(baseFeatures());
    const nonSaudi = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    expect(nonSaudi.finalScore).toBeLessThan(saudi.finalScore);
  });

  it("auto-rejects when score falls below hard threshold", () => {
    const d = computeRiskDecision(baseFeatures({
      accountAgeDays: 5,
      completedRentals: 0,
      disputedRentals: 3,
      cancelledRentals: 5,
      lateReturns: 2,
      phoneVerified: false,
      emailVerified: false,
      countryIsSaudi: false,
      requestedAssetValueHalalas: 15_000_000,
    }));
    expect(d.approved).toBe(false);
    expect(d.finalScore).toBeLessThan(25);
  });

  it("flags manual review for borderline scores", () => {
    const d = computeRiskDecision(baseFeatures({
      accountAgeDays: 10,
      completedRentals: 0,
      disputedRentals: 1,
      requestedAssetValueHalalas: 5_000_000,
    }));
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
  });

  it("clamps score to 0..100", () => {
    const maxBoost = computeRiskDecision(baseFeatures({
      accountAgeDays: 400,
      completedRentals: 20,
      requestedAssetValueHalalas: 10_000,
    }));
    expect(maxBoost.finalScore).toBeLessThanOrEqual(100);
    expect(maxBoost.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("computes correct legal commitment halalas", () => {
    const d = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 200_000 }));
    expect(d.legalCommitmentHalalas).toBe(
      Math.round((200_000 * d.legalCommitmentPct!) / 100)
    );
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for scores >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("returns medium for scores 60-79", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("returns high for scores 25-59", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("returns ultra_high for scores below 25", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
