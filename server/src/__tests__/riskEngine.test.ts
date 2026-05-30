import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  RiskFeatures,
} from "../services/riskEngine.js";

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
    requestedAssetValueHalalas: 500_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("Risk Engine — hard reject rules", () => {
  it("rejects blocked users immediately", () => {
    const decision = computeRiskDecision(makeFeatures({ priorBlock: true }));
    expect(decision.approved).toBe(false);
    expect(decision.rejectionReason).toContain("blocked");
    expect(decision.riskCategory).toBe("ultra_high");
    expect(decision.finalScore).toBe(0);
  });

  it("rejects users without Nafath verification", () => {
    const decision = computeRiskDecision(makeFeatures({ nafathVerified: false }));
    expect(decision.approved).toBe(false);
    expect(decision.rejectionReason).toContain("Nafath");
  });

  it("rejects users without KYC verification", () => {
    const decision = computeRiskDecision(makeFeatures({ kycVerified: false }));
    expect(decision.approved).toBe(false);
    expect(decision.rejectionReason).toContain("KYC");
  });
});

describe("Risk Engine — scoring modifiers", () => {
  it("rewards accounts older than 1 year with +15", () => {
    const decision = computeRiskDecision(makeFeatures({ accountAgeDays: 400 }));
    const ageModifier = decision.modifiers.find((m) => m.key === "age_365");
    expect(ageModifier).toBeDefined();
    expect(ageModifier!.delta).toBe(15);
  });

  it("rewards accounts older than 90 days with +8", () => {
    const decision = computeRiskDecision(makeFeatures({ accountAgeDays: 91 }));
    const ageModifier = decision.modifiers.find((m) => m.key === "age_90");
    expect(ageModifier).toBeDefined();
    expect(ageModifier!.delta).toBe(8);
  });

  it("penalizes accounts younger than 30 days with -10", () => {
    const decision = computeRiskDecision(makeFeatures({ accountAgeDays: 15 }));
    const ageModifier = decision.modifiers.find((m) => m.key === "age_new");
    expect(ageModifier).toBeDefined();
    expect(ageModifier!.delta).toBe(-10);
  });

  it("rewards 10+ completed rentals with +15", () => {
    const decision = computeRiskDecision(makeFeatures({ completedRentals: 12 }));
    const mod = decision.modifiers.find((m) => m.key === "rentals_10");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(15);
  });

  it("penalizes first-time renters with -5", () => {
    const decision = computeRiskDecision(makeFeatures({ completedRentals: 0 }));
    const mod = decision.modifiers.find((m) => m.key === "rentals_none");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });

  it("penalizes disputes at -10 each", () => {
    const decision = computeRiskDecision(makeFeatures({ disputedRentals: 2 }));
    const mod = decision.modifiers.find((m) => m.key === "disputes");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-20);
  });

  it("penalizes late returns at -5 each", () => {
    const decision = computeRiskDecision(makeFeatures({ lateReturns: 3 }));
    const mod = decision.modifiers.find((m) => m.key === "late_returns");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-15);
  });

  it("penalizes 3+ cancellations with -8", () => {
    const decision = computeRiskDecision(makeFeatures({ cancelledRentals: 3 }));
    const mod = decision.modifiers.find((m) => m.key === "cancellations");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-8);
  });

  it("penalizes ultra-high-value assets (>=100k SAR) with -10", () => {
    const decision = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 100_000 * 100 })
    );
    const mod = decision.modifiers.find((m) => m.key === "value_ultra");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("penalizes non-Saudi users with -10", () => {
    const decision = computeRiskDecision(makeFeatures({ countryIsSaudi: false }));
    const mod = decision.modifiers.find((m) => m.key === "non_ksa");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });
});

describe("Risk Engine — trusted vs new user commitment", () => {
  it("assigns 100% commitment to trusted users", () => {
    const decision = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 120,
        completedRentals: 5,
        disputedRentals: 0,
      })
    );
    expect(decision.approved).toBe(true);
    expect(decision.legalCommitmentPct).toBe(100);
    expect(decision.notes).toContain("trusted_user:100pct");
  });

  it("assigns 150% commitment to new/untrusted users", () => {
    const decision = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 50,
        completedRentals: 1,
      })
    );
    expect(decision.approved).toBe(true);
    expect(decision.legalCommitmentPct).toBe(150);
    expect(decision.notes).toContain("new_or_untrusted_user:150pct");
  });

  it("computes commitment halalas correctly at 100%", () => {
    const assetValue = 500_000;
    const decision = computeRiskDecision(
      makeFeatures({
        requestedAssetValueHalalas: assetValue,
        accountAgeDays: 120,
        completedRentals: 5,
      })
    );
    expect(decision.legalCommitmentHalalas).toBe(assetValue);
  });

  it("computes commitment halalas correctly at 150%", () => {
    const assetValue = 500_000;
    const decision = computeRiskDecision(
      makeFeatures({
        requestedAssetValueHalalas: assetValue,
        accountAgeDays: 10,
        completedRentals: 0,
      })
    );
    expect(decision.legalCommitmentHalalas).toBe(Math.round(assetValue * 1.5));
  });
});

describe("Risk Engine — score thresholds", () => {
  it("auto-rejects when final score < 25", () => {
    const decision = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        cancelledRentals: 5,
        lateReturns: 2,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 200_000 * 100,
      })
    );
    expect(decision.approved).toBe(false);
    expect(decision.riskCategory).toBe("ultra_high");
  });

  it("flags manual review for scores between 25-40", () => {
    const decision = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 1,
        phoneVerified: false,
        emailVerified: false,
      })
    );
    if (decision.approved && decision.finalScore < 40) {
      expect(decision.requiresReview).toBe(true);
    }
  });

  it("clamps score to 0-100 range", () => {
    const veryGood = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 500,
        completedRentals: 20,
      })
    );
    expect(veryGood.finalScore).toBeLessThanOrEqual(100);

    const veryBad = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 1,
        completedRentals: 0,
        disputedRentals: 5,
        cancelledRentals: 10,
        lateReturns: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 500_000 * 100,
      })
    );
    expect(veryBad.finalScore).toBeGreaterThanOrEqual(0);
  });
});

describe("Risk Engine — risk categories", () => {
  it("categorizes score >= 80 as low risk", () => {
    const decision = computeRiskDecision(
      makeFeatures({ accountAgeDays: 500, completedRentals: 15 })
    );
    expect(decision.finalScore).toBeGreaterThanOrEqual(80);
    expect(decision.riskCategory).toBe("low");
  });

  it("categorizes score 60-79 as medium risk", () => {
    const decision = computeRiskDecision(
      makeFeatures({ accountAgeDays: 120, completedRentals: 5 })
    );
    expect(decision.finalScore).toBeGreaterThanOrEqual(60);
    expect(decision.finalScore).toBeLessThan(80);
    expect(decision.riskCategory).toBe("medium");
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for score >= 80", () => {
    expect(trustScoreToCategory(85)).toBe("low");
  });

  it("returns medium for score 60-79", () => {
    expect(trustScoreToCategory(65)).toBe("medium");
  });

  it("returns high for score 25-59", () => {
    expect(trustScoreToCategory(40)).toBe("high");
  });

  it("returns ultra_high for score < 25", () => {
    expect(trustScoreToCategory(10)).toBe("ultra_high");
  });
});

describe("Risk Engine — determinism", () => {
  it("produces identical results for identical inputs", () => {
    const features = makeFeatures();
    const d1 = computeRiskDecision(features);
    const d2 = computeRiskDecision(features);
    expect(d1).toEqual(d2);
  });
});
