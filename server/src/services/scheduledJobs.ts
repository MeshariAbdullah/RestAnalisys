import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentals, operationalAlerts } from "../db/schema.js";
import { notifyReturnDue, notifyOverdue } from "./notificationService.js";

export async function detectLateReturns(): Promise<{ overdue: number; dueSoon: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const overdueRentals = await db
    .select({
      id: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      endDate: rentals.endDate,
    })
    .from(rentals)
    .where(and(eq(rentals.status, "active"), lte(rentals.endDate, today)));

  let overdueCount = 0;
  for (const rental of overdueRentals) {
    const daysPast = Math.floor(
      (Date.now() - new Date(rental.endDate + "T00:00:00Z").getTime()) / 86400000
    );

    const [existingAlert] = await db
      .select({ id: operationalAlerts.id })
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "late_return"),
          eq(operationalAlerts.subjectId, rental.id),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (!existingAlert) {
      await db.insert(operationalAlerts).values({
        type: "late_return",
        severity: daysPast >= 7 ? "critical" : daysPast >= 3 ? "high" : "medium",
        subjectType: "rental",
        subjectId: rental.id,
        message: `Rental ${rental.reference} is ${daysPast} day(s) overdue.`,
        payloadJson: { daysPast, endDate: rental.endDate },
      });
    }

    await notifyOverdue(rental.id, rental.renterId, rental.reference, daysPast);
    overdueCount++;
  }

  const dueSoonRentals = await db
    .select({
      id: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      endDate: rentals.endDate,
    })
    .from(rentals)
    .where(and(eq(rentals.status, "active"), eq(rentals.endDate, tomorrow)));

  let dueSoonCount = 0;
  for (const rental of dueSoonRentals) {
    await notifyReturnDue(rental.id, rental.renterId, rental.reference, rental.endDate);
    dueSoonCount++;
  }

  return { overdue: overdueCount, dueSoon: dueSoonCount };
}

export function startScheduledJobs(): void {
  console.log("  Scheduled jobs: late return detection (every 6 hours)");

  setInterval(async () => {
    try {
      const result = await detectLateReturns();
      if (result.overdue > 0 || result.dueSoon > 0) {
        console.log(
          `[CRON] Late returns: ${result.overdue} overdue, ${result.dueSoon} due tomorrow`
        );
      }
    } catch (err) {
      console.error("[CRON] Error in late return detection:", err);
    }
  }, 6 * 60 * 60 * 1000);

  setTimeout(() => detectLateReturns().catch(console.error), 30_000);
}
