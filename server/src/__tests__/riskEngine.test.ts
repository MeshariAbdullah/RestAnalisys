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

describe("computeRiskDecision", () => {
  it("approves a trusted user with 100% commitment", () => {
    const d = computeRiskDecision(baseFeatures());
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(["low", "medium"]).toContain(d.riskCategory);
    expect(d.notes).toContain("trusted_user:100pct");
  });

  it("hard rejects a blocked user", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/blocked/i);
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("hard rejects without Nafath verification", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/nafath/i);
  });

  it("hard rejects without KYC verification", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/kyc/i);
  });

  it("assigns 150% commitment for new users", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.notes).toContain("new_or_untrusted_user:150pct");
  });

  it("penalizes disputed rentals", () => {
    const clean = computeRiskDecision(baseFeatures());
    const disputed = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    expect(disputed.finalScore).toBeLessThan(clean.finalScore);
    expect(disputed.modifiers.some((m) => m.key === "disputes")).toBe(true);
  });

  it("penalizes late returns", () => {
    const clean = computeRiskDecision(baseFeatures());
    const late = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    expect(late.finalScore).toBeLessThan(clean.finalScore);
    expect(late.modifiers.some((m) => m.key === "late_returns")).toBe(true);
  });

  it("penalizes excessive cancellations", () => {
    const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
    expect(d.modifiers.some((m) => m.key === "cancellations")).toBe(true);
  });

  it("penalizes ultra-high-value assets", () => {
    const normal = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 100000 })
    );
    const ultra = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 15000000 })
    );
    expect(ultra.finalScore).toBeLessThan(normal.finalScore);
  });

  it("penalizes non-Saudi identity", () => {
    const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    expect(d.modifiers.some((m) => m.key === "non_ksa")).toBe(true);
  });

  it("rejects when score falls below hard threshold", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        lateReturns: 2,
        cancelledRentals: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 20000000,
      })
    );
    expect(d.approved).toBe(false);
    expect(d.finalScore).toBeLessThan(25);
  });

  it("flags manual review for borderline scores", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 35,
        completedRentals: 1,
        disputedRentals: 1,
        requestedAssetValueHalalas: 5000000,
      })
    );
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
  });

  it("calculates legal commitment in halalas correctly", () => {
    const assetValue = 1000000;
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: assetValue })
    );
    expect(d.legalCommitmentHalalas).toBe(
      Math.round((assetValue * d.legalCommitmentPct!) / 100)
    );
  });

  it("clamps score between 0 and 100", () => {
    const highScore = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 500,
        completedRentals: 20,
      })
    );
    expect(highScore.finalScore).toBeLessThanOrEqual(100);
    expect(highScore.finalScore).toBeGreaterThanOrEqual(0);
  });
});

describe("trustScoreToCategory", () => {
  it("maps 80+ to low", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("maps 60-79 to medium", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("maps 25-59 to high", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("maps below 25 to ultra_high", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
