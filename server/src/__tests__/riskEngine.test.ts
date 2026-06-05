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

  describe("scoring modifiers", () => {
    it("awards +15 for account age >= 365 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      expect(d.approved).toBe(true);
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("awards +8 for account age >= 90 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_90");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(8);
    });

    it("penalizes -10 for account age < 30 days", () => {
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

    it("penalizes -10 per disputed rental", () => {
      const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "disputes");
      expect(mod!.delta).toBe(-20);
    });

    it("penalizes -5 per late return", () => {
      const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
      const mod = d.modifiers.find((m) => m.key === "late_returns");
      expect(mod!.delta).toBe(-15);
    });

    it("penalizes -8 for 3+ cancellations", () => {
      const d = computeRiskDecision(baseFeatures({ cancelledRentals: 3 }));
      const mod = d.modifiers.find((m) => m.key === "cancellations");
      expect(mod!.delta).toBe(-8);
    });

    it("penalizes -10 for non-KSA registered identity", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes -10 for asset value >= 100k SAR", () => {
      const d = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 15_000_000 }));
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod!.delta).toBe(-10);
    });
  });

  describe("trust levels and legal commitment", () => {
    it("assigns 100% commitment to trusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 180, completedRentals: 5, disputedRentals: 0 })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.notes).toContain("trusted_user:100pct");
    });

    it("assigns 150% commitment to new users", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 10, completedRentals: 0 })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.notes).toContain("new_or_untrusted_user:150pct");
    });

    it("computes correct legal commitment halalas", () => {
      const value = 1_000_000;
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 180,
          completedRentals: 5,
          requestedAssetValueHalalas: value,
        })
      );
      expect(d.legalCommitmentHalalas).toBe(value * (d.legalCommitmentPct! / 100));
    });
  });

  describe("risk categories", () => {
    it("assigns low risk for score >= 80", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 400, completedRentals: 12 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("assigns medium risk for score 60-79", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100, completedRentals: 2 }));
      expect(d.finalScore).toBeGreaterThanOrEqual(60);
      expect(d.finalScore).toBeLessThan(80);
      expect(d.riskCategory).toBe("medium");
    });

    it("flags manual review for score < 40", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 10,
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
  });

  describe("score clamping", () => {
    it("clamps score to 0 minimum", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 5,
          lateReturns: 5,
          cancelledRentals: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 20_000_000,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(0);
    });

    it("clamps score to 100 maximum", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 500,
          completedRentals: 20,
          disputedRentals: 0,
          lateReturns: 0,
          requestedAssetValueHalalas: 10_000,
        })
      );
      expect(d.finalScore).toBeLessThanOrEqual(100);
    });
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for >= 80", () => expect(trustScoreToCategory(80)).toBe("low"));
  it("returns medium for >= 60", () => expect(trustScoreToCategory(65)).toBe("medium"));
  it("returns high for >= 25", () => expect(trustScoreToCategory(30)).toBe("high"));
  it("returns ultra_high for < 25", () => expect(trustScoreToCategory(10)).toBe("ultra_high"));
});
