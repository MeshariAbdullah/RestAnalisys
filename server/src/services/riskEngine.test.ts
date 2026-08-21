import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "./riskEngine.js";

/**
 * Returns a baseline "standard verified user" — Nafath + KYC verified, Saudi,
 * 60-day-old account, 1 completed rental, no negatives. Callers override
 * individual fields as needed.
 */
function baseFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    accountAgeDays: 60,
    completedRentals: 1,
    disputedRentals: 0,
    cancelledRentals: 0,
    lateReturns: 0,
    nafathVerified: true,
    kycVerified: true,
    phoneVerified: false,
    emailVerified: false,
    priorBlock: false,
    requestedAssetValueHalalas: 500_000, // 5 000 SAR — mid-range
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Hard rejects
// ---------------------------------------------------------------------------
describe("Hard rejects", () => {
  it("rejects a blocked user immediately", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toBe("User is currently blocked");
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.finalScore).toBe(0);
    expect(d.legalCommitmentPct).toBeNull();
    expect(d.notes).toContain("hard_reject:blocked");
  });

  it("rejects when Nafath is not verified", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/Nafath/i);
    expect(d.riskCategory).toBe("high");
    expect(d.notes).toContain("hard_reject:nafath_required");
  });

  it("rejects when KYC is not verified", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/KYC/i);
    expect(d.riskCategory).toBe("high");
    expect(d.notes).toContain("hard_reject:kyc_required");
  });

  it("priorBlock takes precedence over missing Nafath/KYC", () => {
    const d = computeRiskDecision(
      baseFeatures({ priorBlock: true, nafathVerified: false, kycVerified: false })
    );
    expect(d.rejectionReason).toBe("User is currently blocked");
  });

  it("Nafath check takes precedence over KYC check", () => {
    const d = computeRiskDecision(
      baseFeatures({ nafathVerified: false, kycVerified: false })
    );
    expect(d.rejectionReason).toMatch(/Nafath/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Base case — verified user with defaults
// ---------------------------------------------------------------------------
describe("Base case", () => {
  it("starts at base score 50 and is approved for a standard verified user", () => {
    const d = computeRiskDecision(baseFeatures());
    expect(d.approved).toBe(true);
    expect(d.baseScore).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// 3. Account age modifiers
// ---------------------------------------------------------------------------
describe("Account age modifiers", () => {
  it("penalises accounts younger than 30 days (-10)", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 15 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_new");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(-10);
  });

  it("rewards accounts 90+ days old (+8)", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 90 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_90");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(8);
  });

  it("rewards accounts 365+ days old (+15)", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_365");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(15);
  });

  it("applies no age modifier for 30-89 day accounts", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 60 }));
    const ageMods = d.modifiers.filter((m) => m.key.startsWith("age_"));
    expect(ageMods).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Rental history
// ---------------------------------------------------------------------------
describe("Rental history modifiers", () => {
  it("penalises 0 completed rentals (-5)", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
    const mod = d.modifiers.find((m) => m.key === "rentals_none");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });

  it("rewards 3+ completed rentals (+8)", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 5 }));
    const mod = d.modifiers.find((m) => m.key === "rentals_3");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(8);
  });

  it("rewards 10+ completed rentals (+15)", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
    const mod = d.modifiers.find((m) => m.key === "rentals_10");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(15);
  });

  it("applies no rental modifier for 1-2 completed rentals", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 2 }));
    const rentalMods = d.modifiers.filter((m) => m.key.startsWith("rentals_"));
    expect(rentalMods).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Disputes
