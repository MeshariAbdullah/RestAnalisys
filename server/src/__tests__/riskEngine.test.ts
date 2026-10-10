import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "../services/riskEngine.js";

/**
 * Returns a neutral, "safe" set of risk features for a typical verified user.
 *
 * Base score starts at 50, then modifiers apply:
 *   account 100 days  -> +8  (90+ days bracket)
 *   5 completed       -> +8  (3+ bracket)
 *   phone verified    -> +2
 *   email verified    -> +2
 *   => finalScore = 50 + 8 + 8 + 2 + 2 = 70
 */
function baseFeatures(): RiskFeatures {
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
    requestedAssetValueHalalas: 500000, // 5 000 SAR
    userRole: "renter" as const,
    countryIsSaudi: true,
  };
}

// ─── Hard-reject rules ──────────────────────────────────────────────────────

describe("hard-reject rules", () => {
  it("rejects a previously blocked user with ultra_high risk", () => {
    const features: RiskFeatures = { ...baseFeatures(), priorBlock: true };
    const decision = computeRiskDecision(features);

    expect(decision.approved).toBe(false);
    expect(decision.riskCategory).toBe("ultra_high");
    expect(decision.rejectionReason).toBe("User is currently blocked");
    expect(decision.finalScore).toBe(0);
  });

  it("rejects when Nafath is not verified", () => {
    const features: RiskFeatures = { ...baseFeatures(), nafathVerified: false };
    const decision = computeRiskDecision(features);

    expect(decision.approved).toBe(false);
    expect(decision.notes.join(" ")).toContain("nafath_required");
    expect(decision.riskCategory).toBe("high");
  });

  it("rejects when KYC is not verified", () => {
    const features: RiskFeatures = { ...baseFeatures(), kycVerified: false };
    const decision = computeRiskDecision(features);

    expect(decision.approved).toBe(false);
    expect(decision.notes.join(" ")).toContain("kyc_required");
    expect(decision.riskCategory).toBe("high");
  });
});

// ─── Legal commitment percentage ────────────────────────────────────────────

describe("legal commitment percentage", () => {
  it("gives trusted user 100% commitment", () => {
    // Trusted: accountAge >= 90, completedRentals >= 3, disputedRentals === 0, finalScore >= 70
    const features: RiskFeatures = {
      ...baseFeatures(),
      accountAgeDays: 100,    // +8
      completedRentals: 5,    // +8
      disputedRentals: 0,
    };
    const decision = computeRiskDecision(features);

    expect(decision.approved).toBe(true);
    // base 50 + 8 (age) + 8 (rentals) + 2 (phone) + 2 (email) = 70
    expect(decision.finalScore).toBe(70);
    expect(decision.legalCommitmentPct).toBe(100);
    expect(decision.legalCommitmentHalalas).toBe(500000); // 100% of 500000
  });

  it("gives new user 150% commitment", () => {
    const features: RiskFeatures = {
      ...baseFeatures(),
      accountAgeDays: 10,     // -10 (< 30 days)
      completedRentals: 0,    // -5  (no rentals)
    };
    const decision = computeRiskDecision(features);

    // base 50 - 10 (age) - 5 (rentals) + 2 (phone) + 2 (email) = 39
    // Score 39 < 70, so NOT trusted -> 150%
    expect(decision.legalCommitmentPct).toBe(150);
    expect(decision.legalCommitmentHalalas).toBe(750000); // 150% of 500000
  });
});

// ─── Score modifiers ────────────────────────────────────────────────────────

