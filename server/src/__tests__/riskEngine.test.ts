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
      expect(d.rejectionReason).toBe("User is currently blocked");
      expect(d.riskCategory).toBe("ultra_high");
      expect(d.finalScore).toBe(0);
    });

    it("rejects users without Nafath verification", () => {
      const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("Nafath");
      expect(d.riskCategory).toBe("high");
    });

    it("rejects users without KYC verification", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("KYC");
    });

    it("checks blocked before Nafath", () => {
      const d = computeRiskDecision(
        baseFeatures({ priorBlock: true, nafathVerified: false })
      );
      expect(d.rejectionReason).toBe("User is currently blocked");
    });
  });

  describe("base score and modifiers", () => {
    it("starts from base score of 50", () => {
      const d = computeRiskDecision(baseFeatures());
      expect(d.baseScore).toBe(50);
    });

    it("adds +15 for accounts older than 1 year", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("adds +8 for accounts older than 90 days (but under 365)", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_90");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(8);
    });

    it("penalizes -10 for accounts younger than 30 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 15 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_new");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(-10);
    });

    it("adds +15 for 10+ completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_10");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(15);
    });

    it("adds +8 for 3+ completed rentals (under 10)", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 5 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_3");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(8);
    });

    it("penalizes -5 for first-time renters", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_none");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });

    it("penalizes -10 per disputed rental", () => {
      const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "disputes");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-20);
    });

    it("penalizes -5 per late return", () => {
      const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
      const mod = d.modifiers.find((m) => m.key === "late_returns");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-15);
    });

    it("penalizes -8 for 3+ cancellations", () => {
      const d = computeRiskDecision(baseFeatures({ cancelledRentals: 3 }));
      const mod = d.modifiers.find((m) => m.key === "cancellations");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-8);
    });

    it("adds +2 each for phone and email verification", () => {
      const d = computeRiskDecision(baseFeatures());
      const phoneMod = d.modifiers.find((m) => m.key === "phone_ok");
      const emailMod = d.modifiers.find((m) => m.key === "email_ok");
      expect(phoneMod!.delta).toBe(2);
      expect(emailMod!.delta).toBe(2);
    });

    it("penalizes -10 for non-KSA users", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes -10 for ultra-high-value assets (>=100k SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 10_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes -5 for high-value assets (30k-100k SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 5_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_high");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });

    it("no value penalty for assets under 30k SAR", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 100_000 })
      );
      const valueMod = d.modifiers.find(
        (m) => m.key === "value_ultra" || m.key === "value_high"
      );
      expect(valueMod).toBeUndefined();
    });
  });

  describe("score clamping", () => {
    it("clamps score to minimum 0", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 5,
          lateReturns: 5,
          cancelledRentals: 5,
          countryIsSaudi: false,
          phoneVerified: false,
          emailVerified: false,
          requestedAssetValueHalalas: 20_000_000,
        })
      );
      expect(d.finalScore).toBe(0);
      expect(d.approved).toBe(false);
    });

    it("clamps score to maximum 100", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 500,
          completedRentals: 15,
          requestedAssetValueHalalas: 10_000,
        })
      );
      expect(d.finalScore).toBeLessThanOrEqual(100);
    });
  });

  describe("risk categories", () => {
    it("assigns 'low' for score >= 80", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 500, completedRentals: 15 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("assigns 'medium' for score 60-79", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 100, completedRentals: 5 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(60);
      expect(d.finalScore).toBeLessThan(80);
      expect(d.riskCategory).toBe("medium");
    });

    it("assigns 'high' for score 25-59", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 15,
          completedRentals: 0,
          disputedRentals: 1,
          phoneVerified: false,
          emailVerified: false,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(25);
      expect(d.finalScore).toBeLessThan(60);
      expect(d.riskCategory).toBe("high");
    });
  });

  describe("legal commitment", () => {
    it("assigns 100% commitment for trusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 100,
          completedRentals: 5,
          disputedRentals: 0,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(70);
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.notes).toContain("trusted_user:100pct");
    });

    it("assigns 150% commitment for untrusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 50,
          completedRentals: 1,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.notes).toContain("new_or_untrusted_user:150pct");
    });

    it("computes correct commitment amount at 100%", () => {
      const assetValue = 1_000_000;
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 100,
          completedRentals: 5,
          requestedAssetValueHalalas: assetValue,
        })
      );
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.legalCommitmentHalalas).toBe(assetValue);
    });

    it("computes correct commitment amount at 150%", () => {
      const assetValue = 1_000_000;
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 50,
          completedRentals: 1,
          requestedAssetValueHalalas: assetValue,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.legalCommitmentHalalas).toBe(1_500_000);
    });

    it("returns null commitment for rejected users", () => {
      const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
      expect(d.legalCommitmentPct).toBeNull();
      expect(d.legalCommitmentHalalas).toBe(0);
    });
  });

  describe("manual review", () => {
    it("flags manual review for scores below 40", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 15,
          completedRentals: 0,
          lateReturns: 1,
          phoneVerified: false,
          emailVerified: false,
        })
      );
      expect(d.finalScore).toBeLessThan(40);
      expect(d.requiresReview).toBe(true);
      expect(d.notes).toContain("manual_review_recommended");
    });

    it("does not flag manual review for high scores", () => {
      const d = computeRiskDecision(baseFeatures());
      expect(d.requiresReview).toBe(false);
    });
  });

  describe("determinism", () => {
    it("returns identical results for identical inputs", () => {
      const features = baseFeatures();
      const d1 = computeRiskDecision(features);
      const d2 = computeRiskDecision(features);
      expect(d1).toEqual(d2);
    });
  });
});

describe("trustScoreToCategory", () => {
  it("returns 'low' for scores >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("returns 'medium' for scores 60-79", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("returns 'high' for scores 25-59", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("returns 'ultra_high' for scores < 25", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
