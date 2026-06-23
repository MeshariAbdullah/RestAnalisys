import { db } from "../db/index.js";
import { rentals, users, operationalAlerts } from "../db/schema.js";
import { and, eq, lt, sql } from "drizzle-orm";
import { notifyRentalEvent } from "./notificationService.js";
import { formatHalalas } from "../utils/money.js";
import { logger } from "../utils/logger.js";

export async function checkLateReturns(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const overdueRentals = await db
    .select({
      id: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      endDate: rentals.endDate,
      totalPayableHalalas: rentals.totalPayableHalalas,
    })
    .from(rentals)
    .where(
      and(
        eq(rentals.status, "active"),
        lt(rentals.endDate, today)
      )
    );

  let alertsCreated = 0;

  for (const rental of overdueRentals) {
    const existing = await db
      .select({ id: operationalAlerts.id })
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "late_return"),
          eq(operationalAlerts.subjectType, "rental"),
          eq(operationalAlerts.subjectId, rental.id),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (existing.length > 0) continue;

    const daysLate = Math.floor(
      (new Date(today).getTime() - new Date(rental.endDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    await db.insert(operationalAlerts).values({
      type: "late_return",
      severity: daysLate >= 7 ? "critical" : daysLate >= 3 ? "high" : "medium",
      subjectType: "rental",
      subjectId: rental.id,
      message: `Rental ${rental.reference} is ${daysLate} day(s) overdue. End date was ${rental.endDate}.`,
      payloadJson: { rentalId: rental.id, daysLate, endDate: rental.endDate },
    });

    const [renter] = await db
      .select({ email: users.email, phoneE164: users.phoneE164, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, rental.renterId))
      .limit(1);

    if (renter) {
      try {
        await notifyRentalEvent("late_return_warning", {
          email: renter.email,
          phoneE164: renter.phoneE164 ?? undefined,
          fullName: renter.fullName,
        }, {
          rentalReference: rental.reference,
          daysLate: String(daysLate),
          amount: formatHalalas(rental.totalPayableHalalas),
        });
      } catch {
        logger.warn("Failed to send late return notification", { rentalId: rental.id });
      }
    }

    alertsCreated++;
  }

  if (alertsCreated > 0) {
    logger.info(`Late return check: ${alertsCreated} new alert(s) created`);
  }

  return alertsCreated;
}

export async function checkSanadMaturities(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const result = await db.execute(sql`
    SELECT sr.id, sr.rental_id, sr.maturity_date, sr.principal_halalas, r.reference
    FROM sanad_records sr
    JOIN rentals r ON r.id = sr.rental_id
    WHERE sr.status = 'active'
      AND sr.maturity_date <= ${today}
  `);

  let alertsCreated = 0;

  for (const row of result.rows) {
    const existing = await db
      .select({ id: operationalAlerts.id })
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "sanad_overdue"),
          eq(operationalAlerts.subjectType, "rental"),
          eq(operationalAlerts.subjectId, row.rental_id as number),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(operationalAlerts).values({
      type: "sanad_overdue",
      severity: "critical",
      subjectType: "rental",
      subjectId: row.rental_id as number,
      message: `Sanad for rental ${row.reference} has matured (${row.maturity_date}). Action required.`,
      payloadJson: { sanadId: row.id, rentalId: row.rental_id, maturityDate: row.maturity_date },
    });

    alertsCreated++;
  }

  if (alertsCreated > 0) {
    logger.info(`Sanad maturity check: ${alertsCreated} new alert(s) created`);
  }

  return alertsCreated;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startScheduledTasks(): void {
  const intervalMs = parseInt(process.env.TASK_INTERVAL_MS ?? "3600000"); // default: 1 hour
  logger.info(`Scheduled tasks started (interval: ${intervalMs / 1000}s)`);

  const runAll = async () => {
    try {
      await checkLateReturns();
      await checkSanadMaturities();
    } catch (err) {
      logger.error("Scheduled task failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  runAll();
  intervalId = setInterval(runAll, intervalMs);
}

export function stopScheduledTasks(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