describe("score modifiers", () => {
  describe("account age", () => {
    it("penalises accounts younger than 30 days by -10", () => {
      // Isolate the age modifier by using a "neutral" age (30-89 days, no modifier)
      // vs young (< 30 days, -10).
      const young = computeRiskDecision({ ...baseFeatures(), accountAgeDays: 15 });
      const neutral = computeRiskDecision({ ...baseFeatures(), accountAgeDays: 50 });

      // neutral: base 50, no age modifier, +8 (5 rentals), +2 (phone), +2 (email) = 62
      expect(neutral.finalScore).toBe(62);
      // young: 62 - 10 (age < 30) = 52
      expect(young.finalScore).toBe(52);
      expect(young.finalScore).toBe(neutral.finalScore - 10);
    });

    it("awards +8 for accounts 90+ days old", () => {
      const older = computeRiskDecision({ ...baseFeatures(), accountAgeDays: 90 });
      const neutral = computeRiskDecision({ ...baseFeatures(), accountAgeDays: 50 });

      expect(older.finalScore).toBe(neutral.finalScore + 8);
    });

    it("awards +15 for accounts 365+ days old", () => {
      const veteran = computeRiskDecision({ ...baseFeatures(), accountAgeDays: 400 });
      const neutral = computeRiskDecision({ ...baseFeatures(), accountAgeDays: 50 });

      expect(veteran.finalScore).toBe(neutral.finalScore + 15);
    });
  });

  describe("rental history", () => {
    it("awards +15 for 10+ completed rentals", () => {
      const experienced = computeRiskDecision({ ...baseFeatures(), completedRentals: 12 });
      const moderate = computeRiskDecision({ ...baseFeatures(), completedRentals: 3 });

      // Difference should be 15 - 8 = 7 (experienced gets +15, moderate gets +8)
      expect(experienced.finalScore - moderate.finalScore).toBe(7);
    });

    it("awards +8 for 3+ completed rentals", () => {
      const some = computeRiskDecision({ ...baseFeatures(), completedRentals: 3 });
      const none = computeRiskDecision({ ...baseFeatures(), completedRentals: 0 });

      // 3+ completed gets +8, 0 completed gets -5, difference is 13
      expect(some.finalScore - none.finalScore).toBe(13);
    });

    it("penalises 0 completed rentals by -5", () => {
      const none = computeRiskDecision({ ...baseFeatures(), completedRentals: 0 });
      const some = computeRiskDecision({ ...baseFeatures(), completedRentals: 3 });

      expect(none.finalScore).toBe(some.finalScore - 13);
    });
  });

  describe("disputes", () => {
    it("costs -10 per disputed rental", () => {
      const clean = computeRiskDecision({ ...baseFeatures(), disputedRentals: 0 });
      const oneDispute = computeRiskDecision({ ...baseFeatures(), disputedRentals: 1 });
      const twoDisputes = computeRiskDecision({ ...baseFeatures(), disputedRentals: 2 });

      expect(oneDispute.finalScore).toBe(clean.finalScore - 10);
      expect(twoDisputes.finalScore).toBe(clean.finalScore - 20);
    });
  });

  describe("late returns", () => {
    it("costs -5 per late return", () => {
      const clean = computeRiskDecision({ ...baseFeatures(), lateReturns: 0 });
      const oneLate = computeRiskDecision({ ...baseFeatures(), lateReturns: 1 });
      const threeLate = computeRiskDecision({ ...baseFeatures(), lateReturns: 3 });

      expect(oneLate.finalScore).toBe(clean.finalScore - 5);
      expect(threeLate.finalScore).toBe(clean.finalScore - 15);
    });
  });

  describe("high-value assets", () => {
    it("penalises assets >= 30 000 SAR by -5", () => {
      const normal = computeRiskDecision({
        ...baseFeatures(),
        requestedAssetValueHalalas: 500000, // 5 000 SAR
      });
      const expensive = computeRiskDecision({
        ...baseFeatures(),
        requestedAssetValueHalalas: 3000000, // 30 000 SAR
      });

      expect(expensive.finalScore).toBe(normal.finalScore - 5);
    });

    it("penalises assets >= 100 000 SAR by -10", () => {
      const normal = computeRiskDecision({
        ...baseFeatures(),
        requestedAssetValueHalalas: 500000, // 5 000 SAR
      });
      const veryExpensive = computeRiskDecision({
        ...baseFeatures(),
        requestedAssetValueHalalas: 10000000, // 100 000 SAR
      });

      expect(veryExpensive.finalScore).toBe(normal.finalScore - 10);
    });
  });

  describe("non-Saudi", () => {
    it("penalises non-Saudi users by -10", () => {
      const saudi = computeRiskDecision({ ...baseFeatures(), countryIsSaudi: true });
      const nonSaudi = computeRiskDecision({ ...baseFeatures(), countryIsSaudi: false });

      expect(nonSaudi.finalScore).toBe(saudi.finalScore - 10);
    });
  });
});