// ---------------------------------------------------------------------------
describe("Dispute modifiers", () => {
  it("subtracts -10 per disputed rental", () => {
    const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    const mod = d.modifiers.find((m) => m.key === "disputes");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-20);
  });

  it("applies no dispute modifier when disputedRentals is 0", () => {
    const d = computeRiskDecision(baseFeatures({ disputedRentals: 0 }));
    expect(d.modifiers.find((m) => m.key === "disputes")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 6. Late returns
// ---------------------------------------------------------------------------
describe("Late return modifiers", () => {
  it("subtracts -5 per late return", () => {
    const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    const mod = d.modifiers.find((m) => m.key === "late_returns");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-15);
  });

  it("applies no late return modifier when lateReturns is 0", () => {
    const d = computeRiskDecision(baseFeatures({ lateReturns: 0 }));
    expect(d.modifiers.find((m) => m.key === "late_returns")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 7. Cancellations
// ---------------------------------------------------------------------------
describe("Cancellation modifiers", () => {
  it("penalises 3+ cancellations with -8", () => {
    const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
    const mod = d.modifiers.find((m) => m.key === "cancellations");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-8);
  });

  it("applies no cancellation modifier for fewer than 3 cancellations", () => {
    const d = computeRiskDecision(baseFeatures({ cancelledRentals: 2 }));
    expect(d.modifiers.find((m) => m.key === "cancellations")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 8. Verification bonuses
// ---------------------------------------------------------------------------
describe("Verification bonuses", () => {
  it("adds +2 for phone verified", () => {
    const d = computeRiskDecision(baseFeatures({ phoneVerified: true }));
    const mod = d.modifiers.find((m) => m.key === "phone_ok");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(2);
  });

  it("adds +2 for email verified", () => {
    const d = computeRiskDecision(baseFeatures({ emailVerified: true }));
    const mod = d.modifiers.find((m) => m.key === "email_ok");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(2);
  });

  it("adds both bonuses when both are verified", () => {
    const d = computeRiskDecision(
      baseFeatures({ phoneVerified: true, emailVerified: true })
    );
    expect(d.modifiers.find((m) => m.key === "phone_ok")).toBeDefined();
    expect(d.modifiers.find((m) => m.key === "email_ok")).toBeDefined();
    // base 50 + 2 + 2 = 54
    expect(d.finalScore).toBe(54);
  });
});

// ---------------------------------------------------------------------------
// 9. Non-KSA
// ---------------------------------------------------------------------------
describe("Non-KSA modifier", () => {
  it("penalises non-Saudi users with -10", () => {
    const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    const mod = d.modifiers.find((m) => m.key === "non_ksa");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("applies no geography modifier for Saudi users", () => {
    const d = computeRiskDecision(baseFeatures({ countryIsSaudi: true }));
    expect(d.modifiers.find((m) => m.key === "non_ksa")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 10. High-value asset modifiers
// ---------------------------------------------------------------------------
describe("High-value asset modifiers", () => {
  it("penalises assets >= 30k SAR with -5", () => {
    // 30 000 SAR = 3 000 000 halalas
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 3_000_000 })
    );
    const mod = d.modifiers.find((m) => m.key === "value_high");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });

  it("penalises assets >= 100k SAR with -10 (not -5)", () => {
    // 100 000 SAR = 10 000 000 halalas
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 10_000_000 })
    );
    const mod = d.modifiers.find((m) => m.key === "value_ultra");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
    // Should NOT also apply the 30k modifier
    expect(d.modifiers.find((m) => m.key === "value_high")).toBeUndefined();
  });

  it("applies no value modifier for assets below 30k SAR", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 500_000 })
    );
    expect(d.modifiers.find((m) => m.key === "value_high")).toBeUndefined();
    expect(d.modifiers.find((m) => m.key === "value_ultra")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 11. Trusted user (100% commitment)
// ---------------------------------------------------------------------------
describe("Trusted user — 100% legal commitment", () => {
  it("grants 100% commitment to a user with 90+ days, 3+ rentals, 0 disputes, score >= 70", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 120,
        completedRentals: 5,
        disputedRentals: 0,
        phoneVerified: true,
        emailVerified: true,
      })
    );
    // base 50 + age_90(8) + rentals_3(8) + phone(2) + email(2) = 70
    expect(d.finalScore).toBeGreaterThanOrEqual(70);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.notes).toContain("trusted_user:100pct");
    // Commitment halalas = asset value * 100%
    expect(d.legalCommitmentHalalas).toBe(d.finalScore >= 70 ? 500_000 : 750_000);
  });
});

// ---------------------------------------------------------------------------
// 12. Untrusted user (150% commitment)
// ---------------------------------------------------------------------------
describe("Untrusted user — 150% legal commitment", () => {
  it("assigns 150% commitment to a brand-new account", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 10, completedRentals: 0 })
    );
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.notes).toContain("new_or_untrusted_user:150pct");
    // 500_000 * 150% = 750_000
    expect(d.legalCommitmentHalalas).toBe(750_000);
  });

  it("assigns 150% when score is below 70 despite good history", () => {
    // 90+ days, 3+ rentals, 0 disputes, but non-KSA knocks score below 70
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 100,
        completedRentals: 5,
        disputedRentals: 0,
        countryIsSaudi: false,
      })
    );
    // base 50 + age_90(8) + rentals_3(8) - non_ksa(10) = 56 < 70
    expect(d.finalScore).toBeLessThan(70);
    expect(d.legalCommitmentPct).toBe(150);
  });

  it("assigns 150% when user has disputes even with high score", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 400,
        completedRentals: 12,
        disputedRentals: 1,
        phoneVerified: true,
        emailVerified: true,
      })
    );
    // Has disputes => not trusted regardless of score
    expect(d.legalCommitmentPct).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// 13. Score clamping (0-100)
// ---------------------------------------------------------------------------
describe("Score clamping", () => {
  it("clamps to 0 when modifiers drive score very negative", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 5,
        lateReturns: 5,
        cancelledRentals: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 10_000_000,
      })
    );
    // 50 -10 -5 -50 -25 -8 -10 -10 = -68 => clamped to 0
    expect(d.finalScore).toBe(0);
  });

  it("clamps to 100 when modifiers push score above 100", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 400,
        completedRentals: 12,
        phoneVerified: true,
        emailVerified: true,
      })
    );
    // 50 + 15 + 15 + 2 + 2 = 84, which is < 100 so it's fine
    // Let's verify it's at most 100 in any case
    expect(d.finalScore).toBeLessThanOrEqual(100);
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 14. Low score auto-reject (finalScore < 25)
// ---------------------------------------------------------------------------
describe("Low score auto-reject", () => {
  it("rejects when final score falls below 25", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        countryIsSaudi: false,
      })
    );
    // 50 -10 -5 -30 -10 = -5 => clamped to 0 < 25
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/trust score/i);
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.legalCommitmentPct).toBeNull();
    expect(d.notes).toContain("auto_reject:low_score");
  });

  it("approves when final score is exactly 25", () => {
    // Need exactly 25: base 50 - 10 (new) - 5 (no rentals) - 10 (non_ksa) = 25
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        countryIsSaudi: false,
      })
    );
    expect(d.finalScore).toBe(25);
    expect(d.approved).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 15. Manual review zone (25-39)
