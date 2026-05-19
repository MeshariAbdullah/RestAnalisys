/**
 * Trust Score Service
 *
 * Recalculates a user's trust score based on their full rental history
 * and identity verification status. Called after a rental is closed to
 * keep the user's profile risk category up to date.
 *
 * Scoring mirrors the Risk Engine's modifier logic but operates on the
 * user's aggregate profile rather than a single rental attempt.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, rentals } from "../db/schema.js";
import { NotFoundError } from "../utils/errors.js";
import type { RiskCategory } from "./riskEngine.js";

function scoreToCategory(score: number): RiskCategory {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  if (score >= 25) return "high";
  return "ultra_high";
}

/**
 * Recalculate and persist a user's trust score based on their complete
 * rental history and verification status.
 */
export async function recalculateTrustScore(
  userId: number
): Promise<{ trustScore: number; riskCategory: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new NotFoundError("User");

  // Aggregate rental history
  const stats = await db
    .select({
      completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
      disputed: sql<number>`count(*) filter (where status in ('in_dispute','enforcement'))`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
      lateReturns: sql<number>`count(*) filter (where returned_at is not null and returned_at > (end_date::timestamp + interval '1 day'))`,
    })
    .from(rentals)
    .where(eq(rentals.renterId, userId));
  const row = stats[0] ?? { completed: 0, disputed: 0, cancelled: 0, lateReturns: 0 };

  const completedRentals = Number(row.completed ?? 0);
  const disputedRentals = Number(row.disputed ?? 0);
  const cancelledRentals = Number(row.cancelled ?? 0);
  const lateReturns = Number(row.lateReturns ?? 0);

  const accountAgeDays = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  // Base score
  let score = 50;

  // 1. Account age
  if (accountAgeDays >= 365) {
    score += 15;
  } else if (accountAgeDays >= 90) {
    score += 8;
  } else if (accountAgeDays < 30) {
    score -= 10;
  }

  // 2. Rental history
  if (completedRentals >= 10) {
    score += 15;
  } else if (completedRentals >= 3) {
    score += 8;
  } else if (completedRentals === 0) {
    score -= 5;
  }

  // 3. Disputes
  score -= 10 * disputedRentals;

  // 4. Late returns
  score -= 5 * lateReturns;

  // 5. Excessive cancellations
  if (cancelledRentals >= 3) {
    score -= 8;
  }

  // 6. Identity / contact verification
  if (user.nafathVerified) {
    score += 5;
  }
  if (user.kycStatus === "verified") {
    score += 3;
  }
  if (user.phoneVerified) {
    score += 2;
  }
  if (user.emailVerified) {
    score += 2;
  }

  // 7. Blocked users are clamped to 0
  if (user.isBlocked) {
    score = 0;
  }

  // Clamp to 0..100
  score = Math.max(0, Math.min(100, score));

  const riskCategory = scoreToCategory(score);

  // Persist
  await db
    .update(users)
    .set({
      trustScore: score,
      riskCategory,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { trustScore: score, riskCategory };
}
