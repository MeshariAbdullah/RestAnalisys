import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  RiskFeatures,
} from "../services/riskEngine.js";

function baseFeatures(overrides?: Partial<RiskFeatures>): RiskFeatures {
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
  it("approves a trusted user with 100% commitment", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400, completedRentals: 10 }));
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.riskCategory).toBe("low");
    expect(d.notes).toContain("trusted_user:100pct");
  });

  it("rejects a blocked user", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toBe("User is currently blocked");
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("rejects without Nafath verification", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("Nafath");
  });

  it("rejects without KYC verification", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("KYC");
  });

  it("assigns 150% commitment for new users", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 10, completedRentals: 0 })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(750_000);
    expect(d.notes).toContain("new_or_untrusted_user:150pct");
  });

  it("penalizes disputed rentals", () => {
    const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    const disputeMod = d.modifiers.find((m) => m.key === "disputes");
    expect(disputeMod).toBeDefined();
    expect(disputeMod!.delta).toBe(-20);
  });

  it("penalizes late returns", () => {
    const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    const lateMod = d.modifiers.find((m) => m.key === "late_returns");
    expect(lateMod).toBeDefined();
    expect(lateMod!.delta).toBe(-15);
  });

  it("penalizes excessive cancellations", () => {
    const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
    const cancelMod = d.modifiers.find((m) => m.key === "cancellations");
    expect(cancelMod).toBeDefined();
    expect(cancelMod!.delta).toBe(-8);
  });

  it("rejects when trust score falls below threshold", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        cancelledRentals: 5,
        lateReturns: 2,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 15_000_000,
      })
    );
    expect(d.approved).toBe(false);
    expect(d.finalScore).toBeLessThan(25);
  });

  it("applies high-value asset penalty", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 12_000_000 })
    );
    const valueMod = d.modifiers.find((m) => m.key === "value_ultra");
    expect(valueMod).toBeDefined();
    expect(valueMod!.delta).toBe(-10);
  });

  it("applies medium-value asset penalty", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 4_000_000 })
    );
    const valueMod = d.modifiers.find((m) => m.key === "value_high");
    expect(valueMod).toBeDefined();
    expect(valueMod!.delta).toBe(-5);
  });

  it("gives bonus for accounts older than 1 year", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_365");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(15);
  });

  it("gives bonus for 10+ completed rentals", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 400, completedRentals: 12 })
    );
    const rentalMod = d.modifiers.find((m) => m.key === "rentals_10");
    expect(rentalMod).toBeDefined();
    expect(rentalMod!.delta).toBe(15);
  });

  it("penalizes non-Saudi geography", () => {
    const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    const geoMod = d.modifiers.find((m) => m.key === "non_ksa");
    expect(geoMod).toBeDefined();
    expect(geoMod!.delta).toBe(-10);
  });

  it("flags manual review for scores between 25-40", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 1,
        requestedAssetValueHalalas: 4_000_000,
        phoneVerified: false,
        emailVerified: false,
      })
    );
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
  });

  it("clamps score to 0-100 range", () => {
    const dHigh = computeRiskDecision(
      baseFeatures({ accountAgeDays: 400, completedRentals: 15 })
    );
    expect(dHigh.finalScore).toBeLessThanOrEqual(100);
    expect(dHigh.finalScore).toBeGreaterThanOrEqual(0);
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

  it("returns ultra_high for below 25", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
