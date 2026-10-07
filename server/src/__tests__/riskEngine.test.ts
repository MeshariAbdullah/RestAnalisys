import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "../services/riskEngine.js";

function baseFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    accountAgeDays: 200,
    completedRentals: 5,
    disputedRentals: 0,
    cancelledRentals: 0,
    lateReturns: 0,
    nafathVerified: true,
    kycVerified: true,
    phoneVerified: true,
    emailVerified: true,
    priorBlock: false,
    requestedAssetValueHalalas: 2_000_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  it("approves a trusted user with 100% commitment", () => {
    const result = computeRiskDecision(baseFeatures());
    expect(result.approved).toBe(true);
    expect(result.legalCommitmentPct).toBe(100);
    expect(result.finalScore).toBeGreaterThanOrEqual(70);
  });

  it("hard rejects a blocked user", () => {
    const result = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(result.approved).toBe(false);
    expect(result.rejectionReason).toContain("blocked");
    expect(result.riskCategory).toBe("ultra_high");
  });

  it("hard rejects without Nafath verification", () => {
    const result = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(result.approved).toBe(false);
    expect(result.rejectionReason).toContain("Nafath");
  });

  it("hard rejects without KYC", () => {
    const result = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(result.approved).toBe(false);
    expect(result.rejectionReason).toContain("KYC");
  });

  it("assigns 150% commitment to new users", () => {
    const assetValue = 2_000_000;
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        requestedAssetValueHalalas: assetValue,
      })
    );
    expect(result.approved).toBe(true);
    expect(result.legalCommitmentPct).toBe(150);
    expect(result.legalCommitmentHalalas).toBe(Math.round(assetValue * 1.5));
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
    const cancelled = computeRiskDecision(baseFeatures({ cancelledRentals: 5 }));
    expect(cancelled.finalScore).toBeLessThan(clean.finalScore);
  });

  it("penalizes high-value assets", () => {
    const low = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 1_000_000 }));
    const high = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 15_000_000 }));
    expect(high.finalScore).toBeLessThan(low.finalScore);
  });

  it("penalizes non-Saudi identity", () => {
    const saudi = computeRiskDecision(baseFeatures());
    const nonSaudi = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    expect(nonSaudi.finalScore).toBeLessThan(saudi.finalScore);
  });

  it("rejects when score drops below threshold", () => {
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        lateReturns: 2,
        cancelledRentals: 4,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 15_000_000,
        phoneVerified: false,
        emailVerified: false,
      })
    );
    expect(result.approved).toBe(false);
    expect(result.finalScore).toBeLessThan(25);
  });

  it("flags manual review for borderline scores", () => {
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 15,
        completedRentals: 0,
        disputedRentals: 1,
        requestedAssetValueHalalas: 10_000_000,
      })
    );
    if (result.approved && result.finalScore < 40) {
      expect(result.requiresReview).toBe(true);
    }
  });

  it("clamps score between 0 and 100", () => {
    const maxResult = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 500,
        completedRentals: 20,
      })
    );
    expect(maxResult.finalScore).toBeLessThanOrEqual(100);

    const minResult = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 1,
        completedRentals: 0,
        disputedRentals: 5,
        lateReturns: 5,
        cancelledRentals: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 20_000_000,
        phoneVerified: false,
        emailVerified: false,
      })
    );
    expect(minResult.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("calculates correct commitment amounts", () => {
    const assetValue = 10_000_000;
    const result = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: assetValue })
    );
    if (result.legalCommitmentPct === 100) {
      expect(result.legalCommitmentHalalas).toBe(assetValue);
    } else {
      expect(result.legalCommitmentHalalas).toBe(Math.round(assetValue * 1.5));
    }
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for scores >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("returns medium for 60-79", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("returns high for 25-59", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("returns ultra_high for < 25", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
