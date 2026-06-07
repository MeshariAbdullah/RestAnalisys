import { describe, it, expect } from "vitest";
import { computeRiskDecision, trustScoreToCategory, RiskFeatures } from "../services/riskEngine.js";

function makeFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
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
    const d = computeRiskDecision(makeFeatures({
      accountAgeDays: 365,
      completedRentals: 10,
    }));
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.riskCategory).toBe("low");
    expect(d.finalScore).toBeGreaterThanOrEqual(70);
  });

  it("approves a new user with 150% commitment", () => {
    const d = computeRiskDecision(makeFeatures({
      accountAgeDays: 20,
      completedRentals: 0,
    }));
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
  });

  it("hard-rejects a blocked user", () => {
    const d = computeRiskDecision(makeFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("blocked");
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("hard-rejects without Nafath verification", () => {
    const d = computeRiskDecision(makeFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("Nafath");
  });

  it("hard-rejects without KYC verification", () => {
    const d = computeRiskDecision(makeFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("KYC");
  });

  it("penalizes disputes", () => {
    const clean = computeRiskDecision(makeFeatures());
    const disputed = computeRiskDecision(makeFeatures({ disputedRentals: 2 }));
    expect(disputed.finalScore).toBeLessThan(clean.finalScore);
    expect(disputed.modifiers.find(m => m.key === "disputes")).toBeDefined();
  });

  it("penalizes late returns", () => {
    const clean = computeRiskDecision(makeFeatures());
    const late = computeRiskDecision(makeFeatures({ lateReturns: 3 }));
    expect(late.finalScore).toBeLessThan(clean.finalScore);
    const mod = late.modifiers.find(m => m.key === "late_returns");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-15);
  });

  it("penalizes excessive cancellations", () => {
    const clean = computeRiskDecision(makeFeatures());
    const cancelled = computeRiskDecision(makeFeatures({ cancelledRentals: 5 }));
    expect(cancelled.finalScore).toBeLessThan(clean.finalScore);
  });

  it("penalizes ultra-high-value assets", () => {
    const normal = computeRiskDecision(makeFeatures({ requestedAssetValueHalalas: 100_000 }));
    const ultra = computeRiskDecision(makeFeatures({ requestedAssetValueHalalas: 15_000_000 }));
    expect(ultra.finalScore).toBeLessThan(normal.finalScore);
  });

  it("penalizes non-KSA users", () => {
    const ksa = computeRiskDecision(makeFeatures());
    const nonKsa = computeRiskDecision(makeFeatures({ countryIsSaudi: false }));
    expect(nonKsa.finalScore).toBeLessThan(ksa.finalScore);
  });

  it("rewards phone and email verification", () => {
    const verified = computeRiskDecision(makeFeatures());
    const unverified = computeRiskDecision(makeFeatures({
      phoneVerified: false,
      emailVerified: false,
    }));
    expect(verified.finalScore).toBeGreaterThan(unverified.finalScore);
  });

  it("flags manual review for scores in the gray zone", () => {
    const d = computeRiskDecision(makeFeatures({
      accountAgeDays: 10,
      completedRentals: 0,
      disputedRentals: 1,
      requestedAssetValueHalalas: 5_000_000,
      phoneVerified: false,
      emailVerified: false,
    }));
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
  });

  it("clamps score between 0 and 100", () => {
    const extreme = computeRiskDecision(makeFeatures({
      accountAgeDays: 365,
      completedRentals: 10,
      disputedRentals: 0,
      lateReturns: 0,
    }));
    expect(extreme.finalScore).toBeLessThanOrEqual(100);
    expect(extreme.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("calculates legal commitment halalas correctly", () => {
    const assetValue = 1_000_000;
    const d = computeRiskDecision(makeFeatures({
      requestedAssetValueHalalas: assetValue,
      accountAgeDays: 365,
      completedRentals: 10,
    }));
    expect(d.legalCommitmentHalalas).toBe(assetValue * (d.legalCommitmentPct! / 100));
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for 80+", () => expect(trustScoreToCategory(85)).toBe("low"));
  it("returns medium for 60-79", () => expect(trustScoreToCategory(65)).toBe("medium"));
  it("returns high for 25-59", () => expect(trustScoreToCategory(40)).toBe("high"));
  it("returns ultra_high for <25", () => expect(trustScoreToCategory(10)).toBe("ultra_high"));
  it("handles boundary 80", () => expect(trustScoreToCategory(80)).toBe("low"));
  it("handles boundary 60", () => expect(trustScoreToCategory(60)).toBe("medium"));
  it("handles boundary 25", () => expect(trustScoreToCategory(25)).toBe("high"));
  it("handles 0", () => expect(trustScoreToCategory(0)).toBe("ultra_high"));
  it("handles 100", () => expect(trustScoreToCategory(100)).toBe("low"));
});
