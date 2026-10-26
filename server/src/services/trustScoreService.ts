import { eq, sql, and, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, rentals } from "../db/schema.js";
import { trustScoreToCategory, type RiskCategory } from "./riskEngine.js";

interface TrustScoreUpdate {
  userId: number;
  newScore: number;
  newCategory: RiskCategory;
  reason: string;
}

export async function updateTrustScoreAfterRental(
  renterId: number,
  outcome: "clean" | "penalty" | "major_damage" | "loss" | "cancelled" | "dispute"
): Promise<TrustScoreUpdate> {
  const [user] = await db.select().from(users).where(eq(users.id, renterId)).limit(1);
  if (!user) throw new Error(`User ${renterId} not found`);

  let delta = 0;
  let reason = "";

  switch (outcome) {
    case "clean":
      delta = +3;
      reason = "Rental closed cleanly";
      break;
    case "penalty":
      delta = -5;
      reason = "Rental closed with penalty (minor damage)";
      break;
    case "major_damage":
      delta = -15;
      reason = "Rental closed with major damage";
      break;
    case "loss":
      delta = -25;
      reason = "Asset lost or destroyed during rental";
      break;
    case "cancelled":
      delta = -2;
      reason = "Rental cancelled by renter";
      break;
    case "dispute":
      delta = -8;
      reason = "Dispute opened against renter";
      break;
  }

  const newScore = Math.max(0, Math.min(100, user.trustScore + delta));
  const newCategory = trustScoreToCategory(newScore);

  await db
    .update(users)
    .set({
      trustScore: newScore,
      riskCategory: newCategory,
      updatedAt: new Date(),
    })
    .where(eq(users.id, renterId));

  return { userId: renterId, newScore, newCategory, reason };
}

export async function computeLateReturns(userId: number): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(rentals)
    .where(
      and(
        eq(rentals.renterId, userId),
        inArray(rentals.status, ["closed", "closed_with_penalty"]),
        sql`returned_at > (end_date::timestamp + interval '1 day')`
      )
    );
  return Number(result[0]?.count ?? 0);
}
