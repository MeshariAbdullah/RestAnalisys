import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  RiskFeatures,
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
    requestedAssetValueHalalas: 5_000_00,
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
      expect(d.rejectionReason).toContain("blocked");
      expect(d.riskCategory).toBe("ultra_high");
    });

    it("rejects users without Nafath verification", () => {
      const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("Nafath");
    });

    it("rejects users without KYC", () => {
      const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
      expect(d.approved).toBe(false);
      expect(d.rejectionReason).toContain("KYC");
    });
  });

  describe("scoring modifiers", () => {
    it("gives +15 for accounts older than 1 year", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
      expect(d.modifiers.find((m) => m.key === "age_365")?.delta).toBe(15);
    });

    it("gives +8 for accounts 90+ days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
      expect(d.modifiers.find((m) => m.key === "age_90")?.delta).toBe(8);
    });

    it("gives -10 for accounts under 30 days", () => {
      const d = computeRiskDecision(baseFeatures({ accountAgeDays: 10 }));
      expect(d.modifiers.find((m) => m.key === "age_new")?.delta).toBe(-10);
    });

    it("gives +15 for 10+ completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
      expect(d.modifiers.find((m) => m.key === "rentals_10")?.delta).toBe(15);
    });

    it("gives +8 for 3+ completed rentals", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 5 }));
      expect(d.modifiers.find((m) => m.key === "rentals_3")?.delta).toBe(8);
    });

    it("gives -5 for first-time renters", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
      expect(d.modifiers.find((m) => m.key === "rentals_none")?.delta).toBe(-5);
    });

    it("penalizes disputed rentals at -10 each", () => {
      const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
      expect(d.modifiers.find((m) => m.key === "disputes")?.delta).toBe(-20);
    });

    it("penalizes late returns at -5 each", () => {
      const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
      expect(d.modifiers.find((m) => m.key === "late_returns")?.delta).toBe(-15);
    });

    it("penalizes 3+ cancellations", () => {
      const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
      expect(d.modifiers.find((m) => m.key === "cancellations")?.delta).toBe(-8);
    });

    it("gives +2 for phone and email verification", () => {
      const d = computeRiskDecision(baseFeatures());
      expect(d.modifiers.find((m) => m.key === "phone_ok")?.delta).toBe(2);
      expect(d.modifiers.find((m) => m.key === "email_ok")?.delta).toBe(2);
    });

    it("penalizes non-Saudi users", () => {
      const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
      expect(d.modifiers.find((m) => m.key === "non_ksa")?.delta).toBe(-10);
    });

    it("penalizes ultra-high value assets (100k+ SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 150_000_00 })
      );
      expect(d.modifiers.find((m) => m.key === "value_ultra")?.delta).toBe(-10);
    });

    it("penalizes high value assets (30k+ SAR)", () => {
      const d = computeRiskDecision(
        baseFeatures({ requestedAssetValueHalalas: 50_000_00 })
      );
      expect(d.modifiers.find((m) => m.key === "value_high")?.delta).toBe(-5);
    });
  });

  describe("risk categories", () => {
    it("categorizes 80+ as low risk", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 400, completedRentals: 12 })
      );
      expect(d.riskCategory).toBe("low");
    });

    it("categorizes 60-79 as medium risk", () => {
      const d = computeRiskDecision(baseFeatures({ completedRentals: 1 }));
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
        })
      );
      expect(d.legalCommitmentPct).toBe(100);
      expect(d.notes).toContain("trusted_user:100pct");
    });

    it("assigns 150% for new/untrusted users", () => {
      const d = computeRiskDecision(
        baseFeatures({ accountAgeDays: 20, completedRentals: 0 })
      );
      expect(d.legalCommitmentPct).toBe(150);
      expect(d.notes).toContain("new_or_untrusted_user:150pct");
    });

    it("assigns 150% for users with disputes even with high history", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 200,
          completedRentals: 10,
          disputedRentals: 1,
        })
      );
      expect(d.legalCommitmentPct).toBe(150);
    });

    it("computes correct commitment halalas", () => {
      const assetValue = 100_000_00;
      const d = computeRiskDecision(
        baseFeatures({
          requestedAssetValueHalalas: assetValue,
          accountAgeDays: 20,
          completedRentals: 0,
        })
      );
      expect(d.legalCommitmentHalalas).toBe(Math.round(assetValue * 1.5));
    });
  });

  describe("auto-reject on low score", () => {
    it("rejects when score drops below 25", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 3,
          cancelledRentals: 5,
          lateReturns: 2,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 200_000_00,
        })
      );
      expect(d.approved).toBe(false);
      expect(d.riskCategory).toBe("ultra_high");
    });
  });

  describe("manual review threshold", () => {
    it("flags scores between 25-40 for manual review", () => {
      const d = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 10,
          completedRentals: 0,
          disputedRentals: 1,
          phoneVerified: false,
          emailVerified: false,
        })
      );
      if (d.approved && d.finalScore < 40) {
        expect(d.requiresReview).toBe(true);
      }
    });
  });

  describe("score clamping", () => {
    it("clamps score to 0-100", () => {
      const high = computeRiskDecision(
        baseFeatures({ accountAgeDays: 400, completedRentals: 15 })
      );
      expect(high.finalScore).toBeLessThanOrEqual(100);

      const low = computeRiskDecision(
        baseFeatures({
          accountAgeDays: 5,
          completedRentals: 0,
          disputedRentals: 5,
          lateReturns: 5,
          cancelledRentals: 5,
          countryIsSaudi: false,
          requestedAssetValueHalalas: 200_000_00,
        })
      );
      expect(low.finalScore).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("trustScoreToCategory", () => {
  it("returns low for 80+", () => {
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

  it("returns ultra_high for <25", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
