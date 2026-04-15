/**
 * Unit tests for the pure risk engine. Run with:
 *   cd server && npx tsx --test src/services/riskEngine.test.ts
 *
 * No DB is required — the engine is a pure function of a feature snapshot.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { computeRiskDecision, trustScoreToCategory, RiskFeatures } from "./riskEngine.js";

function baseFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    accountAgeDays: 120,
    completedRentals: 4,
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

describe("riskEngine.computeRiskDecision", () => {
  it("rejects a blocked user immediately", () => {
    const d = computeRiskDecision(baseFeatures({ priorBlock: true }));
    assert.equal(d.approved, false);
    assert.match(d.rejectionReason ?? "", /blocked/i);
    assert.equal(d.legalCommitmentPct, null);
  });

  it("rejects a user without Nafath verification", () => {
    const d = computeRiskDecision(baseFeatures({ nafathVerified: false }));
    assert.equal(d.approved, false);
    assert.match(d.rejectionReason ?? "", /nafath/i);
  });

  it("rejects a user without KYC verification", () => {
    const d = computeRiskDecision(baseFeatures({ kycVerified: false }));
    assert.equal(d.approved, false);
    assert.match(d.rejectionReason ?? "", /kyc/i);
  });

  it("approves a trusted user at 100% commitment", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 365,
        completedRentals: 10,
        disputedRentals: 0,
      })
    );
    assert.equal(d.approved, true);
    assert.equal(d.legalCommitmentPct, 100);
    assert.equal(d.legalCommitmentHalalas, 500_000);
    assert.ok(d.finalScore >= 70);
  });

  it("uses 150% commitment for first-time renters", () => {
    const d = computeRiskDecision(
      baseFeatures({ accountAgeDays: 10, completedRentals: 0 })
    );
    assert.equal(d.approved, true);
    assert.equal(d.legalCommitmentPct, 150);
    assert.equal(d.legalCommitmentHalalas, 750_000);
  });

  it("stamps a disputed user with a lower score", () => {
    const ok = computeRiskDecision(baseFeatures());
    const disputed = computeRiskDecision(baseFeatures({ disputedRentals: 2 }));
    assert.ok(disputed.finalScore < ok.finalScore);
  });

  it("caps modifiers so score stays in [0,100]", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 400,
        completedRentals: 20,
        phoneVerified: true,
        emailVerified: true,
        requestedAssetValueHalalas: 100, // tiny asset, low penalty
      })
    );
    assert.ok(d.finalScore <= 100);
    assert.ok(d.finalScore >= 0);
  });

  it("auto-rejects when final score falls below hard-reject threshold", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 5,
        completedRentals: 0,
        disputedRentals: 5,
        lateReturns: 5,
        cancelledRentals: 5,
        requestedAssetValueHalalas: 15_000_000, // 150k SAR ultra-high bucket
      })
    );
    assert.equal(d.approved, false);
    assert.equal(d.riskCategory, "ultra_high");
  });

  it("marks a borderline user for manual review", () => {
    const d = computeRiskDecision(
      baseFeatures({
        accountAgeDays: 15,
        completedRentals: 0,
        disputedRentals: 2, // -20
        cancelledRentals: 3, // -8
        requestedAssetValueHalalas: 3_000_000, // 30k SAR → -5
      })
    );
    if (d.approved) {
      assert.equal(d.requiresReview, true);
    }
  });
});

describe("trustScoreToCategory", () => {
  it("maps scores to the expected category", () => {
    assert.equal(trustScoreToCategory(95), "low");
    assert.equal(trustScoreToCategory(70), "medium");
    assert.equal(trustScoreToCategory(40), "high");
    assert.equal(trustScoreToCategory(10), "ultra_high");
  });
});
