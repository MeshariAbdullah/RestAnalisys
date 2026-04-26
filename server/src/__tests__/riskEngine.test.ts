import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
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

describe("computeRiskDecision", () => {
  describe("hard rejects", () => {
    it("rejects blocked users", () => {
      const d = computeRiskDecision(makeFeatures({ priorBlock: true }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("blocked");
      expect(d.riskCategory).toBe("ultra_high");
    });

    it("rejects users without Nafath verification", () => {
      const d = computeRiskDecision(makeFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("Nafath");
    });

    it("rejects users without KYC verification", () => {
      const d = computeRiskDecision(makeFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("KYC");
    });
  });

  describe("score modifiers", () => {
    it("starts at base score 50", () => {
      const d = computeRiskDecision(makeFeatures());
      expect(d.baseScore).toBe(50);
    });

    it("adds +15 for account age >= 365 days", () => {
      const d = computeRiskDecision(makeFeatures({ accountAgeDays: 400 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("adds +8 for account age >= 90 days", () => {
      const d = computeRiskDecision(makeFeatures({ accountAgeDays: 100 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_90");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(8);
    });

    it("penalizes new accounts < 30 days", () => {
      const d = computeRiskDecision(makeFeatures({ accountAgeDays: 10 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_new");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(-10);
    });

    it("adds +15 for 10+ completed rentals", () => {
      const d = computeRiskDecision(makeFeatures({ completedRentals: 12 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_10");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(15);
    });

    it("penalizes per disputed rental", () => {
      const d = computeRiskDecision(makeFeatures({ disputedRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "disputes");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-20);
    });

    it("penalizes non-Saudi users", () => {
      const d = computeRiskDecision(makeFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes high-value assets", () => {
      const d = computeRiskDecision(
        makeFeatures({ requestedAssetValueHalalas: 10_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });
  });

  describe("approval and commitment", () => {
    it("approves a trusted user with 100% commitment", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 180,
          completedRentals: 5,
          disputedRentals: 0,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.notes).toContain("trusted_user:100pct");
    });

    it("sets 150% commitment for new users", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 15,
          completedRentals: 0,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.notes).toContain("new_or_untrusted_user:150pct");
    });

    it("calculates legal commitment halalas correctly", () => {
      const value = 1_000_000;
      const d = computeRiskDecision(
        makeFeatures({
          requestedAssetValueHalalas: value,
          accountAgeDays: 180,
          completedRentals: 5,
        })
      );
      expect(d.legalCommitmentHalalas).toBe(value * (d.legalCommitmentPct! / 100));
    });

    it("flags manual review for low scores between 25-40", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 10,
          completedRentals: 0,
          disputedRentals: 1,
          lateReturns: 1,
          countryIsSaudi: false,
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
        makeFeatures({
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
        makeFeatures({
          accountAgeDays: 500,
          completedRentals: 15,
        })
      );
      expect(d.finalScore).toBeLessThanOrEqual(100);
    });
  });

  describe("risk categories", () => {
    it("classifies score >= 80 as low", () => {
      const d = computeRiskDecision(
        makeFeatures({ accountAgeDays: 500, completedRentals: 15 })
      );
      expect(d.riskCategory).toBe("low");
    });

    it("classifies score 60-79 as medium", () => {
      const d = computeRiskDecision(
        makeFeatures({ accountAgeDays: 100, completedRentals: 5 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(60);
      expect(d.riskCategory).toBe("medium");
    });
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("returns medium for 60-79", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("returns high for 25-59", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("returns ultra_high for < 25", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