// ─── Score clamping ─────────────────────────────────────────────────────────

describe("score clamping", () => {
  it("never returns a score below 0", () => {
    const terrible: RiskFeatures = {
      ...baseFeatures(),
      accountAgeDays: 1,                       // -10
      completedRentals: 0,                     // -5
      disputedRentals: 10,                     // -100
      lateReturns: 20,                         // -100
      countryIsSaudi: false,                   // -10
      requestedAssetValueHalalas: 15000000,    // -10
    };
    const decision = computeRiskDecision(terrible);

    // This would be rejected (hard reject below 25) so finalScore is on the decision
    expect(decision.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("never returns a score above 100", () => {
    const perfect: RiskFeatures = {
      ...baseFeatures(),
      accountAgeDays: 3000,       // +15
      completedRentals: 500,      // +15
      disputedRentals: 0,
      lateReturns: 0,
      requestedAssetValueHalalas: 100, // no penalty
    };
    const decision = computeRiskDecision(perfect);

    expect(decision.finalScore).toBeLessThanOrEqual(100);
  });
});

// ─── Auto-reject & manual review thresholds ─────────────────────────────────

describe("approval thresholds", () => {
  it("auto-rejects when score drops below 25", () => {
    const risky: RiskFeatures = {
      ...baseFeatures(),
      accountAgeDays: 5,                    // -10
      completedRentals: 0,                  // -5
      disputedRentals: 4,                   // -40
      lateReturns: 5,                       // -25
      countryIsSaudi: false,                // -10
      requestedAssetValueHalalas: 10000000, // -10 (100k SAR)
    };
    // base 50 - 10 - 5 - 40 - 25 - 10 - 10 + 2 + 2 = -46 -> clamped to 0
    const decision = computeRiskDecision(risky);

    expect(decision.finalScore).toBeLessThan(25);
    expect(decision.approved).toBe(false);
    expect(decision.riskCategory).toBe("ultra_high");
  });

  it("recommends manual review for score between 25-40", () => {
    // We need finalScore in the [25, 40) range.
    // base 50, age 50 days (no mod), 3 completed (+8), 1 dispute (-10),
    // 1 late (-5), non-Saudi (-10), phone (+2), email (+2)
    // = 50 + 8 - 10 - 5 - 10 + 2 + 2 = 37
    const borderline: RiskFeatures = {
      ...baseFeatures(),
      accountAgeDays: 50,       // no modifier (30-89 range)
      completedRentals: 3,      // +8
      disputedRentals: 1,       // -10
      lateReturns: 1,           // -5
      countryIsSaudi: false,    // -10
    };
    const decision = computeRiskDecision(borderline);

    expect(decision.finalScore).toBe(37);
    expect(decision.finalScore).toBeGreaterThanOrEqual(25);
    expect(decision.finalScore).toBeLessThan(40);
    expect(decision.requiresReview).toBe(true);
    expect(decision.approved).toBe(true);
    expect(decision.notes.join(" ")).toContain("manual_review_recommended");
  });
});

// ─── trustScoreToCategory ───────────────────────────────────────────────────

describe("trustScoreToCategory", () => {
  it("maps 80+ to 'low' risk", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(95)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("maps 60-79 to 'medium' risk", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(70)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("maps 25-59 to 'high' risk", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(40)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("maps below 25 to 'ultra_high' risk", () => {
    expect(trustScoreToCategory(0)).toBe("ultra_high");
    expect(trustScoreToCategory(10)).toBe("ultra_high");
    expect(trustScoreToCategory(24)).toBe("ultra_high");
  });
});
