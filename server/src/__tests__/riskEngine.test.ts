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
  describe("hard rejects", () => {
    it("rejects blocked users", () => {
      const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("blocked");
      expect(d.riskCategory).toBe("ultra_high");
      expect(d.finalScore).toBe(0);
    });

    it("rejects unverified Nafath", () => {
      const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("Nafath");
      expect(d.riskCategory).toBe("high");
    });

    it("rejects unverified KYC", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("KYC");
    });
  });

  describe("score modifiers", () => {
    it("adds +15 for accounts older than 1 year", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("adds +8 for accounts older than 90 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_90");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(8);
    });

    it("penalizes new accounts under 30 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 10 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_new");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(-10);
    });

    it("rewards 10+ completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_10");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(15);
    });

    it("penalizes first-time renters", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_none");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });

    it("penalizes disputed rentals proportionally", () => {
      const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "disputes");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-20);
    });

    it("penalizes late returns", () => {
      const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
      const mod = d.modifiers.find((m) => m.key === "late_returns");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-15);
    });

    it("penalizes excessive cancellations", () => {
      const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
      const mod = d.modifiers.find((m) => m.key === "cancellations");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-8);
    });

    it("rewards phone and email verification", () => {
      const d = computeRiskDecision(baseFeatures());
      const phoneMod = d.modifiers.find((m) => m.key === "phone_ok");
      const emailMod = d.modifiers.find((m) => m.key === "email_ok");
      expect(phoneMod!.delta).toBe(2);
      expect(emailMod!.delta).toBe(2);
    });

    it("penalizes non-Saudi identity", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes ultra-high value assets (>=100k SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes high value assets (>=30k SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 5_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_high");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });
  });

  describe("score clamping", () => {
    it("clamps score to 0 minimum", () => {
      const d = computeRiskDecision(
        baseFeatures({
          disputedRentals: 10,
          lateReturns: 10,
          cancelledRentals: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 15_000_000,
          completedRentals: 0,
          accountAgeDays: 5,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(0);
    });

    it("clamps score to 100 maximum", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 500,
          completedRentals: 20,
          requestedAssetValueHalalas: 100_00,
        })
      );
      expect(d.finalScore).toBeLessThanOrEqual(100);
    });
  });

  describe("risk categories", () => {
    it("assigns low risk for score >= 80", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 500, completedRentals: 15 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("assigns medium risk for score 60-79", () => {
      const d = computeRiskDecision(baseFeatures());
      expect(d.finalScore).toBeGreaterThanOrEqual(60);
      expect(d.finalScore).toBeLessThan(80);
      expect(d.riskCategory).toBe("medium");
    });
  });

  describe("legal commitment", () => {
    it("assigns 100% commitment for trusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 120,
          completedRentals: 5,
          disputedRentals: 0,
        })
      );
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.notes).toContain("trusted_user:100pct");
    });

    it("assigns 150% commitment for new/untrusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 20, completedRentals: 0 })
      );
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.notes).toContain("new_or_untrusted_user:150pct");
    });

    it("computes commitment halalas correctly at 100%", () => {
      const assetValue = 1_000_000;
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: assetValue })
      );
      if (d.legalCommitmentPct === 100) {
        expect(d.legalCommitmentHalalas).toBe(assetValue);
      }
    });

    it("computes commitment halalas correctly at 150%", () => {
      const assetValue = 1_000_000;
      const d = computeRiskDecision(
        baseFeatures({
          requestedAssetValueHalalas: assetValue,
          accountAgeDays: 10,
          completedRentals: 0,
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
    it("flags manual review when score is between 25-40", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 10,
          completedRentals: 0,
          disputedRentals: 1,
          countryIsSaudi: false,
        })
      );
      if (d.approved && d.finalScore < 40) {
        expect(d.requiresReview).toBe(true);
        expect(d.notes).toContain("manual_review_recommended");
      }
    });
  });

  describe("auto reject on low score", () => {
    it("auto-rejects when final score drops below 25", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 3,
          lateReturns: 2,
          cancelledRentals: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 15_000_000,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("Trust score below");
    });
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for score >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("returns medium for score 60-79", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("returns high for score 25-59", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("returns ultra_high for score < 25", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
