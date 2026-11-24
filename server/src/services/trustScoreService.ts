import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentals, users } from "../db/schema.js";
import { trustScoreToCategory } from "./riskEngine.js";

export async function updateTrustScore(userId: number): Promise<void> {
  const [user] = await db
    .select({
      nafathVerified: users.nafathVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return;

  const stats = await db
    .select({
      completed: sql<number>`count(*) filter (where status in ('closed','closed_with_penalty'))`,
      disputed: sql<number>`count(*) filter (where status in ('in_dispute','enforcement'))`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
    })
    .from(rentals)
    .where(eq(rentals.renterId, userId));

  const row = stats[0] ?? { completed: 0, disputed: 0, cancelled: 0 };
  const completed = Number(row.completed ?? 0);
  const disputed = Number(row.disputed ?? 0);
  const cancelled = Number(row.cancelled ?? 0);

  const lateReturnRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(rentals)
    .where(
      and(
        eq(rentals.renterId, userId),
        sql`returned_at IS NOT NULL AND returned_at::date > end_date::date`
      )
    );
  const lateReturns = Number(lateReturnRows[0]?.count ?? 0);

  const accountAgeDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  let score = 50;
  score += Math.min(completed * 3, 30);
  score -= disputed * 10;
  score -= lateReturns * 5;
  score -= Math.min(cancelled * 3, 15);
  if (user.nafathVerified) score += 10;
  if (accountAgeDays > 90) score += 5;
  score = Math.max(0, Math.min(100, score));

  const riskCategory = trustScoreToCategory(score);

  await db
    .update(users)
    .set({ trustScore: score, riskCategory, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
