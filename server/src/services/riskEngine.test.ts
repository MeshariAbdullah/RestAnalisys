/**
 * Risk Engine unit tests.
 *
 * Pure unit tests — no DB, no framework. Run with:
 *   npm run test
 * which is `tsx src/services/riskEngine.test.ts`. Exits non-zero on failure.
 */

import assert from "node:assert/strict";
import { computeRiskDecision, RiskFeatures, trustScoreToCategory } from "./riskEngine.js";

function features(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
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
    requestedAssetValueHalalas: 10_000 * 100, // 10 000 SAR
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

let failures = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ok  — ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL — ${name}`);
    console.error(err);
  }
}

console.log("Risk Engine");

test("hard-rejects blocked users", () => {
  const d = computeRiskDecision(features({ priorBlock: true }));
  assert.equal(d.approved, false);
  assert.equal(d.rejectionReason, "User is currently blocked");
  assert.equal(d.riskCategory, "ultra_high");
});

test("hard-rejects users without Nafath", () => {
  const d = computeRiskDecision(features({ nafathVerified: false }));
  assert.equal(d.approved, false);
  assert.match(d.rejectionReason ?? "", /Nafath/);
});

test("hard-rejects users without KYC", () => {
  const d = computeRiskDecision(features({ kycVerified: false }));
  assert.equal(d.approved, false);
  assert.match(d.rejectionReason ?? "", /KYC/);
});

test("trusted user gets 100% legal commitment", () => {
  const d = computeRiskDecision(
    features({ accountAgeDays: 200, completedRentals: 5, disputedRentals: 0 })
  );
  assert.equal(d.approved, true);
  assert.equal(d.legalCommitmentPct, 100);
  assert.equal(
    d.legalCommitmentHalalas,
    features().requestedAssetValueHalalas
  );
});

test("new untrusted user gets 150% legal commitment", () => {
  const d = computeRiskDecision(
    features({ accountAgeDays: 10, completedRentals: 0 })
  );
  assert.equal(d.approved, true);
  assert.equal(d.legalCommitmentPct, 150);
  assert.equal(
    d.legalCommitmentHalalas,
    Math.round((features().requestedAssetValueHalalas * 150) / 100)
  );
});

test("late returns reduce trust score", () => {
  const base = computeRiskDecision(features({ lateReturns: 0 }));
  const withLate = computeRiskDecision(features({ lateReturns: 2 }));
  assert.equal(base.approved, true);
  assert.equal(withLate.approved, true);
  // Each late return = -5 points => 2 late returns = -10 points less
  assert.equal(withLate.finalScore, base.finalScore - 10);
  assert.ok(
    withLate.modifiers.some((m) => m.key === "late_returns"),
    "expected late_returns modifier"
  );
});

test("disputes reduce trust score aggressively", () => {
  const base = computeRiskDecision(features({ disputedRentals: 0 }));
  const disputed = computeRiskDecision(features({ disputedRentals: 3 }));
  // Each dispute = -10 points
  assert.equal(disputed.finalScore, base.finalScore - 30);
});

test("asset value over 100k SAR penalizes score", () => {
  const cheap = computeRiskDecision(features({ requestedAssetValueHalalas: 5_000 * 100 }));
  const ultra = computeRiskDecision(
    features({ requestedAssetValueHalalas: 150_000 * 100 })
  );
  assert.ok(
    ultra.finalScore < cheap.finalScore,
    "ultra-value rental should score lower"
  );
  assert.ok(
    ultra.modifiers.some((m) => m.key === "value_ultra"),
    "expected value_ultra modifier"
  );
});

test("auto-rejects below score 25", () => {
  const d = computeRiskDecision(
    features({
      accountAgeDays: 5,
      completedRentals: 0,
      disputedRentals: 5,
      lateReturns: 3,
      cancelledRentals: 4,
      phoneVerified: false,
      emailVerified: false,
      requestedAssetValueHalalas: 200_000 * 100,
      countryIsSaudi: false,
    })
  );
  assert.equal(d.approved, false);
  assert.equal(d.riskCategory, "ultra_high");
});

test("trustScoreToCategory bands", () => {
  assert.equal(trustScoreToCategory(95), "low");
  assert.equal(trustScoreToCategory(80), "low");
  assert.equal(trustScoreToCategory(79), "medium");
  assert.equal(trustScoreToCategory(60), "medium");
  assert.equal(trustScoreToCategory(59), "high");
  assert.equal(trustScoreToCategory(25), "high");
  assert.equal(trustScoreToCategory(24), "ultra_high");
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll risk engine tests passed.");
