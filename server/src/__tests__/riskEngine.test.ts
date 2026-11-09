import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "../services/riskEngine.js";

function makeFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    accountAgeDays: 100,
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
  // ── Hard rejects ────────────────────────────────────────────────────────

  it("rejects a blocked user immediately", () => {
    const d = computeRiskDecision(makeFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/blocked/i);
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.finalScore).toBe(0);
  });

  it("rejects when Nafath is not verified", () => {
    const d = computeRiskDecision(makeFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/nafath/i);
  });

  it("rejects when KYC is not verified", () => {
    const d = computeRiskDecision(makeFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/kyc/i);
  });

  // ── Approved — standard flow ────────────────────────────────────────────

  it("approves a verified user with decent history", () => {
    const d = computeRiskDecision(makeFeatures());
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBeDefined();
    expect(d.legalCommitmentHalalas).toBeGreaterThan(0);
  });

  // ── Trusted vs untrusted ────────────────────────────────────────────────

  it("grants 100% commitment to trusted users", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 100,
        completedRentals: 5,
        disputedRentals: 0,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.legalCommitmentHalalas).toBe(1_000_000);
    expect(d.notes).toContain("trusted_user:100pct");
  });

  it("assigns 150% commitment to new/untrusted users", () => {
    const d = computeRiskDecision(
      makeFeatures({ accountAgeDays: 10, completedRentals: 0 })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(1_500_000);
    expect(d.notes).toContain("new_or_untrusted_user:150pct");
  });

  it("treats a user with disputes as untrusted even with age + rental count", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 200,
        completedRentals: 10,
        disputedRentals: 1,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
  });

  // ── Score modifiers ─────────────────────────────────────────────────────

  it("adds +15 for account age >= 365 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 400 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_365");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(15);
  });

  it("adds +8 for account age >= 90 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 95 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_90");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(8);
  });

  it("subtracts 10 for account age < 30 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 15 }));
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

  it("subtracts 5 for first-time renter", () => {
    const d = computeRiskDecision(makeFeatures({ completedRentals: 0 }));
    const mod = d.modifiers.find((m) => m.key === "rentals_none");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });

  it("penalizes disputes proportionally", () => {
    const d = computeRiskDecision(makeFeatures({ disputedRentals: 3 }));
    const mod = d.modifiers.find((m) => m.key === "disputes");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-30);
  });

  it("penalizes late returns proportionally", () => {
    const d = computeRiskDecision(makeFeatures({ lateReturns: 2 }));
    const mod = d.modifiers.find((m) => m.key === "late_returns");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("penalizes 3+ cancellations", () => {
    const d = computeRiskDecision(makeFeatures({ cancelledRentals: 4 }));
    const mod = d.modifiers.find((m) => m.key === "cancellations");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-8);
  });

  it("gives +2 for phone verification", () => {
    const d = computeRiskDecision(makeFeatures({ phoneVerified: true }));
    const mod = d.modifiers.find((m) => m.key === "phone_ok");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(2);
  });

  it("gives +2 for email verification", () => {
    const d = computeRiskDecision(makeFeatures({ emailVerified: true }));
    const mod = d.modifiers.find((m) => m.key === "email_ok");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(2);
  });

  it("penalizes non-KSA identity", () => {
    const d = computeRiskDecision(makeFeatures({ countryIsSaudi: false }));
    const mod = d.modifiers.find((m) => m.key === "non_ksa");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  // ── High-value asset penalty ────────────────────────────────────────────

  it("penalizes ultra-high value assets (>= 100k SAR)", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 10_000_000 })
    );
    const mod = d.modifiers.find((m) => m.key === "value_ultra");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("penalizes high value assets (>= 30k SAR)", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 5_000_000 })
    );
    const mod = d.modifiers.find((m) => m.key === "value_high");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });

  it("does not penalize low-value assets", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 100_000 })
    );
    const valueMods = d.modifiers.filter(
      (m) => m.key === "value_ultra" || m.key === "value_high"
    );
    expect(valueMods).toHaveLength(0);
  });

  // ── Score clamping ──────────────────────────────────────────────────────

  it("clamps score to a maximum of 100", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 400,
        completedRentals: 15,
        requestedAssetValueHalalas: 50_000,
      })
    );
    expect(d.finalScore).toBeLessThanOrEqual(100);
  });

  it("clamps score to a minimum of 0", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 5,
        lateReturns: 5,
        cancelledRentals: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 15_000_000,
      })
    );
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
  });

  // ── Manual review band ──────────────────────────────────────────────────

  it("flags manual review for scores between 25 and 40", () => {
    // Calibrate to land in the band. Base=50, age_90=+8, rentals_3=+8,
    // phone=+2, email=+2 → 70. Need to push down into the 25-39 range.
    // Use disputes + late returns + value penalty to push down.
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 10,      // -10
        completedRentals: 0,     // -5
        disputedRentals: 1,      // -10
        lateReturns: 0,
        cancelledRentals: 0,
        phoneVerified: false,    // no +2
        emailVerified: false,    // no +2
        requestedAssetValueHalalas: 100_000, // no penalty
      })
    );
    // base=50, age_new=-10, rentals_none=-5, disputes=-10 → 25
    // This is right at HARD_REJECT_SCORE boundary.
    // Bump to 26 by using accountAgeDays 31 (no modifier).
    const d2 = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 31,       // no modifier (between 30 and 90)
        completedRentals: 0,      // -5
        disputedRentals: 1,       // -10
        lateReturns: 0,
        cancelledRentals: 0,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 100_000,
      })
    );
    // base=50, rentals_none=-5, disputes=-10 → 35
    expect(d2.approved).toBe(true);
    expect(d2.finalScore).toBeGreaterThanOrEqual(25);
    expect(d2.finalScore).toBeLessThan(40);
    expect(d2.requiresReview).toBe(true);
    expect(d2.notes).toContain("manual_review_recommended");
  });

  // ── Low-score auto-reject ───────────────────────────────────────────────

  it("auto-rejects when final score < 25", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,        // -10
        completedRentals: 0,      // -5
        disputedRentals: 2,       // -20
        lateReturns: 0,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 100_000,
      })
    );
    // 50 -10 -5 -20 = 15 → below 25
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/threshold/i);
    expect(d.riskCategory).toBe("ultra_high");
  });

  // ── Commitment halalas calculation ──────────────────────────────────────

  it("computes commitment halalas = value * pct / 100", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 2_000_000 })
    );
    if (d.legalCommitmentPct === 100) {
      expect(d.legalCommitmentHalalas).toBe(2_000_000);
    } else {
      expect(d.legalCommitmentHalalas).toBe(3_000_000);
    }
  });

  // ── Risk categories ─────────────────────────────────────────────────────

  it("assigns 'low' risk for scores >= 80", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 400,
        completedRentals: 12,
        requestedAssetValueHalalas: 100_000,
      })
    );
    // 50 +15 +15 +2 +2 = 84
    expect(d.finalScore).toBeGreaterThanOrEqual(80);
    expect(d.riskCategory).toBe("low");
  });

  it("assigns 'medium' risk for scores 60-79", () => {
    const d = computeRiskDecision(makeFeatures());
    // 50 +8 +8 +2 +2 = 70 (within medium range with value penalty)
    expect(d.riskCategory).toBe("medium");
  });

  it("assigns 'high' risk for scores 25-59", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 31,
        completedRentals: 0,
        disputedRentals: 1,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 100_000,
      })
    );
    // 50 -5 -10 = 35
    expect(d.riskCategory).toBe("high");
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
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
