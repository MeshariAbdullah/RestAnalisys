import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  RiskFeatures,
} from "../services/riskEngine.js";

function baseFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    accountAgeDays: 400,
    completedRentals: 10,
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
  it("approves a healthy trusted user at 100% commitment", () => {
    const d = computeRiskDecision(baseFeatures());
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.riskCategory).toBe("low");
    expect(d.requiresReview).toBe(false);
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

  it("assigns 150% commitment to new users", () => {
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

  it("assigns 150% when user has disputes even with old account", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 365,
        completedRentals: 10,
        disputedRentals: 1,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
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

  it("penalizes non-Saudi users", () => {
    const saudi = computeRiskDecision(baseFeatures());
    const nonSaudi = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    expect(nonSaudi.finalScore).toBeLessThan(saudi.finalScore);
  });

  it("penalizes high-value assets", () => {
    const low = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 100_000 }));
    const ultra = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 15_000_000 }));
    expect(ultra.finalScore).toBeLessThan(low.finalScore);
  });

  it("clamps score between 0 and 100", () => {
    const worst = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 1,
        completedRentals: 0,
        disputedRentals: 5,
        lateReturns: 5,
        cancelledRentals: 10,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 20_000_000,
        phoneVerified: false,
        emailVerified: false,
      })
    );
    expect(worst.finalScore).toBeGreaterThanOrEqual(0);
    expect(worst.finalScore).toBeLessThanOrEqual(100);
  });

  it("flags manual review for scores between 25 and 40", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 1,
        requestedAssetValueHalalas: 5_000_000,
        countryIsSaudi: false,
      })
    );
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
  });

  it("auto-rejects scores below 25", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 1,
        completedRentals: 0,
        disputedRentals: 3,
        lateReturns: 3,
        cancelledRentals: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 15_000_000,
      })
    );
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/trust score/i);
  });

  it("rewards long account age", () => {
    const young = computeRiskDecision(baseFeatures({ accountAgeDays: 50 }));
    const old = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
    expect(old.finalScore).toBeGreaterThan(young.finalScore);
  });

  it("correctly calculates legal commitment halalas", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 1_000_000 })
    );
    const expectedHalalas = Math.round(
      (1_000_000 * d.legalCommitmentPct!) / 100
    );
    expect(d.legalCommitmentHalalas).toBe(expectedHalalas);
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for score >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("returns medium for score >= 60", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("returns high for score >= 25", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("returns ultra_high for score < 25", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
