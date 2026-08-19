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
    requestedAssetValueHalalas: 5_000_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision — hard rejections", () => {
  it("rejects blocked users", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.notes).toContain("hard_reject:blocked");
  });

  it("rejects unverified Nafath", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.notes).toContain("hard_reject:nafath_required");
  });

  it("rejects unverified KYC", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.notes).toContain("hard_reject:kyc_required");
  });
});

describe("computeRiskDecision — scoring modifiers", () => {
  it("boosts score for account age > 365 days", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
    expect(d.modifiers.find((m) => m.key === "age_365")?.delta).toBe(15);
    expect(d.approved).toBe(true);
  });

  it("boosts score for account age > 90 days", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
    expect(d.modifiers.find((m) => m.key === "age_90")?.delta).toBe(8);
  });

  it("penalizes new accounts < 30 days", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 15 }));
    expect(d.modifiers.find((m) => m.key === "age_new")?.delta).toBe(-10);
  });

  it("boosts for 10+ completed rentals", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
    expect(d.modifiers.find((m) => m.key === "rentals_10")?.delta).toBe(15);
  });

  it("penalizes first-time renters", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
    expect(d.modifiers.find((m) => m.key === "rentals_none")?.delta).toBe(-5);
  });

  it("penalizes disputes", () => {
    const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    expect(d.modifiers.find((m) => m.key === "disputes")?.delta).toBe(-20);
  });

  it("penalizes late returns", () => {
    const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    expect(d.modifiers.find((m) => m.key === "late_returns")?.delta).toBe(-15);
  });

  it("penalizes excessive cancellations", () => {
    const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
    expect(d.modifiers.find((m) => m.key === "cancellations")?.delta).toBe(-8);
  });

  it("penalizes non-Saudi registrations", () => {
    const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    expect(d.modifiers.find((m) => m.key === "non_ksa")?.delta).toBe(-10);
  });

  it("penalizes high-value assets >= 100k SAR", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
    );
    expect(d.modifiers.find((m) => m.key === "value_ultra")?.delta).toBe(-10);
  });

  it("penalizes mid-value assets >= 30k SAR", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 5_000_000 })
    );
    expect(d.modifiers.find((m) => m.key === "value_high")?.delta).toBe(-5);
  });
});

describe("computeRiskDecision — trusted vs untrusted", () => {
  it("grants 100% commitment to trusted users", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 200,
        completedRentals: 5,
        disputedRentals: 0,
        requestedAssetValueHalalas: 1_000_000,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.legalCommitmentHalalas).toBe(1_000_000);
    expect(d.notes).toContain("trusted_user:100pct");
  });

  it("requires 150% commitment from new users", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 20,
        completedRentals: 0,
        requestedAssetValueHalalas: 1_000_000,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(1_500_000);
    expect(d.notes).toContain("new_or_untrusted_user:150pct");
  });

  it("requires 150% if user has disputes even with good history", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 200,
        completedRentals: 10,
        disputedRentals: 1,
        requestedAssetValueHalalas: 1_000_000,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
  });
});

describe("computeRiskDecision — score rejection threshold", () => {
  it("auto-rejects users below score threshold 25", () => {
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
        requestedAssetValueHalalas: 15_000_000,
      })
    );
    expect(d.approved).toBe(false);
    expect(d.finalScore).toBeLessThan(25);
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("flags manual review for scores between 25 and 40", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        disputedRentals: 1,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 15_000_000,
      })
    );
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
  });
});

describe("computeRiskDecision — score clamping", () => {
  it("clamps score to 0 minimum", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 5,
        cancelledRentals: 10,
        lateReturns: 10,
        phoneVerified: false,
        emailVerified: false,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 50_000_000,
      })
    );
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("clamps score to 100 maximum", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 1000,
        completedRentals: 100,
        requestedAssetValueHalalas: 100,
      })
    );
    expect(d.finalScore).toBeLessThanOrEqual(100);
  });
});

describe("trustScoreToCategory", () => {
  it("maps >= 80 to low", () => {
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

  it("maps < 25 to ultra_high", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
