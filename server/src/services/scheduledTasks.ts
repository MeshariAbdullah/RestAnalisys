import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentals, users, operationalAlerts } from "../db/schema.js";
import { trustScoreToCategory } from "./riskEngine.js";

const OVERDUE_TRUST_PENALTY = 5;

export async function detectOverdueRentals(): Promise<{
  overdueCount: number;
  alertsCreated: number;
  trustUpdated: number;
}> {
  const overdueRentals = await db
    .select()
    .from(rentals)
    .where(
      and(
        eq(rentals.status, "active"),
        sql`end_date < current_date`
      )
    );

  let alertsCreated = 0;
  let trustUpdated = 0;

  for (const rental of overdueRentals) {
    const existingAlerts = await db
      .select({ id: operationalAlerts.id })
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "late_return"),
          eq(operationalAlerts.subjectType, "rental"),
          eq(operationalAlerts.subjectId, rental.id)
        )
      )
      .limit(1);

    if (existingAlerts.length === 0) {
      await db.insert(operationalAlerts).values({
        type: "late_return",
        severity: "high",
        subjectType: "rental",
        subjectId: rental.id,
        message: `Rental ${rental.reference} is overdue. End date was ${rental.endDate}.`,
        payloadJson: {
          rentalId: rental.id,
          renterId: rental.renterId,
          endDate: rental.endDate,
        },
      });
      alertsCreated++;

      const [renter] = await db
        .select({ id: users.id, trustScore: users.trustScore })
        .from(users)
        .where(eq(users.id, rental.renterId))
        .limit(1);

      if (renter) {
        const newScore = Math.max(0, renter.trustScore - OVERDUE_TRUST_PENALTY);
        await db
          .update(users)
          .set({
            trustScore: newScore,
            riskCategory: trustScoreToCategory(newScore),
            updatedAt: new Date(),
          })
          .where(eq(users.id, renter.id));
        trustUpdated++;
      }
    }
  }

  return {
    overdueCount: overdueRentals.length,
    alertsCreated,
    trustUpdated,
  };
}
