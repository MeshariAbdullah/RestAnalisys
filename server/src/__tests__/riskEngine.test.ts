import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  RiskFeatures,
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
  // ── Hard rejects ──────────────────────────────────────────────────────

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

  // ── Scoring modifiers ──────────────────────────────────────────────────

  it("awards +15 for accounts older than 1 year", () => {
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

  it("penalizes new accounts (< 30 days) with -10", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 15 }));
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

  it("penalizes first-time renters with -5", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
    const mod = d.modifiers.find((m) => m.key === "rentals_none");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });

  it("penalizes -10 per disputed rental", () => {
    const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    const mod = d.modifiers.find((m) => m.key === "disputes");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-20);
  });

  it("penalizes -5 per late return", () => {
    const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    const mod = d.modifiers.find((m) => m.key === "late_returns");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-15);
  });

  it("penalizes 3+ cancellations with -8", () => {
    const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
    const mod = d.modifiers.find((m) => m.key === "cancellations");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-8);
  });

  it("penalizes ultra-high asset values (>= 100k SAR)", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 10_000_000 })
    );
    const mod = d.modifiers.find((m) => m.key === "value_ultra");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("penalizes non-Saudi users with -10", () => {
    const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    const mod = d.modifiers.find((m) => m.key === "non_ksa");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  // ── Score clamping ─────────────────────────────────────────────────────

  it("clamps score to 0..100 range", () => {
    const d = computeRiskDecision(
      baseFeatures({
        disputedRentals: 10,
        lateReturns: 10,
        cancelledRentals: 10,
        accountAgeDays: 5,
        completedRentals: 0,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 10_000_000,
      })
    );
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
    expect(d.finalScore).toBeLessThanOrEqual(100);
  });

  // ── Risk categories ────────────────────────────────────────────────────

  it("assigns 'low' risk category for score >= 80", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 400, completedRentals: 12 })
    );
    expect(d.finalScore).toBeGreaterThanOrEqual(80);
    expect(d.riskCategory).toBe("low");
  });

  it("auto-rejects scores below 25", () => {
    const d = computeRiskDecision(
      baseFeatures({
        disputedRentals: 5,
        lateReturns: 5,
        cancelledRentals: 5,
        accountAgeDays: 5,
        completedRentals: 0,
      })
    );
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("threshold");
  });

  // ── Legal commitment ───────────────────────────────────────────────────

  it("applies 100% commitment for trusted users", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 120,
        completedRentals: 5,
        disputedRentals: 0,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.legalCommitmentHalalas).toBe(500_000);
  });

  it("applies 150% commitment for new/untrusted users", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 50, completedRentals: 1 })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(750_000);
  });

  it("flags manual review for scores < 40", () => {
    const d = computeRiskDecision(
      baseFeatures({
        disputedRentals: 2,
        completedRentals: 0,
        accountAgeDays: 10,
      })
    );
    if (d.approved && d.finalScore < 40) {
      expect(d.requiresReview).toBe(true);
    }
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

  it("returns 'ultra_high' for scores < 25", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
