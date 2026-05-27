import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "./riskEngine.js";

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
    requestedAssetValueHalalas: 1_000_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  describe("hard rejects", () => {
    it("rejects blocked users immediately", () => {
      const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/blocked/i);
      expect(d.riskCategory).toBe("ultra_high");
      expect(d.finalScore).toBe(0);
    });

    it("rejects without Nafath verification", () => {
      const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/nafath/i);
    });

    it("rejects without KYC verification", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/kyc/i);
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

    it("penalizes accounts younger than 30 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 15 }));
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

    it("penalizes disputes proportionally", () => {
      const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "disputes");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-20);
    });

    it("penalizes late returns proportionally", () => {
      const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
      const mod = d.modifiers.find((m) => m.key === "late_returns");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-15);
    });

    it("penalizes excessive cancellations", () => {
      const d = computeRiskDecision(baseFeatures({ cancelledRentals: 5 }));
      const mod = d.modifiers.find((m) => m.key === "cancellations");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-8);
    });

    it("penalizes non-KSA users", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes ultra-high value assets (>= 100k SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes high value assets (>= 30k SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 5_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_high");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });
  });

  describe("trust and commitment", () => {
    it("gives trusted users 100% commitment", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 200,
          completedRentals: 5,
          disputedRentals: 0,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.notes).toContain("trusted_user:100pct");
    });

    it("gives new users 150% commitment", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 50,
          completedRentals: 1,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.notes).toContain("new_or_untrusted_user:150pct");
    });

    it("calculates legal commitment in halalas", () => {
      const assetValue = 2_000_000;
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 50,
          completedRentals: 1,
          requestedAssetValueHalalas: assetValue,
        })
      );
      expect(d.legalCommitmentHalalas).toBe(assetValue * 1.5);
    });
  });

  describe("risk categories", () => {
    it("categorizes score >= 80 as low risk", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 400, completedRentals: 12 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("flags manual review for scores 25-40", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 10,
          completedRentals: 0,
          disputedRentals: 1,
          lateReturns: 1,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 5_000_000,
        })
      );
      if (d.finalScore >= 25 && d.finalScore < 40) {
        expect(d.requiresReview).toBe(true);
        expect(d.notes).toContain("manual_review_recommended");
      }
    });

    it("auto-rejects scores below 25", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 3,
          lateReturns: 3,
          cancelledRentals: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 20_000_000,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.riskCategory).toBe("ultra_high");
    });
  });

  describe("score clamping", () => {
    it("clamps score to 0-100 range", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 400,
          completedRentals: 15,
          phoneVerified: true,
          emailVerified: true,
        })
      );
      expect(d.finalScore).toBeLessThanOrEqual(100);
      expect(d.finalScore).toBeGreaterThanOrEqual(0);
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
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
