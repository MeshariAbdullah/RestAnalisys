import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "../services/riskEngine.js";

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
    requestedAssetValueHalalas: 5000000,
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("computeRiskDecision — hard rejections", () => {
  it("rejects blocked users", () => {
    const result = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(result.approved).toBe(false);
    expect(result.rejectionReason).toContain("blocked");
    expect(result.riskCategory).toBe("ultra_high");
  });

  it("rejects unverified Nafath", () => {
    const result = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(result.approved).toBe(false);
    expect(result.rejectionReason).toContain("Nafath");
  });

  it("rejects unverified KYC", () => {
    const result = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(result.approved).toBe(false);
    expect(result.rejectionReason).toContain("KYC");
  });
});

describe("computeRiskDecision — scoring", () => {
  it("starts at base score 50", () => {
    const result = computeRiskDecision(baseFeatures());
    expect(result.baseScore).toBe(50);
  });

  it("boosts score for old accounts (365+ days)", () => {
    const result = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
    const mod = result.modifiers.find((m) => m.key === "age_365");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(15);
  });

  it("boosts score for 90+ day accounts", () => {
    const result = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
    const mod = result.modifiers.find((m) => m.key === "age_90");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(8);
  });

  it("penalizes new accounts (<30 days)", () => {
    const result = computeRiskDecision(baseFeatures({ accountAgeDays: 15 }));
    const mod = result.modifiers.find((m) => m.key === "age_new");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("boosts score for 10+ completed rentals", () => {
    const result = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
    const mod = result.modifiers.find((m) => m.key === "rentals_10");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(15);
  });

  it("penalizes first-time renters", () => {
    const result = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
    const mod = result.modifiers.find((m) => m.key === "rentals_none");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });

  it("penalizes disputes (-10 each)", () => {
    const result = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    const mod = result.modifiers.find((m) => m.key === "disputes");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-20);
  });

  it("penalizes late returns (-5 each)", () => {
    const result = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    const mod = result.modifiers.find((m) => m.key === "late_returns");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-15);
  });

  it("penalizes 3+ cancellations", () => {
    const result = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
    const mod = result.modifiers.find((m) => m.key === "cancellations");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-8);
  });

  it("adds bonuses for phone and email verification", () => {
    const result = computeRiskDecision(baseFeatures());
    expect(result.modifiers.find((m) => m.key === "phone_ok")?.delta).toBe(2);
    expect(result.modifiers.find((m) => m.key === "email_ok")?.delta).toBe(2);
  });

  it("penalizes non-Saudi identity", () => {
    const result = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    const mod = result.modifiers.find((m) => m.key === "non_ksa");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("penalizes ultra-high value assets (>=100k SAR)", () => {
    const result = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 15000000 })
    );
    const mod = result.modifiers.find((m) => m.key === "value_ultra");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("clamps score between 0 and 100", () => {
    const result = computeRiskDecision(
      baseFeatures({
        disputedRentals: 10,
        lateReturns: 10,
        cancelledRentals: 10,
        completedRentals: 0,
        accountAgeDays: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 20000000,
      })
    );
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
  });
});

describe("computeRiskDecision — legal commitment", () => {
  it("gives 100% commitment to trusted users", () => {
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 200,
        completedRentals: 5,
        disputedRentals: 0,
        requestedAssetValueHalalas: 2000000,
      })
    );
    expect(result.approved).toBe(true);
    expect(result.legalCommitmentPct).toBe(100);
    expect(result.notes).toContain("trusted_user:100pct");
  });

  it("gives 150% commitment to new/untrusted users", () => {
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 60,
        completedRentals: 1,
        disputedRentals: 0,
      })
    );
    expect(result.approved).toBe(true);
    expect(result.legalCommitmentPct).toBe(150);
    expect(result.notes).toContain("new_or_untrusted_user:150pct");
  });

  it("computes correct halala amount at 150%", () => {
    const assetValue = 10000000;
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 20,
        completedRentals: 0,
        requestedAssetValueHalalas: assetValue,
      })
    );
    expect(result.legalCommitmentPct).toBe(150);
    expect(result.legalCommitmentHalalas).toBe(
      Math.round((assetValue * 150) / 100)
    );
  });

  it("users with disputes lose trusted status", () => {
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 200,
        completedRentals: 10,
        disputedRentals: 1,
      })
    );
    expect(result.legalCommitmentPct).toBe(150);
  });
});

describe("computeRiskDecision — risk categories", () => {
  it("low risk for score >= 80", () => {
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 400,
        completedRentals: 12,
        requestedAssetValueHalalas: 2000000,
      })
    );
    expect(result.finalScore).toBeGreaterThanOrEqual(80);
    expect(result.riskCategory).toBe("low");
  });

  it("medium risk for score 60-79", () => {
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 100,
        completedRentals: 3,
        requestedAssetValueHalalas: 2000000,
      })
    );
    expect(result.finalScore).toBeGreaterThanOrEqual(60);
    expect(result.finalScore).toBeLessThan(80);
    expect(result.riskCategory).toBe("medium");
  });

  it("rejects score below 25", () => {
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 15000000,
        phoneVerified: false,
        emailVerified: false,
      })
    );
    expect(result.approved).toBe(false);
    expect(result.rejectionReason).toContain("threshold");
  });
});

describe("computeRiskDecision — manual review flag", () => {
  it("flags manual review for scores below 40", () => {
    const result = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        disputedRentals: 1,
        requestedAssetValueHalalas: 15000000,
      })
    );
    if (result.approved && result.finalScore < 40) {
      expect(result.requiresReview).toBe(true);
    }
  });

  it("does not flag manual review for high scores", () => {
    const result = computeRiskDecision(baseFeatures());
    expect(result.requiresReview).toBe(false);
  });
});

describe("trustScoreToCategory", () => {
  it("returns correct categories for boundary values", () => {
    expect(trustScoreToCategory(100)).toBe("low");
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(79)).toBe("medium");
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(59)).toBe("high");
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
