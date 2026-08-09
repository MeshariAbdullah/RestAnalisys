import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, rentals } from "../db/schema.js";
import { trustScoreToCategory } from "./riskEngine.js";

export async function recalculateTrustScore(userId: number): Promise<{ score: number; category: string }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { score: 50, category: "medium" };

  const stats = await db
    .select({
      completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
      disputed: sql<number>`count(*) filter (where status in ('in_dispute','enforcement'))`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
      lateReturns: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty') and returned_at > (end_date::timestamp + interval '1 day'))`,
    })
    .from(rentals)
    .where(eq(rentals.renterId, userId));

  const row = stats[0] ?? { completed: 0, disputed: 0, cancelled: 0, lateReturns: 0 };
  const completed = Number(row.completed ?? 0);
  const disputed = Number(row.disputed ?? 0);
  const cancelled = Number(row.cancelled ?? 0);
  const lateReturns = Number(row.lateReturns ?? 0);

  const accountAgeDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  let score = 50;

  if (accountAgeDays >= 365) score += 15;
  else if (accountAgeDays >= 90) score += 8;
  else if (accountAgeDays < 30) score -= 10;

  if (completed >= 10) score += 15;
  else if (completed >= 3) score += 8;
  else if (completed === 0) score -= 5;

  if (disputed > 0) score -= 10 * disputed;
  if (lateReturns > 0) score -= 5 * lateReturns;
  if (cancelled >= 3) score -= 8;

  if (user.phoneVerified) score += 2;
  if (user.emailVerified) score += 2;
  if (user.nafathVerified) score += 5;

  score = Math.max(0, Math.min(100, score));
  const category = trustScoreToCategory(score);

  await db
    .update(users)
    .set({ trustScore: score, riskCategory: category, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { score, category };
}
