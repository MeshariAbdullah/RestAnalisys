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
    requestedAssetValueHalalas: 1_000_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  describe("hard reject rules", () => {
    it("rejects blocked users", () => {
      const d = computeRiskDecision(makeFeatures({ priorBlock: true }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("blocked");
      expect(d.riskCategory).toBe("ultra_high");
    });

    it("rejects unverified Nafath", () => {
      const d = computeRiskDecision(makeFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("Nafath");
    });

    it("rejects unverified KYC", () => {
      const d = computeRiskDecision(makeFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("KYC");
    });
  });

  describe("scoring modifiers", () => {
    it("gives +15 for account older than 1 year", () => {
      const d = computeRiskDecision(makeFeatures({ accountAgeDays: 400 }));
      const mod = d.modifiers.find((m) => m.key === "age_365");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(15);
    });

    it("gives +8 for account older than 90 days", () => {
      const d = computeRiskDecision(makeFeatures({ accountAgeDays: 100 }));
      const mod = d.modifiers.find((m) => m.key === "age_90");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(8);
    });

    it("penalizes new accounts (<30 days)", () => {
      const d = computeRiskDecision(makeFeatures({ accountAgeDays: 10 }));
      const mod = d.modifiers.find((m) => m.key === "age_new");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("rewards 10+ completed rentals", () => {
      const d = computeRiskDecision(makeFeatures({ completedRentals: 12 }));
      const mod = d.modifiers.find((m) => m.key === "rentals_10");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(15);
    });

    it("penalizes disputed rentals", () => {
      const d = computeRiskDecision(makeFeatures({ disputedRentals: 2 }));
      const mod = d.modifiers.find((m) => m.key === "disputes");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-20);
    });

    it("penalizes late returns", () => {
      const d = computeRiskDecision(makeFeatures({ lateReturns: 3 }));
      const mod = d.modifiers.find((m) => m.key === "late_returns");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-15);
    });

    it("penalizes excessive cancellations", () => {
      const d = computeRiskDecision(makeFeatures({ cancelledRentals: 5 }));
      const mod = d.modifiers.find((m) => m.key === "cancellations");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-8);
    });

    it("penalizes non-Saudi geography", () => {
      const d = computeRiskDecision(makeFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes ultra-high value assets (>=100k SAR)", () => {
      const d = computeRiskDecision(
        makeFeatures({ requestedAssetValueHalalas: 15_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });
  });

  describe("commitment rules", () => {
    it("assigns 100% commitment to trusted users", () => {
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

    it("assigns 150% commitment to new users", () => {
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

    it("calculates correct commitment amount", () => {
      const assetValue = 1_000_000; // 10,000 SAR (no value penalty)
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 400,
          completedRentals: 5,
          requestedAssetValueHalalas: assetValue,
        })
      );
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.legalCommitmentHalalas).toBe(assetValue);
    });
  });

  describe("score boundaries", () => {
    it("clamps score to [0, 100]", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 500,
          completedRentals: 15,
          phoneVerified: true,
          emailVerified: true,
        })
      );
      expect(d.finalScore).toBeLessThanOrEqual(100);
      expect(d.finalScore).toBeGreaterThanOrEqual(0);
    });

    it("auto-rejects below threshold score", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 3,
          lateReturns: 2,
          cancelledRentals: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 20_000_000,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.riskCategory).toBe("ultra_high");
    });
  });

  describe("risk categories", () => {
    it("categorizes score >= 80 as low", () => {
      const d = computeRiskDecision(
        makeFeatures({ accountAgeDays: 400, completedRentals: 12 })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("categorizes score 60-79 as medium", () => {
      const d = computeRiskDecision(
        makeFeatures({ accountAgeDays: 100, completedRentals: 3 })
      );
      expect(d.riskCategory).toBe("medium");
    });
  });
});

describe("trustScoreToCategory", () => {
  it("maps 80+ to low", () => expect(trustScoreToCategory(85)).toBe("low"));
  it("maps 60-79 to medium", () => expect(trustScoreToCategory(65)).toBe("medium"));
  it("maps 25-59 to high", () => expect(trustScoreToCategory(40)).toBe("high"));
  it("maps <25 to ultra_high", () => expect(trustScoreToCategory(10)).toBe("ultra_high"));
});
