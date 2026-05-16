import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeRiskDecision,
  trustScoreToCategory,
  type RiskFeatures,
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
    requestedAssetValueHalalas: 500_000, // 5,000 SAR
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

describe("Risk Engine — hard rejects", () => {
  it("rejects blocked users", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    assert.equal(d.approved, false);
    assert.equal(d.riskCategory, "ultra_high");
    assert.ok(d.rejectionReason?.includes("blocked"));
  });

  it("rejects users without Nafath verification", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    assert.equal(d.approved, false);
    assert.ok(d.rejectionReason?.includes("Nafath"));
  });

  it("rejects users without KYC verification", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    assert.equal(d.approved, false);
    assert.ok(d.rejectionReason?.includes("KYC"));
  });
});

describe("Risk Engine — scoring modifiers", () => {
  it("gives +15 for accounts older than 1 year", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 400 }));
    assert.ok(d.modifiers.some((m) => m.key === "age_365" && m.delta === 15));
  });

  it("gives +8 for accounts older than 90 days", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 120 }));
    assert.ok(d.modifiers.some((m) => m.key === "age_90" && m.delta === 8));
  });

  it("penalizes new accounts (< 30 days)", () => {
    const d = computeRiskDecision(baseFeatures({ accountAgeDays: 10 }));
    assert.ok(d.modifiers.some((m) => m.key === "age_new" && m.delta === -10));
  });

  it("rewards 10+ completed rentals", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 12 }));
    assert.ok(d.modifiers.some((m) => m.key === "rentals_10" && m.delta === 15));
  });

  it("penalizes first-time renters", () => {
    const d = computeRiskDecision(baseFeatures({ completedRentals: 0 }));
    assert.ok(d.modifiers.some((m) => m.key === "rentals_none" && m.delta === -5));
  });

  it("penalizes disputed rentals (-10 each)", () => {
    const d = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    assert.ok(d.modifiers.some((m) => m.key === "disputes" && m.delta === -20));
  });

  it("penalizes late returns (-5 each)", () => {
    const d = computeRiskDecision(baseFeatures({ lateReturns: 3 }));
    assert.ok(d.modifiers.some((m) => m.key === "late_returns" && m.delta === -15));
  });

  it("penalizes excessive cancellations", () => {
    const d = computeRiskDecision(baseFeatures({ cancelledRentals: 4 }));
    assert.ok(d.modifiers.some((m) => m.key === "cancellations" && m.delta === -8));
  });

  it("penalizes non-Saudi geography", () => {
    const d = computeRiskDecision(baseFeatures({ countryIsSaudi: false }));
    assert.ok(d.modifiers.some((m) => m.key === "non_ksa" && m.delta === -10));
  });

  it("penalizes ultra-high-value assets (>= 100k SAR)", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 15_000_000 })
    );
    assert.ok(d.modifiers.some((m) => m.key === "value_ultra" && m.delta === -10));
  });

  it("penalizes high-value assets (>= 30k SAR)", () => {
    const d = computeRiskDecision(
      baseFeatures({ requestedAssetValueHalalas: 5_000_000 })
    );
    assert.ok(d.modifiers.some((m) => m.key === "value_high" && m.delta === -5));
  });
});

describe("Risk Engine — commitment levels", () => {
  it("assigns 100% commitment for trusted users", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 200,
        completedRentals: 5,
        disputedRentals: 0,
      })
    );
    assert.equal(d.approved, true);
    assert.equal(d.legalCommitmentPct, 100);
    assert.ok(d.notes.includes("trusted_user:100pct"));
  });

  it("assigns 150% commitment for new/untrusted users", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 20, completedRentals: 0 })
    );
    assert.equal(d.approved, true);
    assert.equal(d.legalCommitmentPct, 150);
    assert.ok(d.notes.includes("new_or_untrusted_user:150pct"));
  });

  it("assigns 150% if user has disputes (even with good history)", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 200,
        completedRentals: 10,
        disputedRentals: 1,
      })
    );
    assert.equal(d.legalCommitmentPct, 150);
  });

  it("computes commitment halalas correctly at 100%", () => {
    const assetValue = 1_000_000; // 10,000 SAR
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 200,
        completedRentals: 5,
        disputedRentals: 0,
        requestedAssetValueHalalas: assetValue,
      })
    );
    assert.equal(d.legalCommitmentHalalas, assetValue);
  });

  it("computes commitment halalas correctly at 150%", () => {
    const assetValue = 1_000_000;
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 20,
        completedRentals: 0,
        requestedAssetValueHalalas: assetValue,
      })
    );
    assert.equal(d.legalCommitmentHalalas, 1_500_000);
  });
});

describe("Risk Engine — score boundaries", () => {
  it("clamps score to 0..100", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 400,
        completedRentals: 20,
        disputedRentals: 0,
        lateReturns: 0,
        cancelledRentals: 0,
      })
    );
    assert.ok(d.finalScore >= 0 && d.finalScore <= 100);
  });

  it("rejects on very low score (< 25)", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 3,
        lateReturns: 2,
        cancelledRentals: 5,
        countryIsSaudi: false,
        requestedAssetValueHalalas: 20_000_000,
      })
    );
    assert.equal(d.approved, false);
    assert.equal(d.riskCategory, "ultra_high");
  });

  it("flags manual review for low-but-passing scores", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 10,
        completedRentals: 0,
        disputedRentals: 1,
        requestedAssetValueHalalas: 5_000_000,
      })
    );
    if (d.approved && d.finalScore < 40) {
      assert.equal(d.requiresReview, true);
    }
  });
});

describe("Risk Engine — category classification", () => {
  it("categorizes score >= 80 as low risk", () => {
    assert.equal(trustScoreToCategory(85), "low");
  });

  it("categorizes score 60-79 as medium risk", () => {
    assert.equal(trustScoreToCategory(65), "medium");
  });

  it("categorizes score 25-59 as high risk", () => {
    assert.equal(trustScoreToCategory(30), "high");
  });

  it("categorizes score < 25 as ultra_high risk", () => {
    assert.equal(trustScoreToCategory(10), "ultra_high");
  });
});

describe("Risk Engine — determinism", () => {
  it("produces identical results for identical inputs", () => {
    const features = baseFeatures();
    const d1 = computeRiskDecision(features);
    const d2 = computeRiskDecision(features);
    assert.deepEqual(d1, d2);
  });
});
