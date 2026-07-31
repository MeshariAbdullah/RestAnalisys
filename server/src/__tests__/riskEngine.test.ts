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
  describe("hard rejections", () => {
    it("rejects blocked users", () => {
      const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/blocked/i);
      expect(d.riskCategory).toBe("ultra_high");
      expect(d.finalScore).toBe(0);
    });

    it("rejects without Nafath verification", () => {
      const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/Nafath/i);
    });

    it("rejects without KYC verification", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/KYC/i);
    });
  });

  describe("score modifiers", () => {
    it("gives +15 for accounts older than 365 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("gives +8 for accounts between 90-365 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 120 }));
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

    it("gives +15 for 10+ completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_10");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(15);
    });

    it("gives +8 for 3-9 completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 5 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_3");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(8);
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

    it("penalizes 3+ cancellations", () => {
      const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
      const mod = d.modifiers.find((m) => m.key === "cancellations");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-8);
    });

    it("rewards phone verification", () => {
      const d = computeRiskDecision(baseFeatures({ phoneVerified: true }));
      const mod = d.modifiers.find((m) => m.key === "phone_ok");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(2);
    });

    it("rewards email verification", () => {
      const d = computeRiskDecision(baseFeatures({ emailVerified: true }));
      const mod = d.modifiers.find((m) => m.key === "email_ok");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(2);
    });

    it("penalizes non-Saudi users", () => {
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

  describe("score clamping", () => {
    it("clamps score to minimum 0", () => {
      const d = computeRiskDecision(
        baseFeatures({
          disputedRentals: 10,
          lateReturns: 10,
          cancelledRentals: 10,
          countryIsSaudi: false,
          accountAgeDays: 5,
          completedRentals: 0,
          requestedAssetValueHalalas: 15_000_000,
        })
      );
      expect(d.finalScore).toBe(0);
    });

    it("clamps score to maximum 100", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 500,
          completedRentals: 20,
          requestedAssetValueHalalas: 100_000,
        })
      );
      expect(d.finalScore).toBeLessThanOrEqual(100);
    });
  });

  describe("risk categories", () => {
    it("assigns low risk for scores >= 80", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 500,
          completedRentals: 15,
          requestedAssetValueHalalas: 100_000,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("assigns medium risk for scores 60-79", () => {
      const d = computeRiskDecision(baseFeatures());
      expect(d.finalScore).toBeGreaterThanOrEqual(60);
      expect(d.finalScore).toBeLessThan(80);
      expect(d.riskCategory).toBe("medium");
    });
  });

  describe("legal commitment", () => {
    it("assigns 100% for trusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 120,
          completedRentals: 5,
          disputedRentals: 0,
          requestedAssetValueHalalas: 500_000,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(70);
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.legalCommitmentHalalas).toBe(500_000);
    });

    it("assigns 150% for new/untrusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 20,
          completedRentals: 0,
          requestedAssetValueHalalas: 500_000,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.legalCommitmentHalalas).toBe(750_000);
    });

    it("assigns 150% when user has disputes even with good history", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 120,
          completedRentals: 5,
          disputedRentals: 1,
          requestedAssetValueHalalas: 500_000,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
    });

    it("returns null commitment for rejected users", () => {
      const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
      expect(d.legalCommitmentPct).toBeNull();
      expect(d.legalCommitmentHalalas).toBe(0);
    });
  });

  describe("auto-reject on low score", () => {
    it("auto-rejects scores below 25", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 3,
          cancelledRentals: 5,
          lateReturns: 2,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 15_000_000,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/score/i);
      expect(d.riskCategory).toBe("ultra_high");
    });
  });

  describe("manual review flag", () => {
    it("flags scores below 40 for manual review", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 1,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 5_000_000,
        })
      );
      if (d.approved && d.finalScore < 40) {
        expect(d.requiresReview).toBe(true);
      }
    });

    it("does not flag high scores for review", () => {
      const d = computeRiskDecision(baseFeatures());
      expect(d.requiresReview).toBe(false);
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
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
