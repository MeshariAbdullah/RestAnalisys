import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
} from "../riskEngine.js";

/** Helper: returns a default "valid" feature set that passes hard rejects. */
function baseFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
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
// Hard-reject rules
// ---------------------------------------------------------------------------
describe("computeRiskDecision — hard rejects", () => {
  it("rejects a blocked user with ultra_high risk", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.rejectionReason).toMatch(/blocked/i);
    expect(d.finalScore).toBe(0);
  });

  it("rejects when Nafath is not verified", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/nafath/i);
    expect(d.riskCategory).toBe("high");
  });

  it("rejects when KYC is not verified", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toMatch(/kyc/i);
    expect(d.riskCategory).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// Trusted vs untrusted users
// ---------------------------------------------------------------------------
describe("computeRiskDecision — trusted user", () => {
  it("grants 100% legal commitment to a trusted user", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 180,
        completedRentals: 5,
        disputedRentals: 0,
      })
    );
    expect(d.approved).toBe(true);
    // Score: 50 + 8 (age_90) + 8 (rentals_3) + 2 (phone) + 2 (email) = 70
    expect(d.finalScore).toBeGreaterThanOrEqual(70);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.notes).toContain("trusted_user:100pct");
  });
});

describe("computeRiskDecision — new / untrusted user", () => {
  it("assigns 150% legal commitment to a brand-new user", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.notes).toContain("new_or_untrusted_user:150pct");
  });
});

// ---------------------------------------------------------------------------
// Score thresholds
// ---------------------------------------------------------------------------
describe("computeRiskDecision — score thresholds", () => {
  it("auto-rejects when final score < 25", () => {
    // Stack negatives: new account, no rentals, 3 disputes, 2 late, non-saudi
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        lateReturns: 2,
        countryIsSaudi: false,
        cancelledRentals: 3,
      })
    );
    // 50 - 10(new) - 5(no rentals) - 30(disputes) - 10(late) - 8(cancellations) - 10(non-KSA) + 2(phone) + 2(email) = -19 → clamped to 0
    expect(d.approved).toBe(false);
    expect(d.finalScore).toBeLessThan(25);
    expect(d.rejectionReason).toMatch(/trust score/i);
  });

  it("approves but flags for review when score is between 25 and 40", () => {
    // Target: score in [25, 40)
    // 50 - 10(new) - 5(no rentals) - 10(1 dispute) + 2(phone) + 2(email) = 29
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        disputedRentals: 1,
      })
    );
    expect(d.approved).toBe(true);
    expect(d.finalScore).toBeGreaterThanOrEqual(25);
    expect(d.finalScore).toBeLessThan(40);
    expect(d.requiresReview).toBe(true);
    expect(d.notes).toContain("manual_review_recommended");
  });
});

// ---------------------------------------------------------------------------
// Modifier tests
// ---------------------------------------------------------------------------
describe("computeRiskDecision — modifiers", () => {
  it("applies -10 for high-value assets (>= 100k SAR)", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 10_000_000 })
    );
    const mod = d.modifiers.find((m) => m.key === "value_ultra");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("penalises late returns (-5 per late return)", () => {
    const d = computeRiskDecision(baseFeatures({ lateReturns: 2 }));
    const mod = d.modifiers.find((m) => m.key === "late_returns");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("heavily penalises multiple disputes (-10 per dispute)", () => {
    const d = computeRiskDecision(baseFeatures({ disputedRentals: 3 }));
    const mod = d.modifiers.find((m) => m.key === "disputes");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-30);
  });
});

// ---------------------------------------------------------------------------
// Score clamping
// ---------------------------------------------------------------------------
describe("computeRiskDecision — score clamping", () => {
  it("never lets finalScore drop below 0", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 1,
        completedRentals: 0,
        disputedRentals: 10,
        lateReturns: 10,
        cancelledRentals: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 10_000_000,
      })
    );
    expect(d.finalScore).toBe(0);
  });

  it("never lets finalScore exceed 100", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 400,
        completedRentals: 20,
        disputedRentals: 0,
        lateReturns: 0,
        cancelledRentals: 0,
        phoneVerified: true,
        emailVerified: true,
        countryIsSaudi: true,
        requestedAssetValueHalalas: 100,
      })
    );
    // 50 + 15(age) + 15(rentals) + 2(phone) + 2(email) = 84 → within bounds, but check clamp holds
    expect(d.finalScore).toBeLessThanOrEqual(100);
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// trustScoreToCategory
// ---------------------------------------------------------------------------
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

  it("returns 'ultra_high' for scores below 25", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
