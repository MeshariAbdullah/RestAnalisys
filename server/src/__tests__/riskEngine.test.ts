import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  RiskFeatures,
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
    requestedAssetValueHalalas: 500_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  it("approves a trusted user with 100% commitment", () => {
    const d = computeRiskDecision(baseFeatures({
      completedRentals: 10,
      accountAgeDays: 400,
      requestedAssetValueHalalas: 100_000,
    }));
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.riskCategory).toBe("low");
    expect(d.notes).toContain("trusted_user:100pct");
  });

  it("approves a new user with 150% commitment", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 0, accountAgeDays: 10 }));
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.notes).toContain("new_or_untrusted_user:150pct");
  });

  it("hard-rejects a blocked user", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/blocked/i);
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("hard-rejects without Nafath verification", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/nafath/i);
  });

  it("hard-rejects without KYC verification", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/kyc/i);
  });

  it("penalizes late returns", () => {
    const noLate = computeRiskDecision(baseFeatures({ lateReturns: 0 }));
    const withLate = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    expect(withLate.finalScore).toBeLessThan(noLate.finalScore);
    const lateModifier = withLate.modifiers.find((m) => m.key === "late_returns");
    expect(lateModifier).toBeDefined();
    expect(lateModifier!.delta).toBe(-15);
  });

  it("penalizes disputes", () => {
    const clean = computeRiskDecision(baseFeatures());
    const disputed = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    expect(disputed.finalScore).toBeLessThan(clean.finalScore);
    const mod = disputed.modifiers.find((m) => m.key === "disputes");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-20);
  });

  it("auto-rejects when score drops below 25", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        lateReturns: 2,
        cancelledRentals: 5,
        requestedAssetValueHalalas: 15_000_000,
      })
    );
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/threshold/i);
  });

  it("applies high-value asset penalty", () => {
    const cheap = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 100_000 }));
    const expensive = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 10_000_000 }));
    expect(expensive.finalScore).toBeLessThan(cheap.finalScore);
  });

  it("boosts score for old accounts", () => {
    const young = computeRiskDecision(baseFeatures({ accountAgeDays: 10 }));
    const old = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
    expect(old.finalScore).toBeGreaterThan(young.finalScore);
  });

  it("recommends manual review for borderline scores", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        lateReturns: 1,
        cancelledRentals: 3,
      })
    );
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
      expect(d.notes).toContain("manual_review_recommended");
    }
  });

  it("calculates commitment halalas correctly", () => {
    const assetValue = 1_000_000;
    const d = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: assetValue }));
    expect(d.legalCommitmentHalalas).toBe(assetValue * (d.legalCommitmentPct! / 100));
  });

  it("clamps score between 0 and 100", () => {
    const best = computeRiskDecision(
      baseFeatures({ accountAgeDays: 500, completedRentals: 15 })
    );
    expect(best.finalScore).toBeLessThanOrEqual(100);
    expect(best.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("marks non-Saudi users with penalty", () => {
    const saudi = computeRiskDecision(baseFeatures({ countryIsSaudi: true }));
    const nonSaudi = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    expect(nonSaudi.finalScore).toBeLessThan(saudi.finalScore);
  });
});

describe("trustScoreToCategory", () => {
  it("maps high scores to low risk", () => {
    expect(trustScoreToCategory(85)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("maps medium scores to medium risk", () => {
    expect(trustScoreToCategory(65)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("maps low scores to high risk", () => {
    expect(trustScoreToCategory(30)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("maps very low scores to ultra_high risk", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
