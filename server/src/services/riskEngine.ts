/**
 * Dynamic Risk Engine
 *
 * Computes a user's Trust Score (0..100) and decides:
 *  - Whether to approve a rental attempt
 *  - What legal commitment percentage to attach (100% or 150%)
 *  - A risk category (low | medium | high | ultra_high)
 *
 * The engine is deterministic, pure (no DB calls), and accepts a feature
 * snapshot. Fetching the features is the caller's responsibility — this makes
 * the engine trivially unit-testable and rehostable as a worker.
 */

import type { Role } from "../middleware/auth.js";

export interface RiskFeatures {
  accountAgeDays: number;
  completedRentals: number;
  disputedRentals: number;
  cancelledRentals: number;
  lateReturns: number;
  nafathVerified: boolean;
  kycVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  priorBlock: boolean;
  requestedAssetValueHalalas: number;
  userRole: Role;
  countryIsSaudi: boolean;
}

export type RiskCategory = "low" | "medium" | "high" | "ultra_high";

export interface RiskDecision {
  approved: boolean;
  rejectionReason?: string;
  baseScore: number;
  finalScore: number;
  modifiers: Array<{ key: string; delta: number; reason: string }>;
  riskCategory: RiskCategory;
  legalCommitmentPct: 100 | 150 | null;
  legalCommitmentHalalas: number;
  requiresReview: boolean;
  notes: string[];
}

const HARD_REJECT_SCORE = 25;
const MANUAL_REVIEW_SCORE = 40;
const NEW_USER_AGE_DAYS = 30;
const TRUSTED_USER_AGE_DAYS = 90;
const TRUSTED_USER_MIN_RENTALS = 3;

/**
 * Pure risk scoring function. Returns a fully populated decision.
 */
