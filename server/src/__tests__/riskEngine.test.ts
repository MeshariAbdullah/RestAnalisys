import { describe, it, expect } from "vitest";
import { computeRiskDecision, trustScoreToCategory, type RiskFeatures } from "../services/riskEngine.js";

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
    });

    it("rejects users without KYC verification", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("KYC");
    });
  });

  describe("score modifiers", () => {
    it("rewards account age >= 365 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      expect(d.approved).toBe(true);
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("rewards 90+ day accounts", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_90");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(8);
    });

    it("penalizes new accounts < 30 days", () => {
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

    it("penalizes high-value assets >= 100k SAR", () => {
      const d = computeRiskDecision(baseFeatures({ requestedAssetValueHalalas: 15_000_000 }));
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes non-Saudi identities", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });
  });

  describe("commitment percentages", () => {
    it("gives 100% to trusted users", () => {
      const d = computeRiskDecision(baseFeatures({
        accountAgeDays: 120,
        completedRentals: 5,
        disputedRentals: 0,
      }));
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(100);
    });

    it("gives 150% to new/untrusted users", () => {
      const d = computeRiskDecision(baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
      }));
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(150);
    });

    it("computes commitment halalas correctly", () => {
      const assetValue = 1_000_000;
      const d = computeRiskDecision(baseFeatures({
        requestedAssetValueHalalas: assetValue,
        accountAgeDays: 10,
        completedRentals: 0,
      }));
      expect(d.legalCommitmentHalalas).toBe(1_500_000);
    });
  });

  describe("risk categories", () => {
    it("classifies high scores as low risk", () => {
      const d = computeRiskDecision(baseFeatures({
        accountAgeDays: 400,
        completedRentals: 15,
      }));
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("auto-rejects scores below 25", () => {
      const d = computeRiskDecision(baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        cancelledRentals: 5,
        lateReturns: 3,
        countryIsSaudi: false,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 20_000_000,
      }));
      expect(d.approved).toBe(false);
      expect(d.riskCategory).toBe("ultra_high");
    });
  });

  describe("score clamping", () => {
    it("clamps score between 0 and 100", () => {
      const high = computeRiskDecision(baseFeatures({
        accountAgeDays: 500,
        completedRentals: 20,
      }));
      expect(high.finalScore).toBeLessThanOrEqual(100);
      expect(high.finalScore).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("trustScoreToCategory", () => {
  it("maps 80+ to low", () => expect(trustScoreToCategory(85)).toBe("low"));
  it("maps 60-79 to medium", () => expect(trustScoreToCategory(65)).toBe("medium"));
  it("maps 25-59 to high", () => expect(trustScoreToCategory(40)).toBe("high"));
  it("maps <25 to ultra_high", () => expect(trustScoreToCategory(10)).toBe("ultra_high"));
});
