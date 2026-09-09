import { describe, it, expect } from "vitest";
import {
  computeRiskDecision,
  trustScoreToCategory,
  RiskFeatures,
} from "../riskEngine.js";

function makeFeatures(overrides: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    accountAgeDays: 180,
    completedRentals: 5,
    disputedRentals: 0,
    cancelledRentals: 0,
    lateReturns: 0,
    nafathVerified: true,
    kycVerified: true,
    phoneVerified: true,
    emailVerified: true,
    priorBlock: false,
    requestedAssetValueHalalas: 500000, // 5000 SAR
    userRole: "renter",
    countryIsSaudi: true,
    ...overrides,
  };
}

// ── Hard reject rules ──────────────────────────────────────────────────────

describe("computeRiskDecision – hard rejects", () => {
  it("rejects a blocked user with 'User is currently blocked'", () => {
    const d = computeRiskDecision(makeFeatures({ priorBlock: true }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toBe("User is currently blocked");
    expect(d.riskCategory).toBe("ultra_high");
    expect(d.finalScore).toBe(0);
  });

  it("rejects unverified Nafath", () => {
    const d = computeRiskDecision(makeFeatures({ nafathVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("Nafath verification required");
    expect(d.riskCategory).toBe("high");
  });

  it("rejects unverified KYC", () => {
    const d = computeRiskDecision(makeFeatures({ kycVerified: false }));
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("KYC verification required");
    expect(d.riskCategory).toBe("high");
  });
});

// ── Base score ─────────────────────────────────────────────────────────────

describe("computeRiskDecision – base score", () => {
  it("starts at 50", () => {
    const d = computeRiskDecision(makeFeatures());
    expect(d.baseScore).toBe(50);
  });
});

// ── Account age modifiers ──────────────────────────────────────────────────

describe("computeRiskDecision – account age", () => {
  it("applies -10 when account is younger than 30 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 15 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_new");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(-10);
  });

  it("applies +8 when account is >= 90 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 90 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_90");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(8);
  });

  it("applies +15 when account is >= 365 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 400 }));
    const ageMod = d.modifiers.find((m) => m.key === "age_365");
    expect(ageMod).toBeDefined();
    expect(ageMod!.delta).toBe(15);
  });

  it("applies no age modifier between 30 and 89 days", () => {
    const d = computeRiskDecision(makeFeatures({ accountAgeDays: 60 }));
    const ageMods = d.modifiers.filter((m) => m.key.startsWith("age_"));
    expect(ageMods).toHaveLength(0);
  });
});

// ── Rental history modifiers ───────────────────────────────────────────────

describe("computeRiskDecision – rental history", () => {
  it("applies -5 for 0 completed rentals (first-time renter)", () => {
    const d = computeRiskDecision(makeFeatures({ completedRentals: 0 }));
    const mod = d.modifiers.find((m) => m.key === "rentals_none");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });

  it("applies +8 for >= 3 completed rentals", () => {
    const d = computeRiskDecision(makeFeatures({ completedRentals: 3 }));
    const mod = d.modifiers.find((m) => m.key === "rentals_3");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(8);
  });

  it("applies +15 for >= 10 completed rentals", () => {
    const d = computeRiskDecision(makeFeatures({ completedRentals: 10 }));
    const mod = d.modifiers.find((m) => m.key === "rentals_10");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(15);
  });

  it("applies no rental modifier for 1-2 completed rentals", () => {
    const d = computeRiskDecision(makeFeatures({ completedRentals: 2 }));
    const rentalMods = d.modifiers.filter((m) => m.key.startsWith("rentals_"));
    expect(rentalMods).toHaveLength(0);
  });
});

// ── Disputes ───────────────────────────────────────────────────────────────

describe("computeRiskDecision – disputes", () => {
  it("applies -10 per disputed rental", () => {
    const d = computeRiskDecision(makeFeatures({ disputedRentals: 2 }));
    const mod = d.modifiers.find((m) => m.key === "disputes");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-20);
  });

  it("applies no dispute modifier when 0 disputes", () => {
    const d = computeRiskDecision(makeFeatures({ disputedRentals: 0 }));
    const mod = d.modifiers.find((m) => m.key === "disputes");
    expect(mod).toBeUndefined();
  });
});

// ── Late returns ───────────────────────────────────────────────────────────

describe("computeRiskDecision – late returns", () => {
  it("applies -5 per late return", () => {
    const d = computeRiskDecision(makeFeatures({ lateReturns: 3 }));
    const mod = d.modifiers.find((m) => m.key === "late_returns");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-15);
  });

  it("applies no late return modifier when 0", () => {
    const d = computeRiskDecision(makeFeatures({ lateReturns: 0 }));
    const mod = d.modifiers.find((m) => m.key === "late_returns");
    expect(mod).toBeUndefined();
  });
});

// ── Cancellations ──────────────────────────────────────────────────────────