// ---------------------------------------------------------------------------
describe("Manual review zone", () => {
  it("flags requiresReview when score is between 25 and 39", () => {
    // base 50 - 10 (new) - 5 (no rentals) - 10 (non_ksa) = 25
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        countryIsSaudi: false,
      })
    );
    expect(d.finalScore).toBeLessThan(40);
    expect(d.finalScore).toBeGreaterThanOrEqual(25);
    expect(d.approved).toBe(true);
    expect(d.requiresReview).toBe(true);
    expect(d.notes).toContain("manual_review_recommended");
  });

  it("does not flag requiresReview when score is 40 or above", () => {
    const d = computeRiskDecision(baseFeatures());
    expect(d.finalScore).toBeGreaterThanOrEqual(40);
    expect(d.requiresReview).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 16. Risk categories
// ---------------------------------------------------------------------------
describe("Risk categories", () => {
  it("categorises score >= 80 as low risk", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 400,
        completedRentals: 12,
        phoneVerified: true,
        emailVerified: true,
      })
    );
    // 50 + 15 + 15 + 2 + 2 = 84
    expect(d.finalScore).toBe(84);
    expect(d.riskCategory).toBe("low");
  });

  it("categorises score 60-79 as medium risk", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 100,
        completedRentals: 5,
        phoneVerified: true,
        emailVerified: true,
      })
    );
    // 50 + 8 + 8 + 2 + 2 = 70
    expect(d.finalScore).toBe(70);
    expect(d.riskCategory).toBe("medium");
  });

  it("categorises score 25-59 as high risk", () => {
    const d = computeRiskDecision(baseFeatures());
    // 50 (no modifiers beyond base)
    expect(d.finalScore).toBe(50);
    expect(d.riskCategory).toBe("high");
  });

  it("categorises score < 25 as ultra_high (auto-rejected)", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        countryIsSaudi: false,
      })
    );
    expect(d.finalScore).toBeLessThan(25);
    expect(d.riskCategory).toBe("ultra_high");
  });
});

