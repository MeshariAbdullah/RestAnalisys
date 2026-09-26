import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  RiskFeatures,
} from "../riskEngine.js";

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
  describe("hard rejects", () => {
    it("rejects blocked users immediately", () => {
      const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/blocked/i);
      expect(d.riskCategory).toBe("ultra_high");
      expect(d.finalScore).toBe(0);
    });

    it("rejects unverified Nafath", () => {
      const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/nafath/i);
    });

    it("rejects unverified KYC", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/kyc/i);
    });
  });

  describe("base score and modifiers", () => {
    it("starts at base score 50", () => {
      const d = computeRiskDecision(baseFeatures());
      expect(d.baseScore).toBe(50);
    });

    it("adds +15 for account age >= 365 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("adds +8 for account age >= 90 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_90");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(8);
    });

    it("subtracts 10 for account age < 30 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 15 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_new");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(-10);
    });

    it("adds +15 for >= 10 completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_10");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(15);
    });

    it("adds +8 for >= 3 completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 5 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_3");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(8);
    });

    it("subtracts 5 for first-time renter", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_none");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });

    it("penalizes disputed rentals by -10 each", () => {
      const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "disputes");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-20);
    });

    it("penalizes late returns by -5 each", () => {
      const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
      const mod = d.modifiers.find((m) => m.key === "late_returns");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-15);
    });

    it("penalizes 3+ cancellations", () => {
      const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
      const mod = d.modifiers.find((m) => m.key === "cancellations");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-8);
    });

    it("does not penalize < 3 cancellations", () => {
      const d = computeRiskDecision(baseFeatures({ cancelledRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "cancellations");
      expect(mod).toBeUndefined();
    });

    it("adds +2 for phone verification", () => {
      const d = computeRiskDecision(baseFeatures({ phoneVerified: true }));
      const mod = d.modifiers.find((m) => m.key === "phone_ok");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(2);
    });

    it("adds +2 for email verification", () => {
      const d = computeRiskDecision(baseFeatures({ emailVerified: true }));
      const mod = d.modifiers.find((m) => m.key === "email_ok");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(2);
    });

    it("penalizes non-KSA identity", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes ultra-high-value assets (>= 100k SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes high-value assets (>= 30k SAR)", () => {
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
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 5,
          cancelledRentals: 5,
          lateReturns: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 15_000_000,
          phoneVerified: false,
          emailVerified: false,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(0);
    });

    it("clamps score to 100 maximum", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 500,
          completedRentals: 20,
        })
      );
      expect(d.finalScore).toBeLessThanOrEqual(100);
    });
  });

  describe("risk categories", () => {
    it("assigns 'low' for scores >= 80", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 400, completedRentals: 15 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("assigns 'medium' for scores 60-79", () => {
      const d = computeRiskDecision(baseFeatures());
      expect(d.finalScore).toBeGreaterThanOrEqual(60);
      expect(d.finalScore).toBeLessThan(80);
      expect(d.riskCategory).toBe("medium");
    });
  });

  describe("legal commitment percentage", () => {
    it("assigns 100% for trusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 400,
          completedRentals: 10,
          disputedRentals: 0,
        })
      );
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.notes).toContain("trusted_user:100pct");
    });

    it("assigns 150% for new/untrusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 50,
          completedRentals: 1,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.notes).toContain("new_or_untrusted_user:150pct");
    });

    it("assigns 150% when user has disputes even if otherwise trusted", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 400,
          completedRentals: 10,
          disputedRentals: 1,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
    });

    it("computes legalCommitmentHalalas correctly at 100%", () => {
      const assetValue = 1_000_000;
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 400,
          completedRentals: 10,
          disputedRentals: 0,
          requestedAssetValueHalalas: assetValue,
        })
      );
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.legalCommitmentHalalas).toBe(assetValue);
    });

    it("computes legalCommitmentHalalas correctly at 150%", () => {
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
  });

  describe("manual review", () => {
    it("flags for manual review when score < 40", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 1,
          countryIsSaudi: false,
          phoneVerified: false,
          emailVerified: false,
        })
      );
      if (d.approved && d.finalScore < 40) {
        expect(d.requiresReview).toBe(true);
        expect(d.notes).toContain("manual_review_recommended");
      }
    });
  });

  describe("auto-rejection on low score", () => {
    it("rejects when final score < 25", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 3,
          cancelledRentals: 5,
          lateReturns: 3,
          countryIsSaudi: false,
          phoneVerified: false,
          emailVerified: false,
          requestedAssetValueHalalas: 15_000_000,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/threshold/i);
    });
  });
});

describe("trustScoreToCategory", () => {
  it("returns 'low' for score >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("returns 'medium' for score 60-79", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("returns 'high' for score 25-59", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("returns 'ultra_high' for score < 25", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
