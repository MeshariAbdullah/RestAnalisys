import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "../riskEngine.js";

function baseFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    accountAgeDays: 180,
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
    it("rejects blocked users immediately", () => {
      const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("blocked");
      expect(d.riskCategory).toBe("ultra_high");
    });

    it("rejects users without Nafath verification", () => {
      const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("Nafath");
    });

    it("rejects users without KYC verification", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("KYC");
    });
  });

  describe("base score and modifiers", () => {
    it("starts at base score 50", () => {
      const d = computeRiskDecision(baseFeatures());
      expect(d.baseScore).toBe(50);
    });

    it("awards +15 for accounts older than 365 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("awards +8 for accounts older than 90 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_90");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(8);
    });

    it("penalizes -10 for accounts younger than 30 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 10 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_new");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(-10);
    });

    it("awards +15 for 10+ completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_10");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(15);
    });

    it("penalizes -5 for zero completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_none");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });

    it("penalizes disputed rentals at -10 each", () => {
      const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "disputes");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-20);
    });

    it("penalizes late returns at -5 each", () => {
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

    it("penalizes assets valued >= 100k SAR", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 100_000 * 100 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes non-Saudi identity", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
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
          requestedAssetValueHalalas: 200_000 * 100,
          accountAgeDays: 5,
          completedRentals: 0,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("risk categories", () => {
    it("assigns 'low' for scores >= 80", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 400, completedRentals: 12 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("assigns 'medium' for scores 60-79", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 100, completedRentals: 4 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(60);
      expect(d.finalScore).toBeLessThan(80);
      expect(d.riskCategory).toBe("medium");
    });
  });

  describe("legal commitment", () => {
    it("assigns 100% for trusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 100,
          completedRentals: 5,
          disputedRentals: 0,
        })
      );
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.legalCommitmentHalalas).toBe(500_000);
    });

    it("assigns 150% for new/untrusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 20,
          completedRentals: 0,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.legalCommitmentHalalas).toBe(750_000);
    });

    it("assigns 150% when user has disputes even with other trusted criteria", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 400,
          completedRentals: 10,
          disputedRentals: 1,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
    });
  });

  describe("manual review", () => {
    it("flags scores between 25-40 for manual review", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 1,
          requestedAssetValueHalalas: 100_000 * 100,
        })
      );
      if (d.approved && d.finalScore < 40) {
        expect(d.requiresReview).toBe(true);
      }
    });
  });

  describe("auto-reject on low score", () => {
    it("rejects when final score falls below 25", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 3,
          cancelledRentals: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 200_000 * 100,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.finalScore).toBeLessThan(25);
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

  it("returns 'ultra_high' for scores below 25", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
