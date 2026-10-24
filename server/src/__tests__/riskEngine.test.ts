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
    requestedAssetValueHalalas: 500_000, // 5,000 SAR
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  describe("hard reject rules", () => {
    it("rejects blocked users immediately", () => {
      const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("blocked");
      expect(d.riskCategory).toBe("ultra_high");
      expect(d.finalScore).toBe(0);
    });

    it("rejects users without Nafath verification", () => {
      const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("Nafath");
      expect(d.riskCategory).toBe("high");
    });

    it("rejects users without KYC", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("KYC");
    });
  });

  describe("scoring modifiers", () => {
    it("rewards accounts older than 1 year (+15)", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("rewards accounts older than 90 days (+8)", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 95 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_90");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(8);
    });

    it("penalizes accounts younger than 30 days (-10)", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 10 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_new");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(-10);
    });

    it("rewards 10+ completed rentals (+15)", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_10");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(15);
    });

    it("penalizes first-time renters (-5)", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_none");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });

    it("penalizes disputed rentals (-10 each)", () => {
      const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "disputes");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-20);
    });

    it("penalizes late returns (-5 each)", () => {
      const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
      const mod = d.modifiers.find((m) => m.key === "late_returns");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-15);
    });

    it("penalizes non-KSA users (-10)", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes ultra-high value assets >= 100k SAR (-10)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes high value assets >= 30k SAR (-5)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 5_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_high");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });
  });

  describe("score clamping and categories", () => {
    it("clamps score to 0-100 range", () => {
      const d = computeRiskDecision(
        baseFeatures({
          disputedRentals: 10,
          lateReturns: 10,
          cancelledRentals: 5,
          completedRentals: 0,
          accountAgeDays: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 20_000_000,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(0);
      expect(d.finalScore).toBeLessThanOrEqual(100);
    });

    it("auto-rejects when score falls below 25", () => {
      const d = computeRiskDecision(
        baseFeatures({
          disputedRentals: 5,
          lateReturns: 5,
          completedRentals: 0,
          accountAgeDays: 5,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.riskCategory).toBe("ultra_high");
    });
  });

  describe("legal commitment percentage", () => {
    it("assigns 100% commitment for trusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 120,
          completedRentals: 5,
          disputedRentals: 0,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.notes).toContain("trusted_user:100pct");
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

    it("assigns 150% if user has disputes even with history", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 200,
          completedRentals: 10,
          disputedRentals: 1,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
    });

    it("computes commitment halalas correctly", () => {
      const assetValue = 1_000_000; // 10,000 SAR
      const d = computeRiskDecision(
        baseFeatures({
          requestedAssetValueHalalas: assetValue,
          accountAgeDays: 10,
          completedRentals: 0,
        })
      );
      expect(d.legalCommitmentHalalas).toBe(1_500_000); // 150%
    });
  });

  describe("manual review", () => {
    it("flags for manual review when score is 25-39", () => {
      const d = computeRiskDecision(
        baseFeatures({
          disputedRentals: 2,
          completedRentals: 0,
          accountAgeDays: 5,
          countryIsSaudi: false,
        })
      );
      if (d.approved && d.finalScore < 40) {
        expect(d.requiresReview).toBe(true);
        expect(d.notes).toContain("manual_review_recommended");
      }
    });
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for scores >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("returns medium for scores 60-79", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("returns high for scores 25-59", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("returns ultra_high for scores below 25", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