describe("computeRiskDecision – cancellations", () => {
  it("applies -8 when cancellations >= 3", () => {
    const d = computeRiskDecision(makeFeatures({ cancelledRentals: 3 }));
    const mod = d.modifiers.find((m) => m.key === "cancellations");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-8);
  });

  it("applies no cancellation modifier when < 3", () => {
    const d = computeRiskDecision(makeFeatures({ cancelledRentals: 2 }));
    const mod = d.modifiers.find((m) => m.key === "cancellations");
    expect(mod).toBeUndefined();
  });
});

// ── Verification modifiers ─────────────────────────────────────────────────

describe("computeRiskDecision – verification", () => {
  it("applies +2 for phone verified", () => {
    const d = computeRiskDecision(makeFeatures({ phoneVerified: true }));
    const mod = d.modifiers.find((m) => m.key === "phone_ok");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(2);
  });

  it("applies +2 for email verified", () => {
    const d = computeRiskDecision(makeFeatures({ emailVerified: true }));
    const mod = d.modifiers.find((m) => m.key === "email_ok");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(2);
  });

  it("does not apply phone modifier when not verified", () => {
    const d = computeRiskDecision(makeFeatures({ phoneVerified: false }));
    const mod = d.modifiers.find((m) => m.key === "phone_ok");
    expect(mod).toBeUndefined();
  });

  it("does not apply email modifier when not verified", () => {
    const d = computeRiskDecision(makeFeatures({ emailVerified: false }));
    const mod = d.modifiers.find((m) => m.key === "email_ok");
    expect(mod).toBeUndefined();
  });
});

// ── Geography ──────────────────────────────────────────────────────────────

describe("computeRiskDecision – geography", () => {
  it("applies -10 for non-Saudi identity", () => {
    const d = computeRiskDecision(makeFeatures({ countryIsSaudi: false }));
    const mod = d.modifiers.find((m) => m.key === "non_ksa");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("does not apply geography modifier for Saudi identity", () => {
    const d = computeRiskDecision(makeFeatures({ countryIsSaudi: true }));
    const mod = d.modifiers.find((m) => m.key === "non_ksa");
    expect(mod).toBeUndefined();
  });
});

// ── Asset value ────────────────────────────────────────────────────────────

describe("computeRiskDecision – asset value", () => {
  it("applies -5 for asset value >= 30k SAR", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 3_000_000 }) // 30,000 SAR
    );
    const mod = d.modifiers.find((m) => m.key === "value_high");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-5);
  });

  it("applies -10 for asset value >= 100k SAR", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 10_000_000 }) // 100,000 SAR
    );
    const mod = d.modifiers.find((m) => m.key === "value_ultra");
    expect(mod).toBeDefined();
    expect(mod!.delta).toBe(-10);
  });

  it("applies no value modifier for asset value < 30k SAR", () => {
    const d = computeRiskDecision(
      makeFeatures({ requestedAssetValueHalalas: 2_000_000 }) // 20,000 SAR
    );
    const valueMods = d.modifiers.filter((m) => m.key.startsWith("value_"));
    expect(valueMods).toHaveLength(0);
  });
});

// ── Score clamping ─────────────────────────────────────────────────────────

describe("computeRiskDecision – score clamping", () => {
  it("clamps score to 0 when modifiers would push below 0", () => {
    // Create an extremely bad profile: many disputes, late returns, etc.
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,        // -10
        completedRentals: 0,       // -5
        disputedRentals: 5,        // -50
        lateReturns: 5,            // -25
        cancelledRentals: 5,       // -8
        phoneVerified: false,      // no +2
        emailVerified: false,      // no +2
        countryIsSaudi: false,     // -10
        requestedAssetValueHalalas: 10_000_000, // -10
      })
    );
    // base 50 - 10 - 5 - 50 - 25 - 8 - 10 - 10 = -68, clamped to 0
    expect(d.finalScore).toBe(0);
    expect(d.finalScore).toBeGreaterThanOrEqual(0);
  });

  it("clamps score to 100 when modifiers would push above 100", () => {
    // Even with all positive modifiers, the max realistic score shouldn't exceed 100
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 400,       // +15
        completedRentals: 15,      // +15
        phoneVerified: true,       // +2
        emailVerified: true,       // +2
      })
    );
    // base 50 + 15 + 15 + 2 + 2 = 84
    expect(d.finalScore).toBeLessThanOrEqual(100);
  });
});

// ── Auto-reject on low score ───────────────────────────────────────────────

describe("computeRiskDecision – auto-reject threshold", () => {
  it("auto-rejects when score < 25", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,          // -10
        completedRentals: 0,        // -5
        disputedRentals: 2,         // -20
        phoneVerified: false,       // no +2
        emailVerified: false,       // no +2
      })
    );
    // base 50 - 10 - 5 - 20 = 15 < 25
    expect(d.finalScore).toBeLessThan(25);
    expect(d.approved).toBe(false);
    expect(d.rejectionReason).toContain("Trust score below");
    expect(d.riskCategory).toBe("ultra_high");
  });

  it("approves when score >= 25", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,          // -10
        completedRentals: 0,        // -5
        disputedRentals: 1,         // -10
        phoneVerified: true,        // +2
        emailVerified: true,        // +2
      })
    );
    // base 50 - 10 - 5 - 10 + 2 + 2 = 29 >= 25
    expect(d.finalScore).toBeGreaterThanOrEqual(25);
    expect(d.approved).toBe(true);
  });
});

