import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "../riskEngine.js";

/** Default "clean" feature set: verified Saudi user, 60-day account, 1 rental */
function makeFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    accountAgeDays: 60,
    completedRentals: 1,
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
// Hard rejects
// ---------------------------------------------------------------------------
describe("computeRiskDecision — hard rejects", () => {
  it("rejects a blocked user immediately", () => {
    const d = computeRiskDecision(makeFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/blocked/i);
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.finalScore).toBe(0);
    expect(d.legalCommitmentPct).toBeNull();
    expect(d.notes).toContain("hard_reject:blocked");
  });

  it("rejects when Nafath is not verified", () => {
    const d = computeRiskDecision(makeFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/nafath/i);
    expect(d.riskCategory).toBe("high");
    expect(d.notes).toContain("hard_reject:nafath_required");
  });

  it("rejects when KYC is not verified", () => {
    const d = computeRiskDecision(makeFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/kyc/i);
    expect(d.riskCategory).toBe("high");
    expect(d.notes).toContain("hard_reject:kyc_required");
  });

  it("block takes priority over nafath/kyc", () => {
    const d = computeRiskDecision(
      makeFeatures({ priorBlock: true, nafathVerified: false, kycVerified: false })
    );
    expect(d.notes).toContain("hard_reject:blocked");
  });
});

// ---------------------------------------------------------------------------
// Score modifiers
// ---------------------------------------------------------------------------
describe("computeRiskDecision — score modifiers", () => {
  it("starts from base score 50", () => {
    const d = computeRiskDecision(makeFeatures());
    expect(d.baseScore).toBe(50);
  });

  // Account age
  it("+15 for accounts >= 365 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 400 }));
    expect(d.modifiers.find((m) => m.key === "age_365")?.delta).toBe(15);
  });

  it("+8 for accounts >= 90 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 90 }));
    expect(d.modifiers.find((m) => m.key === "age_90")?.delta).toBe(8);
  });

  it("-10 for accounts < 30 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 10 }));
    expect(d.modifiers.find((m) => m.key === "age_new")?.delta).toBe(-10);
  });

  it("no age modifier between 30 and 89 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 60 }));
    expect(d.modifiers.filter((m) => m.key.startsWith("age_"))).toHaveLength(0);
  });

  // Rental history
  it("+15 for 10+ completed rentals", () => {
    const d = computeRiskDecision(makeFeatures({ completedRentals: 12 }));
    expect(d.modifiers.find((m) => m.key === "rentals_10")?.delta).toBe(15);
  });

  it("+8 for 3-9 completed rentals", () => {
    const d = computeRiskDecision(makeFeatures({ completedRentals: 5 }));
    expect(d.modifiers.find((m) => m.key === "rentals_3")?.delta).toBe(8);
  });

  it("-5 for first-time renter (0 rentals)", () => {
    const d = computeRiskDecision(makeFeatures({ completedRentals: 0 }));
    expect(d.modifiers.find((m) => m.key === "rentals_none")?.delta).toBe(-5);
  });

  // Disputes
  it("-10 per disputed rental", () => {
    const d = computeRiskDecision(makeFeatures({ disputedRentals: 2 }));
    expect(d.modifiers.find((m) => m.key === "disputes")?.delta).toBe(-20);
  });

  // Late returns
  it("-5 per late return", () => {
    const d = computeRiskDecision(makeFeatures({ lateReturns: 3 }));
    expect(d.modifiers.find((m) => m.key === "late_returns")?.delta).toBe(-15);
  });

  // Cancellations
  it("-8 for 3+ cancellations", () => {
    const d = computeRiskDecision(makeFeatures({ cancelledRentals: 3 }));
    expect(d.modifiers.find((m) => m.key === "cancellations")?.delta).toBe(-8);
  });

  it("no cancellation penalty for < 3", () => {
    const d = computeRiskDecision(makeFeatures({ cancelledRentals: 2 }));
    expect(d.modifiers.find((m) => m.key === "cancellations")).toBeUndefined();
  });

  // Phone & email
  it("+2 for phone verified", () => {
    const d = computeRiskDecision(makeFeatures({ phoneVerified: true }));
    expect(d.modifiers.find((m) => m.key === "phone_ok")?.delta).toBe(2);
  });

  it("+2 for email verified", () => {
    const d = computeRiskDecision(makeFeatures({ emailVerified: true }));
    expect(d.modifiers.find((m) => m.key === "email_ok")?.delta).toBe(2);
  });

  it("no phone/email bonus when not verified", () => {
    const d = computeRiskDecision(
      makeFeatures({ phoneVerified: false, emailVerified: false })
    );
    expect(d.modifiers.find((m) => m.key === "phone_ok")).toBeUndefined();
    expect(d.modifiers.find((m) => m.key === "email_ok")).toBeUndefined();
  });

  // Non-Saudi
  it("-10 for non-Saudi identity", () => {
    const d = computeRiskDecision(makeFeatures({ countryIsSaudi: false }));
    expect(d.modifiers.find((m) => m.key === "non_ksa")?.delta).toBe(-10);
  });

  // Asset value buckets
  it("-10 for asset value >= 100k SAR", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 10_000_000 })
    );
    expect(d.modifiers.find((m) => m.key === "value_ultra")?.delta).toBe(-10);
  });

  it("-5 for asset value >= 30k SAR and < 100k SAR", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 5_000_000 })
    );
    expect(d.modifiers.find((m) => m.key === "value_high")?.delta).toBe(-5);
  });

  it("no asset penalty for value < 30k SAR", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 100_000 }) // 1,000 SAR
    );
    expect(d.modifiers.find((m) => m.key.startsWith("value_"))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Score clamping
// ---------------------------------------------------------------------------
describe("computeRiskDecision — score clamping", () => {
  it("clamps score to minimum 0", () => {
    // Stack many negatives: new account, 0 rentals, 5 disputes, 5 late, 3+ cancels, non-Saudi, ultra-high asset
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 5,
        lateReturns: 5,
        cancelledRentals: 5,
        countryIsSaudi: false,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 20_000_000,
      })
    );
    // score would be 50 -10 -5 -50 -25 -8 -10 -10 = -68, clamped to 0
    expect(d.finalScore).toBe(0);
  });

  it("clamps score to maximum 100", () => {
    // Stack all positives: old account, 10+ rentals, phone, email verified
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 400,
        completedRentals: 15,
        requestedAssetValueHalalas: 1_000, // tiny asset
      })
    );
    // 50 + 15 + 15 + 2 + 2 = 84, which is under 100 so fine.
    // But let's verify it can't exceed 100 even with extreme positives.
    expect(d.finalScore).toBeLessThanOrEqual(100);
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Auto-reject on low score
// ---------------------------------------------------------------------------
describe("computeRiskDecision — auto reject on low score", () => {
  it("rejects when final score < 25", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        countryIsSaudi: false,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 10_000_000,
      })
    );
    // 50 -10 -5 -30 -10 -10 = -15, clamped to 0
    expect(d.finalScore).toBeLessThan(25);
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/trust score/i);
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.notes).toContain("auto_reject:low_score");
  });
});