export function computeRiskDecision(f: RiskFeatures): RiskDecision {
  const modifiers: RiskDecision["modifiers"] = [];
  const notes: string[] = [];

  // Hard reject rules ----------------------------------------------------------
  if (f.priorBlock) {
    return {
      approved: false,
      rejectionReason: "User is currently blocked",
      baseScore: 0,
      finalScore: 0,
      modifiers: [],
      riskCategory: "ultra_high",
      legalCommitmentPct: null,
      legalCommitmentHalalas: 0,
      requiresReview: false,
      notes: ["hard_reject:blocked"],
    };
  }
  if (!f.nafathVerified) {
    return {
      approved: false,
      rejectionReason: "Nafath verification required to rent luxury items",
      baseScore: 0,
      finalScore: 0,
      modifiers: [],
      riskCategory: "high",
      legalCommitmentPct: null,
      legalCommitmentHalalas: 0,
      requiresReview: false,
      notes: ["hard_reject:nafath_required"],
    };
  }
  if (!f.kycVerified) {
    return {
      approved: false,
      rejectionReason: "KYC verification required",
      baseScore: 0,
      finalScore: 0,
      modifiers: [],
      riskCategory: "high",
      legalCommitmentPct: null,
      legalCommitmentHalalas: 0,
      requiresReview: false,
      notes: ["hard_reject:kyc_required"],
    };
  }

  // Base score -----------------------------------------------------------------
  // Everyone starts at 50 (neutral), then modifiers push up or down.
  let score = 50;
  const baseScore = score;

  // 1. Account age
  if (f.accountAgeDays >= 365) {
    modifiers.push({ key: "age_365", delta: +15, reason: "Account older than 1 year" });
    score += 15;
  } else if (f.accountAgeDays >= TRUSTED_USER_AGE_DAYS) {
    modifiers.push({ key: "age_90", delta: +8, reason: "Account older than 90 days" });
    score += 8;
  } else if (f.accountAgeDays < NEW_USER_AGE_DAYS) {
    modifiers.push({ key: "age_new", delta: -10, reason: "Account younger than 30 days" });
    score -= 10;
  }

  // 2. Rental history
  if (f.completedRentals >= 10) {
    modifiers.push({ key: "rentals_10", delta: +15, reason: "10+ completed rentals" });
    score += 15;
  } else if (f.completedRentals >= TRUSTED_USER_MIN_RENTALS) {
    modifiers.push({ key: "rentals_3", delta: +8, reason: "3+ completed rentals" });
    score += 8;
  } else if (f.completedRentals === 0) {
    modifiers.push({ key: "rentals_none", delta: -5, reason: "First-time renter" });
    score -= 5;
  }

  // 3. Disputes and late returns
  if (f.disputedRentals > 0) {
    const delta = -10 * f.disputedRentals;
    modifiers.push({ key: "disputes", delta, reason: `${f.disputedRentals} disputed rentals` });
    score += delta;
  }
  if (f.lateReturns > 0) {
    const delta = -5 * f.lateReturns;
    modifiers.push({ key: "late_returns", delta, reason: `${f.lateReturns} late returns` });
    score += delta;
  }

  // 4. Excessive cancellations
  if (f.cancelledRentals >= 3) {
    modifiers.push({ key: "cancellations", delta: -8, reason: "3+ cancellations" });
    score -= 8;
  }

  // 5. Identity / contact verification
  if (f.phoneVerified) {
    modifiers.push({ key: "phone_ok", delta: +2, reason: "Phone verified" });
    score += 2;
  }
  if (f.emailVerified) {
    modifiers.push({ key: "email_ok", delta: +2, reason: "Email verified" });
    score += 2;
  }

  // 6. Geography
  if (!f.countryIsSaudi) {
    modifiers.push({ key: "non_ksa", delta: -10, reason: "Non-KSA registered identity" });
    score -= 10;
  }

  // 7. Asset value bucket risk — expensive items raise the bar.
  const valueSar = f.requestedAssetValueHalalas / 100;
  if (valueSar >= 100_000) {
    modifiers.push({ key: "value_ultra", delta: -10, reason: "Asset value >= 100k SAR" });
    score -= 10;
  } else if (valueSar >= 30_000) {
    modifiers.push({ key: "value_high", delta: -5, reason: "Asset value >= 30k SAR" });
    score -= 5;
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));
  const finalScore = score;

  // Decision -------------------------------------------------------------------
  if (finalScore < HARD_REJECT_SCORE) {
    return {
      approved: false,
      rejectionReason: "Trust score below acceptable threshold",
      baseScore,
      finalScore,
      modifiers,
      riskCategory: "ultra_high",
      legalCommitmentPct: null,
      legalCommitmentHalalas: 0,
      requiresReview: false,
      notes: ["auto_reject:low_score"],
    };
  }

  // Categorization
  let riskCategory: RiskCategory;
  if (finalScore >= 80) riskCategory = "low";
  else if (finalScore >= 60) riskCategory = "medium";
  else if (finalScore >= HARD_REJECT_SCORE) riskCategory = "high";
  else riskCategory = "ultra_high";

  // Legal commitment rule (per product spec):
  //   - New / untrusted users → 150% of item value
  //   - Trusted users → 100% of item value
  const isTrusted =
    f.accountAgeDays >= TRUSTED_USER_AGE_DAYS &&
    f.completedRentals >= TRUSTED_USER_MIN_RENTALS &&
    f.disputedRentals === 0 &&
    finalScore >= 70;

  const legalCommitmentPct: 100 | 150 = isTrusted ? 100 : 150;
  const legalCommitmentHalalas = Math.round(
    (f.requestedAssetValueHalalas * legalCommitmentPct) / 100
  );

  if (isTrusted) notes.push("trusted_user:100pct");
  else notes.push("new_or_untrusted_user:150pct");

  const requiresReview = finalScore < MANUAL_REVIEW_SCORE;
  if (requiresReview) notes.push("manual_review_recommended");

  return {
    approved: true,
    baseScore,
    finalScore,
    modifiers,
    riskCategory,
    legalCommitmentPct,
    legalCommitmentHalalas,
    requiresReview,
    notes,
  };
}

/**
 * Convert a trust score into a category (used for the user's overall
 * profile badge, independent of any single rental attempt).
 */
export function trustScoreToCategory(score: number): RiskCategory {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  if (score >= 25) return "high";
  return "ultra_high";
}