// ── Risk categories ────────────────────────────────────────────────────────

describe("computeRiskDecision – risk categories", () => {
  it("assigns 'low' for score >= 80", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 400,       // +15
        completedRentals: 15,      // +15
      })
    );
    // base 50 + 15 + 15 + 2 + 2 = 84
    expect(d.finalScore).toBeGreaterThanOrEqual(80);
    expect(d.riskCategory).toBe("low");
  });

  it("assigns 'medium' for score >= 60 and < 80", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 180,       // +8
        completedRentals: 5,       // +8
        phoneVerified: false,      // no +2
        emailVerified: false,      // no +2
      })
    );
    // base 50 + 8 + 8 = 66
    expect(d.finalScore).toBeGreaterThanOrEqual(60);
    expect(d.finalScore).toBeLessThan(80);
    expect(d.riskCategory).toBe("medium");
  });

  it("assigns 'high' for score >= 25 and < 60", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,          // -10
        completedRentals: 0,        // -5
        phoneVerified: true,        // +2
        emailVerified: true,        // +2
      })
    );
    // base 50 - 10 - 5 + 2 + 2 = 39
    expect(d.finalScore).toBeGreaterThanOrEqual(25);
    expect(d.finalScore).toBeLessThan(60);
    expect(d.riskCategory).toBe("high");
  });
});

// ── Legal commitment ───────────────────────────────────────────────────────

describe("computeRiskDecision – legal commitment", () => {
  it("sets 100% for trusted user (90+ days, 3+ rentals, 0 disputes, score >= 70)", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 180,       // +8
        completedRentals: 5,       // +8
        disputedRentals: 0,
        phoneVerified: true,       // +2
        emailVerified: true,       // +2
        requestedAssetValueHalalas: 500000,
      })
    );
    // base 50 + 8 + 8 + 2 + 2 = 70
    expect(d.finalScore).toBeGreaterThanOrEqual(70);
    expect(d.legalCommitmentPct).toBe(100);
    expect(d.legalCommitmentHalalas).toBe(500000); // 100% of 5000 SAR
  });

  it("sets 150% for untrusted user", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 60,        // no age modifier
        completedRentals: 2,       // no rental modifier
        requestedAssetValueHalalas: 500000,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
    expect(d.legalCommitmentHalalas).toBe(750000); // 150% of 5000 SAR
  });

  it("sets 150% when user has disputes even if other criteria met", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 180,
        completedRentals: 5,
        disputedRentals: 1,        // disqualifies from trusted
        requestedAssetValueHalalas: 500000,
      })
    );
    expect(d.legalCommitmentPct).toBe(150);
  });

  it("sets null commitment for hard-rejected users", () => {
    const d = computeRiskDecision(makeFeatures({ priorBlock: true }));
    expect(d.legalCommitmentPct).toBeNull();
    expect(d.legalCommitmentHalalas).toBe(0);
  });
});

// ── Manual review flag ─────────────────────────────────────────────────────

describe("computeRiskDecision – manual review", () => {
  it("flags manual review when score < 40", () => {
    const d = computeRiskDecision(
      makeFeatures({
        accountAgeDays: 5,          // -10
        completedRentals: 0,        // -5
        phoneVerified: true,        // +2
        emailVerified: true,        // +2
      })
    );
    // base 50 - 10 - 5 + 2 + 2 = 39
    expect(d.finalScore).toBeLessThan(40);
    expect(d.requiresReview).toBe(true);
  });

  it("does not flag manual review when score >= 40", () => {
    const d = computeRiskDecision(makeFeatures());
    expect(d.finalScore).toBeGreaterThanOrEqual(40);
    expect(d.requiresReview).toBe(false);
  });
});

// ── Default features integration test ──────────────────────────────────────

describe("computeRiskDecision – default features integration", () => {
  it("approves a healthy user profile", () => {
    const d = computeRiskDecision(makeFeatures());
    expect(d.approved).toBe(true);
    // base 50 + 8 (age 180d) + 8 (5 rentals) + 2 (phone) + 2 (email) = 70
    expect(d.finalScore).toBe(70);
    expect(d.riskCategory).toBe("medium");
  });
});

// ── trustScoreToCategory ───────────────────────────────────────────────────

describe("trustScoreToCategory", () => {
  it("returns 'low' for score >= 80", () => {
    expect(trustScoreToCategory(80)).toBe("low");
    expect(trustScoreToCategory(100)).toBe("low");
  });

  it("returns 'medium' for score >= 60 and < 80", () => {
    expect(trustScoreToCategory(60)).toBe("medium");
    expect(trustScoreToCategory(79)).toBe("medium");
  });

  it("returns 'high' for score >= 25 and < 60", () => {
    expect(trustScoreToCategory(25)).toBe("high");
    expect(trustScoreToCategory(59)).toBe("high");
  });

  it("returns 'ultra_high' for score < 25", () => {
    expect(trustScoreToCategory(24)).toBe("ultra_high");
    expect(trustScoreToCategory(0)).toBe("ultra_high");
  });
});
