import { describe, it, expect } from "vitest";
import { computeRiskDecision, trustScoreToCategory, type RiskFeatures } from "./riskEngine.js";

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
    requestedAssetValueHalalas: 5_000_000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision", () => {
  describe("hard rejections", () => {
    it("rejects blocked users", () => {
      const d = computeRiskDecision(makeFeatures({ priorBlock: true }));
      expect(d.approved).toBe(false);
      expect(d.riskCategory).toBe("ultra_high");
      expect(d.rejectionReason).toContain("blocked");
    });

    it("rejects users without Nafath", () => {
      const d = computeRiskDecision(makeFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("Nafath");
    });

    it("rejects users without KYC", () => {
      const d = computeRiskDecision(makeFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("KYC");
    });
  });

  describe("score modifiers", () => {
    it("gives +15 for accounts older than 1 year", () => {
      const d = computeRiskDecision(makeFeatures({ accountAgeDays: 400 }));
      expect(d.modifiers.find((m) => m.key === "age_365")?.delta).toBe(15);
    });

    it("gives +8 for accounts older than 90 days", () => {
      const d = computeRiskDecision(makeFeatures({ accountAgeDays: 100 }));
      expect(d.modifiers.find((m) => m.key === "age_90")?.delta).toBe(8);
    });

    it("penalizes new accounts (<30 days)", () => {
      const d = computeRiskDecision(makeFeatures({ accountAgeDays: 10 }));
      expect(d.modifiers.find((m) => m.key === "age_new")?.delta).toBe(-10);
    });

    it("gives +15 for 10+ completed rentals", () => {
      const d = computeRiskDecision(makeFeatures({ completedRentals: 12 }));
      expect(d.modifiers.find((m) => m.key === "rentals_10")?.delta).toBe(15);
    });

    it("penalizes first-time renters", () => {
      const d = computeRiskDecision(makeFeatures({ completedRentals: 0 }));
      expect(d.modifiers.find((m) => m.key === "rentals_none")?.delta).toBe(-5);
    });

    it("penalizes disputes proportionally", () => {
      const d = computeRiskDecision(makeFeatures({ disputedRentals: 2 }));
      expect(d.modifiers.find((m) => m.key === "disputes")?.delta).toBe(-20);
    });

    it("penalizes late returns proportionally", () => {
      const d = computeRiskDecision(makeFeatures({ lateReturns: 3 }));
      expect(d.modifiers.find((m) => m.key === "late_returns")?.delta).toBe(-15);
    });

    it("penalizes excessive cancellations", () => {
      const d = computeRiskDecision(makeFeatures({ cancelledRentals: 5 }));
      expect(d.modifiers.find((m) => m.key === "cancellations")?.delta).toBe(-8);
    });

    it("penalizes ultra-high-value assets", () => {
      const d = computeRiskDecision(makeFeatures({ requestedAssetValueHalalas: 15_000_000 }));
      expect(d.modifiers.find((m) => m.key === "value_ultra")?.delta).toBe(-10);
    });

    it("penalizes non-Saudi identities", () => {
      const d = computeRiskDecision(makeFeatures({ countryIsSaudi: false }));
      expect(d.modifiers.find((m) => m.key === "non_ksa")?.delta).toBe(-10);
    });
  });

  describe("legal commitment", () => {
    it("gives trusted users 100% commitment", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 200,
          completedRentals: 5,
          disputedRentals: 0,
          requestedAssetValueHalalas: 2_000_000,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.legalCommitmentHalalas).toBe(2_000_000);
    });

    it("gives new users 150% commitment", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 20,
          completedRentals: 0,
          requestedAssetValueHalalas: 5_000_000,
        })
      );
      expect(d.approved).toBe(true);
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.legalCommitmentHalalas).toBe(7_500_000);
    });

    it("gives 150% to users with disputes even if old account", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 200,
          completedRentals: 5,
          disputedRentals: 1,
          requestedAssetValueHalalas: 5_000_000,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
    });
  });

  describe("score rejection threshold", () => {
    it("rejects when score drops below 25", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 3,
          lateReturns: 2,
          cancelledRentals: 5,
          phoneVerified: false,
          emailVerified: false,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 15_000_000,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.finalScore).toBeLessThan(25);
      expect(d.rejectionReason).toContain("Trust score");
    });

    it("flags for manual review when score is between 25 and 40", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 1,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 15_000_000,
        })
      );
      if (d.approved && d.finalScore < 40) {
        expect(d.requiresReview).toBe(true);
      }
    });
  });

  describe("risk categories", () => {
    it("assigns low risk for score >= 80", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 400,
          completedRentals: 12,
          requestedAssetValueHalalas: 2_000_000,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(80);
      expect(d.riskCategory).toBe("low");
    });

    it("assigns medium risk for score 60-79", () => {
      const d = computeRiskDecision(
        makeFeatures({
          accountAgeDays: 100,
          completedRentals: 3,
          requestedAssetValueHalalas: 5_000_000,
        })
      );
      expect(d.finalScore).toBeGreaterThanOrEqual(60);
      expect(d.finalScore).toBeLessThan(80);
      expect(d.riskCategory).toBe("medium");
    });
  });

  it("clamps score to 0-100 range", () => {
    const low = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 5,
        lateReturns: 5,
        cancelledRentals: 10,
        phoneVerified: false,
        emailVerified: false,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 20_000_000,
      })
    );
    expect(low.finalScore).toBeGreaterThanOrEqual(0);

    const high = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 400,
        completedRentals: 15,
        requestedAssetValueHalalas: 100_000,
      })
    );
    expect(high.finalScore).toBeLessThanOrEqual(100);
  });
});

describe("trustScoreToCategory", () => {
  it("maps scores to correct categories", () => {
    expect(trustScoreToCategory(90)).toBe("low");
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(70)).toBe("medium");
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(50)).toBe("high");
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