// ---------------------------------------------------------------------------
// Trusted user detection & legal commitment
// ---------------------------------------------------------------------------
describe("computeRiskDecision — trusted user & commitment", () => {
  it("trusted user gets 100% commitment", () => {
    // >= 90 days, >= 3 rentals, 0 disputes, score >= 70
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 100,
        completedRentals: 5,
        disputedRentals: 0,
        requestedAssetValueHalalas: 500_000,
      })
    );
    // 50 + 8 (age90) + 8 (rentals3) + 2 (phone) + 2 (email) = 70
    expect(d.finalScore).toBeGreaterThanOrEqual(70);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.legalCommitmentHalalas).toBe(500_000);
    expect(d.notes).toContain("trusted_user:100pct");
    expect(d.approved).toBe(true);
  });

  it("non-trusted user gets 150% commitment", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 60, // < 90 days -> not trusted
        completedRentals: 5,
        requestedAssetValueHalalas: 500_000,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(750_000);
    expect(d.notes).toContain("new_or_untrusted_user:150pct");
  });

  it("user with disputes is not trusted even with high score", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 400,
        completedRentals: 15,
        disputedRentals: 1, // disqualifies from trusted
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
  });

  it("user with score < 70 is not trusted", () => {
    // 90+ days, 3+ rentals, 0 disputes, but knock score below 70
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 95,
        completedRentals: 3,
        disputedRentals: 0,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 5_000_000, // -5 from high value
      })
    );
    // 50 + 8 + 8 - 5 = 61 < 70
    expect(d.finalScore).toBeLessThan(70);
    expect(d.legalCommitmentPct).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// Manual review band
// ---------------------------------------------------------------------------
describe("computeRiskDecision — manual review", () => {
  it("requires review when score is 25-39", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,   // -10
        completedRentals: 0, // -5
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 5_000_000, // -5
      })
    );
    // 50 - 10 - 5 - 5 = 30
    expect(d.finalScore).toBe(30);
    expect(d.approved).toBe(true);
    expect(d.requiresReview).toBe(true);
    expect(d.notes).toContain("manual_review_recommended");
  });

  it("does not require review when score >= 40", () => {
    const d = computeRiskDecision(makeFeatures());
    expect(d.finalScore).toBeGreaterThanOrEqual(40);
    expect(d.requiresReview).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Risk categories on approved decisions
// ---------------------------------------------------------------------------
describe("computeRiskDecision — risk categories", () => {
  it("score >= 80 is low risk", () => {
    const d = computeRiskDecision(
      makeFeatures({ accountAgeDays: 400, completedRentals: 15 })
    );
    // 50+15+15+2+2 = 84
    expect(d.finalScore).toBeGreaterThanOrEqual(80);
    expect(d.riskCategory).toBe("low");
  });

  it("score 60-79 is medium risk", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 90,
        completedRentals: 3,
      })
    );
    // 50+8+8+2+2 = 70
    expect(d.finalScore).toBeGreaterThanOrEqual(60);
    expect(d.finalScore).toBeLessThan(80);
    expect(d.riskCategory).toBe("medium");
  });

  it("score 25-59 is high risk", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        phoneVerified: false,
        emailVerified: false,
        requestedAssetValueHalalas: 5_000_000,
      })
    );
    // 50-10-5-5 = 30
    expect(d.finalScore).toBeGreaterThanOrEqual(25);
    expect(d.finalScore).toBeLessThan(60);
    expect(d.riskCategory).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// trustScoreToCategory
// ---------------------------------------------------------------------------
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
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });

  it("handles boundary values exactly", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
    expect(trustScoreToCategory(80)).toBe("low");
  });
});