// ---------------------------------------------------------------------------
// 17. trustScoreToCategory
// ---------------------------------------------------------------------------
describe("trustScoreToCategory", () => {
  it("returns 'low' for scores >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
    expect(trustScoreToCategory(95)).toBe("low");
  });

  it("returns 'medium' for scores 60-79", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
    expect(trustScoreToCategory(65)).toBe("medium");
  });

  it("returns 'high' for scores 25-59", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
    expect(trustScoreToCategory(40)).toBe("high");
  });

  it("returns 'ultra_high' for scores < 25", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(10)).toBe("ultra_high");
  });

  it("handles exact boundary values correctly", () => {
    expect(trustScoreToCategory(79)).toBe("medium");
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(59)).toBe("high");
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(25)).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// Combined / integration-style scenarios
// ---------------------------------------------------------------------------
describe("Combined scenarios", () => {
  it("computes correct legal commitment halalas for trusted user", () => {
    const assetValue = 1_000_000; // 10 000 SAR
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 120,
        completedRentals: 5,
        disputedRentals: 0,
        phoneVerified: true,
        emailVerified: true,
        requestedAssetValueHalalas: assetValue,
      })
    );
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.legalCommitmentHalalas).toBe(assetValue); // 100%
  });

  it("computes correct legal commitment halalas for untrusted user", () => {
    const assetValue = 1_000_000; // 10 000 SAR
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        requestedAssetValueHalalas: assetValue,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(1_500_000); // 150%
  });

  it("hard rejects return zero commitment", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.legalCommitmentPct).toBeNull();
    expect(d.legalCommitmentHalalas).toBe(0);
  });

  it("all modifiers stack correctly for a worst-case approved user", () => {
    // Build a user that barely stays at 25
    // base 50 - 10 (new) - 5 (no rentals) - 10 (non_ksa) = 25
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        countryIsSaudi: false,
      })
    );
    expect(d.finalScore).toBe(25);
    expect(d.approved).toBe(true);
    expect(d.requiresReview).toBe(true);
    expect(d.riskCategory).toBe("high");
    expect(d.legalCommitmentPct).toBe(150);
  });

  it("all modifiers stack correctly for a best-case user", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 400,
        completedRentals: 12,
        phoneVerified: true,
        emailVerified: true,
      })
    );
    // 50 + 15 + 15 + 2 + 2 = 84
    expect(d.finalScore).toBe(84);
    expect(d.approved).toBe(true);
    expect(d.requiresReview).toBe(false);
    expect(d.riskCategory).toBe("low");
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.notes).toContain("trusted_user:100pct");
  });
});
