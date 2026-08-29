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
    requestedAssetValueHalalas: 500_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  it("approves a healthy user", () => {
    const d = computeRiskDecision(baseFeatures());
    expect(d.approved).toBe(true);
    expect(d.finalScore).toBeGreaterThanOrEqual(50);
    expect(d.legalCommitmentPct).toBeDefined();
  });

  it("hard-rejects a blocked user", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("blocked");
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("hard-rejects without Nafath verification", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("Nafath");
  });

  it("hard-rejects without KYC verification", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("KYC");
  });

  it("gives trusted users 100% commitment", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 180,
        completedRentals: 5,
        disputedRentals: 0,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.notes).toContain("trusted_user:100pct");
  });

  it("gives untrusted/new users 150% commitment", () => {
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
    const low = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 100_000 })
    );
    const ultra = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
    );
    expect(ultra.finalScore).toBeLessThan(low.finalScore);
  });

  it("rewards account age", () => {
    const young = computeRiskDecision(baseFeatures({ accountAgeDays: 5 }));
    const old = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
    expect(old.finalScore).toBeGreaterThan(young.finalScore);
  });

  it("clamps score between 0 and 100", () => {
    const worst = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 1,
        completedRentals: 0,
        disputedRentals: 5,
        cancelledRentals: 10,
        lateReturns: 5,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 20_000_000,
        countryIsSaudi: false,
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
        countryIsSaudi: false,
      })
    );
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
  });

  it("calculates commitment halalas correctly", () => {
    const value = 1_000_000;
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: value })
    );
    expect(d.legalCommitmentHalalas).toBe(
      Math.round((value * d.legalCommitmentPct!) / 100)
    );
  });
});

describe("trustScoreToCategory", () => {
  it("maps scores to correct categories", () => {
    expect(trustScoreToCategory(85)).toBe("low");
    expect(trustScoreToCategory(65)).toBe("medium");
    expect(trustScoreToCategory(30)).toBe("high");
    expect(trustScoreToCategory(10)).toBe("ultra_high");
  });
});
