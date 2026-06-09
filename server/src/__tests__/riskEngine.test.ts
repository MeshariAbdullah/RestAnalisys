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
      expect(d.rejectionReason).toMatch(/blocked/i);
      expect(d.riskCategory).toBe("ultra_high");
    });

    it("rejects users without Nafath verification", () => {
      const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/nafath/i);
    });

    it("rejects users without KYC verification", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toMatch(/kyc/i);
    });
  });

  describe("approval and commitment levels", () => {
    it("approves trusted users with 100% commitment", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 180,
          completedRentals: 5,
          disputedRentals: 0,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.legalCommitmentHalalas).toBe(500_000);
    });

    it("assigns 150% commitment to new users", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 10,
          completedRentals: 0,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.legalCommitmentHalalas).toBe(750_000);
    });

    it("assigns 150% commitment when user has disputes", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 180,
          completedRentals: 5,
          disputedRentals: 1,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(150);
    });
  });

  describe("score modifiers", () => {
    it("adds +15 for account older than 1 year", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_365");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(15);
    });

    it("adds +8 for account older than 90 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
      const ageMod = d.modifiers.find((m) => m.key === "age_90");
      expect(ageMod).toBeDefined();
      expect(ageMod!.delta).toBe(8);
    });

    it("subtracts -10 for accounts younger than 30 days", () => {
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

    it("subtracts -5 for first-time renter", () => {
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

    it("adds +2 for phone and email verification", () => {
      const d = computeRiskDecision(baseFeatures());
      const phoneMod = d.modifiers.find((m) => m.key === "phone_ok");
      const emailMod = d.modifiers.find((m) => m.key === "email_ok");
      expect(phoneMod?.delta).toBe(2);
      expect(emailMod?.delta).toBe(2);
    });

    it("penalizes non-Saudi users by -10", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      const mod = d.modifiers.find((m) => m.key === "non_ksa");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes ultra-high-value assets (>=100k SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_ultra");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-10);
    });

    it("penalizes high-value assets (>=30k SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 5_000_000 })
      );
      const mod = d.modifiers.find((m) => m.key === "value_high");
      expect(mod).toBeDefined();
      expect(mod!.delta).toBe(-5);
    });
  });

  describe("score clamping and categories", () => {
    it("clamps score to 0 minimum", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 5,
          lateReturns: 5,
          cancelledRentals: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 15_000_000,
          phoneVerified: false,
          emailVerified: false,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(0);
    });

    it("categorizes score >= 80 as low risk", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 400,
          completedRentals: 12,
          requestedAssetValueHalalas: 100_000,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("auto-rejects scores below 25", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 3,
          cancelledRentals: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 15_000_000,
          phoneVerified: false,
          emailVerified: false,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.riskCategory).toBe("ultra_high");
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
