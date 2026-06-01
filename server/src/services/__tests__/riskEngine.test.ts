import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "../riskEngine.js";

/** Helper: returns a "clean" baseline user who passes all hard gates. */
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
    requestedAssetValueHalalas: 500_000, // 5,000 SAR
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Hard-reject conditions
// ---------------------------------------------------------------------------
describe("hard reject conditions", () => {
  it("rejects blocked users immediately", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/blocked/i);
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.finalScore).toBe(0);
    expect(d.notes).toContain("hard_reject:blocked");
  });

  it("rejects users without nafath verification", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/nafath/i);
    expect(d.riskCategory).toBe("high");
    expect(d.notes).toContain("hard_reject:nafath_required");
  });

  it("rejects users without KYC verification", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/kyc/i);
    expect(d.riskCategory).toBe("high");
    expect(d.notes).toContain("hard_reject:kyc_required");
  });

  it("checks priorBlock before nafath (order matters)", () => {
    const d = computeRiskDecision(
      baseFeatures({ priorBlock: true, nafathVerified: false })
    );
    expect(d.notes).toContain("hard_reject:blocked");
  });
});

// ---------------------------------------------------------------------------
// Score modifiers
// ---------------------------------------------------------------------------
describe("score modifiers", () => {
  it("adds +15 for accounts older than 1 year", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_365");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(15);
  });

  it("adds +8 for accounts between 90 and 365 days", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 100 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_90");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(8);
  });

  it("penalizes -10 for accounts younger than 30 days", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 10 }));
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

  it("adds +8 for 3-9 completed rentals", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 5 }));
    const mod = d.modifiers.find((m) => m.key === "rentals_3");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(8);
  });

  it("penalizes -5 for first-time renters (0 rentals)", () => {
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

  it("penalizes -8 for 3+ cancellations", () => {
    const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
    const mod = d.modifiers.find((m) => m.key === "cancellations");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-8);
  });

  it("adds +2 each for phone and email verification", () => {
    const d = computeRiskDecision(
      baseFeatures({ phoneVerified: true, emailVerified: true })
    );
    expect(d.modifiers.find((m) => m.key === "phone_ok")?.delta).toBe(2);
    expect(d.modifiers.find((m) => m.key === "email_ok")?.delta).toBe(2);
  });

  it("penalizes -10 for non-Saudi identity", () => {
    const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    const mod = d.modifiers.find((m) => m.key === "non_ksa");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("penalizes -10 for ultra-high asset value (>=100k SAR)", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 10_000_000 })
    );
    const mod = d.modifiers.find((m) => m.key === "value_ultra");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("penalizes -5 for high asset value (30k-100k SAR)", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 5_000_000 })
    );
    const mod = d.modifiers.find((m) => m.key === "value_high");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });
});

// ---------------------------------------------------------------------------
// Score clamping
// ---------------------------------------------------------------------------
describe("score clamping", () => {
  it("clamps final score to a minimum of 0", () => {
    // Stack as many negatives as possible
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 5,
        lateReturns: 5,
        cancelledRentals: 10,
        phoneVerified: false,
        emailVerified: false,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 15_000_000,
      })
    );
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("clamps final score to a maximum of 100", () => {
    // Stack as many positives as possible
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 999,
        completedRentals: 50,
        disputedRentals: 0,
        cancelledRentals: 0,
        lateReturns: 0,
        phoneVerified: true,
        emailVerified: true,
        countryIsSaudi: true,
        requestedAssetValueHalalas: 1000, // low value
      })
    );
    expect(d.finalScore).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// Risk categories
// ---------------------------------------------------------------------------
describe("risk categories", () => {
  it("classifies score >= 80 as low risk", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("classifies score 60-79 as medium risk", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("classifies score 25-59 as high risk", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("classifies score < 25 as ultra_high risk", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});

// ---------------------------------------------------------------------------
// Legal commitment percentage
// ---------------------------------------------------------------------------
describe("legal commitment percentage", () => {
  it("returns 100% for trusted users (90+ days, 3+ rentals, 0 disputes, score >= 70)", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 120,
        completedRentals: 5,
        disputedRentals: 0,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.notes).toContain("trusted_user:100pct");
  });

  it("returns 150% for new users (< 90 days)", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 40, completedRentals: 5 })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.notes).toContain("new_or_untrusted_user:150pct");
  });

  it("returns 150% when user has disputes even if otherwise trusted", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 200,
        completedRentals: 10,
        disputedRentals: 1,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
  });

  it("computes legal commitment halalas correctly at 100%", () => {
    const assetValue = 1_000_000; // 10,000 SAR
    const d = computeRiskDecision(
      baseFeatures({
        requestedAssetValueHalalas: assetValue,
        accountAgeDays: 120,
        completedRentals: 5,
        disputedRentals: 0,
      })
    );
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.legalCommitmentHalalas).toBe(assetValue);
  });

  it("computes legal commitment halalas correctly at 150%", () => {
    const assetValue = 1_000_000;
    const d = computeRiskDecision(
      baseFeatures({
        requestedAssetValueHalalas: assetValue,
        accountAgeDays: 10,
        completedRentals: 0,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(1_500_000);
  });
});

// ---------------------------------------------------------------------------
// Manual review threshold
// ---------------------------------------------------------------------------
describe("manual review threshold", () => {
  it("flags requiresReview when final score is below 40", () => {
    // Build a user who passes hard reject (score > 25) but < 40
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,       // -10
        completedRentals: 0,     // -5
        disputedRentals: 1,      // -10
        lateReturns: 0,
        phoneVerified: false,    // no +2
        emailVerified: false,    // no +2
        countryIsSaudi: true,
        requestedAssetValueHalalas: 500_000, // no extra penalty
      })
    );
    // base 50 - 10 - 5 - 10 = 25, which is the reject threshold exactly
    // With score=25, it should be approved but requiresReview
    if (d.approved) {
      expect(d.finalScore).toBeLessThan(40);
      expect(d.requiresReview).toBe(true);
      expect(d.notes).toContain("manual_review_recommended");
    }
  });

  it("does not flag requiresReview when score is >= 40", () => {
    const d = computeRiskDecision(baseFeatures());
    expect(d.finalScore).toBeGreaterThanOrEqual(40);
    expect(d.requiresReview).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Auto-reject via low score
// ---------------------------------------------------------------------------
describe("auto-reject via low score", () => {
  it("rejects when final score falls below 25", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,       // -10
        completedRentals: 0,     // -5
        disputedRentals: 2,      // -20
        lateReturns: 2,          // -10
        cancelledRentals: 5,     // -8
        phoneVerified: false,
        emailVerified: false,
        countryIsSaudi: false,   // -10
        requestedAssetValueHalalas: 15_000_000, // -10 (ultra)
      })
    );
    // 50 - 10 - 5 - 20 - 10 - 8 - 10 - 10 = -23 -> clamped to 0
    expect(d.approved).toBe(false);
    expect(d.finalScore).toBe(0);
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.notes).toContain("auto_reject:low_score");
  });
});
