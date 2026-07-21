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
    requestedAssetValueHalalas: 1_000_000,
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
    expect(d.legalCommitmentHalalas).toBe(1_000_000);
    // 50 base + 8 (age 90+) + 8 (3+ rentals) + 2 (phone) + 2 (email) = 70
    expect(d.finalScore).toBe(70);
    expect(d.riskCategory).toBe("medium");
  });

  it("hard-rejects blocked users", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/blocked/i);
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("hard-rejects unverified Nafath", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/nafath/i);
  });

  it("hard-rejects unverified KYC", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/kyc/i);
  });

  it("assigns 150% commitment for new users", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 10, completedRentals: 0 })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(1_500_000);
  });

  it("penalizes disputed rentals", () => {
    const clean = computeRiskDecision(baseFeatures());
    const disputed = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    expect(disputed.finalScore).toBeLessThan(clean.finalScore);
    expect(disputed.finalScore).toBe(clean.finalScore - 20);
  });

  it("penalizes late returns", () => {
    const clean = computeRiskDecision(baseFeatures());
    const late = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    expect(late.finalScore).toBe(clean.finalScore - 15);
  });

  it("penalizes excessive cancellations", () => {
    const clean = computeRiskDecision(baseFeatures());
    const cancelled = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
    expect(cancelled.finalScore).toBe(clean.finalScore - 8);
  });

  it("penalizes ultra-high asset values", () => {
    const normal = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 500_000 })
    );
    const ultra = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
    );
    expect(ultra.finalScore).toBeLessThan(normal.finalScore);
  });

  it("penalizes non-Saudi users", () => {
    const ksa = computeRiskDecision(baseFeatures());
    const abroad = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    expect(abroad.finalScore).toBe(ksa.finalScore - 10);
  });

  it("auto-rejects when score falls below 25", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        cancelledRentals: 5,
        lateReturns: 2,
        phoneVerified: false,
        emailVerified: false,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 20_000_000,
      })
    );
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/threshold/i);
  });

  it("clamps score between 0 and 100", () => {
    const great = computeRiskDecision(
      baseFeatures({ accountAgeDays: 500, completedRentals: 20 })
    );
    expect(great.finalScore).toBeLessThanOrEqual(100);
    expect(great.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("flags manual review when score < 40", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 1,
        phoneVerified: false,
        emailVerified: false,
      })
    );
    if (d.approved) {
      expect(d.requiresReview).toBe(d.finalScore < 40);
    }
  });

  it("records all modifiers applied", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 400,
        completedRentals: 12,
        disputedRentals: 1,
        lateReturns: 1,
      })
    );
    const keys = d.modifiers.map((m) => m.key);
    expect(keys).toContain("age_365");
    expect(keys).toContain("rentals_10");
    expect(keys).toContain("disputes");
    expect(keys).toContain("late_returns");
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
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
