import { eq, sql, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, rentals } from "../db/schema.js";
import { trustScoreToCategory } from "./riskEngine.js";

export async function recalculateTrustScore(userId: number): Promise<{ score: number; category: string }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { score: 50, category: "medium" };

  const [stats] = await db
    .select({
      completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
      disputed: sql<number>`count(*) filter (where status in ('in_dispute','enforcement'))`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
      total: sql<number>`count(*)`,
    })
    .from(rentals)
    .where(eq(rentals.renterId, userId));

  const completed = Number(stats?.completed ?? 0);
  const disputed = Number(stats?.disputed ?? 0);
  const cancelled = Number(stats?.cancelled ?? 0);

  let score = 50;

  // Account age bonus
  const ageDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (ageDays >= 365) score += 12;
  else if (ageDays >= 90) score += 6;
  else if (ageDays < 30) score -= 5;

  // Good rental history
  if (completed >= 10) score += 15;
  else if (completed >= 5) score += 10;
  else if (completed >= 3) score += 6;

  // Negative history
  score -= disputed * 10;
  score -= cancelled >= 3 ? 8 : 0;

  // Verification bonuses
  if (user.nafathVerified) score += 5;
  if (user.phoneVerified) score += 2;
  if (user.emailVerified) score += 2;

  score = Math.max(0, Math.min(100, score));
  const category = trustScoreToCategory(score);

  await db
    .update(users)
    .set({ trustScore: score, riskCategory: category, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { score, category };
}
