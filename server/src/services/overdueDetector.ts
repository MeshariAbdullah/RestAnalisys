import { db } from "../db/index.js";
import { rentals, operationalAlerts } from "../db/schema.js";
import { and, eq, sql, inArray } from "drizzle-orm";
import { sendNotification } from "./notificationService.js";

export async function detectOverdueRentals(): Promise<number> {
  const overdueRows = await db
    .select()
    .from(rentals)
    .where(
      and(
        inArray(rentals.status, ["active"]),
        sql`end_date::date < current_date`
      )
    );

  let alertCount = 0;

  for (const rental of overdueRows) {
    const existing = await db
      .select({ id: operationalAlerts.id })
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.subjectType, "rental"),
          eq(operationalAlerts.subjectId, rental.id),
          eq(operationalAlerts.type, "late_return"),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (existing.length > 0) continue;

    const daysOverdue = Math.floor(
      (Date.now() - new Date(rental.endDate + "T00:00:00Z").getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const severity = daysOverdue >= 7 ? "critical" : daysOverdue >= 3 ? "high" : "medium";

    await db.insert(operationalAlerts).values({
      type: "late_return",
      severity,
      subjectType: "rental",
      subjectId: rental.id,
      message: `Rental ${rental.reference} is ${daysOverdue} day(s) overdue. Renter ID: ${rental.renterId}.`,
      payloadJson: {
        rentalId: rental.id,
        reference: rental.reference,
        renterId: rental.renterId,
        endDate: rental.endDate,
        daysOverdue,
      },
    });

    await sendNotification({
      userId: rental.renterId,
      type: "rental_overdue",
      title: "Rental Overdue",
      body: `Your rental ${rental.reference} is ${daysOverdue} day(s) past the return date. Please return the item immediately to avoid penalties.`,
      metadata: { rentalId: rental.id, daysOverdue },
    });

    alertCount++;
  }

  if (alertCount > 0) {
    console.log(`[overdue-detector] Created ${alertCount} overdue alert(s)`);
  }

  return alertCount;
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startOverdueDetector(intervalMs = 60 * 60 * 1000): void {
  console.log(`[overdue-detector] Starting (interval: ${intervalMs / 1000}s)`);
  detectOverdueRentals().catch((err) =>
    console.error("[overdue-detector] initial run failed:", err)
  );
  intervalHandle = setInterval(() => {
    detectOverdueRentals().catch((err) =>
      console.error("[overdue-detector] scheduled run failed:", err)
    );
  }, intervalMs);
}

export function stopOverdueDetector(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
