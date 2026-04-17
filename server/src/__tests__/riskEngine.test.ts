import { describe, it, expect } from "vitest";
import { computeRiskDecision, trustScoreToCategory, type RiskFeatures } from "../services/riskEngine.js";

function makeFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
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
  it("hard rejects blocked users", () => {
    const d = computeRiskDecision(makeFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("blocked");
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("hard rejects without Nafath", () => {
    const d = computeRiskDecision(makeFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("Nafath");
  });

  it("hard rejects without KYC", () => {
    const d = computeRiskDecision(makeFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("KYC");
  });

  it("approves trusted user with 100% commitment", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 365,
        completedRentals: 10,
        disputedRentals: 0,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.riskCategory).toBe("low");
    expect(d.finalScore).toBeGreaterThanOrEqual(80);
  });

  it("gives 150% commitment to new users", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
  });

  it("penalizes disputes heavily", () => {
    const clean = computeRiskDecision(makeFeatures({ disputedRentals: 0 }));
    const disputed = computeRiskDecision(makeFeatures({ disputedRentals: 2 }));
    expect(disputed.finalScore).toBeLessThan(clean.finalScore);
    expect(clean.finalScore - disputed.finalScore).toBe(20);
  });

  it("penalizes late returns", () => {
    const onTime = computeRiskDecision(makeFeatures({ lateReturns: 0 }));
    const late = computeRiskDecision(makeFeatures({ lateReturns: 3 }));
    expect(late.finalScore).toBeLessThan(onTime.finalScore);
    expect(onTime.finalScore - late.finalScore).toBe(15);
  });

  it("penalizes excessive cancellations", () => {
    const ok = computeRiskDecision(makeFeatures({ cancelledRentals: 1 }));
    const bad = computeRiskDecision(makeFeatures({ cancelledRentals: 5 }));
    expect(bad.finalScore).toBeLessThan(ok.finalScore);
  });

  it("gives bonus for verified phone and email", () => {
    const verified = computeRiskDecision(makeFeatures({ phoneVerified: true, emailVerified: true }));
    const unverified = computeRiskDecision(makeFeatures({ phoneVerified: false, emailVerified: false }));
    expect(verified.finalScore - unverified.finalScore).toBe(4);
  });

  it("penalizes non-Saudi users", () => {
    const ksa = computeRiskDecision(makeFeatures({ countryIsSaudi: true }));
    const nonKsa = computeRiskDecision(makeFeatures({ countryIsSaudi: false }));
    expect(nonKsa.finalScore).toBeLessThan(ksa.finalScore);
  });

  it("penalizes high-value assets", () => {
    const cheap = computeRiskDecision(makeFeatures({ requestedAssetValueHalalas: 100000 }));
    const expensive = computeRiskDecision(makeFeatures({ requestedAssetValueHalalas: 10000000 }));
    expect(expensive.finalScore).toBeLessThan(cheap.finalScore);
  });

  it("computes correct commitment amount", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        requestedAssetValueHalalas: 1000000,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(1500000);
  });

  it("flags manual review for borderline scores", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        lateReturns: 2,
        cancelledRentals: 3,
      })
    );
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
  });

  it("rejects ultra-low scores outright", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 1,
        completedRentals: 0,
        disputedRentals: 3,
        lateReturns: 3,
        cancelledRentals: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 10000000,
      })
    );
    expect(d.approved).toBe(false);
    expect(d.finalScore).toBeLessThan(25);
  });

  it("clamps score to 0..100 range", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 1,
        completedRentals: 0,
        disputedRentals: 10,
        lateReturns: 10,
        cancelledRentals: 10,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 10000000,
      })
    );
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
    expect(d.finalScore).toBeLessThanOrEqual(100);
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for 80+", () => {
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
  it("returns ultra_high for <25", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
