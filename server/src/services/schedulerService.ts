import { db } from "../db/index.js";
import { rentals, operationalAlerts, users, sanadRecords } from "../db/schema.js";
import { and, eq, lt, inArray, sql } from "drizzle-orm";
import { notifyOverdueRental } from "./notificationService.js";

const OVERDUE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SANAD_MATURITY_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function checkOverdueRentals(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const overdueRentals = await db
    .select({
      id: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      endDate: rentals.endDate,
    })
    .from(rentals)
    .where(
      and(
        inArray(rentals.status, ["active", "return_in_transit"]),
        lt(rentals.endDate, today)
      )
    );

  let alertCount = 0;
  for (const rental of overdueRentals) {
    const daysPastDue = Math.floor(
      (Date.now() - new Date(rental.endDate + "T00:00:00Z").getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const existingAlert = await db
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

    if (existingAlert.length === 0) {
      await db.insert(operationalAlerts).values({
        type: "late_return",
        severity: daysPastDue >= 7 ? "critical" : daysPastDue >= 3 ? "high" : "medium",
        subjectType: "rental",
        subjectId: rental.id,
        message: `Rental ${rental.reference} is ${daysPastDue} day(s) overdue.`,
        payloadJson: { rentalId: rental.id, daysPastDue, endDate: rental.endDate },
      });

      notifyOverdueRental(rental.renterId, rental.reference, daysPastDue).catch(() => {});
      alertCount++;
    }
  }

  return alertCount;
}

async function checkSanadMaturity(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const maturingSanads = await db
    .select({
      id: sanadRecords.id,
      rentalId: sanadRecords.rentalId,
      nafithReference: sanadRecords.nafithReference,
      maturityDate: sanadRecords.maturityDate,
      principalHalalas: sanadRecords.principalHalalas,
    })
    .from(sanadRecords)
    .where(
      and(
        inArray(sanadRecords.status, ["active", "signed"]),
        lt(sanadRecords.maturityDate, today)
      )
    );

  let alertCount = 0;
  for (const sanad of maturingSanads) {
    await db
      .update(sanadRecords)
      .set({ status: "matured", updatedAt: new Date() })
      .where(eq(sanadRecords.id, sanad.id));

    await db.insert(operationalAlerts).values({
      type: "sanad_matured",
      severity: "high",
      subjectType: "rental",
      subjectId: sanad.rentalId,
      message: `Sanad ${sanad.nafithReference} has matured. Review for discharge or execution.`,
      payloadJson: { sanadId: sanad.id, nafithReference: sanad.nafithReference },
    });
    alertCount++;
  }

  return alertCount;
}

async function updateUserTrustScores(): Promise<void> {
  await db.execute(sql`
    UPDATE users u SET
      trust_score = LEAST(100, GREATEST(0,
        50
        + CASE WHEN EXTRACT(EPOCH FROM now() - u.created_at) / 86400 >= 365 THEN 15
               WHEN EXTRACT(EPOCH FROM now() - u.created_at) / 86400 >= 90 THEN 8
               WHEN EXTRACT(EPOCH FROM now() - u.created_at) / 86400 < 30 THEN -10
               ELSE 0 END
        + LEAST(15, COALESCE((SELECT count(*) * 3 FROM rentals r WHERE r.renter_id = u.id AND r.status IN ('closed','closed_with_penalty')), 0))
        - COALESCE((SELECT count(*) * 10 FROM rentals r WHERE r.renter_id = u.id AND r.status IN ('in_dispute','enforcement')), 0)
        + CASE WHEN u.phone_verified THEN 2 ELSE 0 END
        + CASE WHEN u.email_verified THEN 2 ELSE 0 END
      )),
      risk_category = CASE
        WHEN LEAST(100, GREATEST(0, 50 + CASE WHEN EXTRACT(EPOCH FROM now() - u.created_at) / 86400 >= 90 THEN 8 ELSE 0 END)) >= 80 THEN 'low'
        WHEN LEAST(100, GREATEST(0, 50)) >= 60 THEN 'medium'
        WHEN LEAST(100, GREATEST(0, 50)) >= 25 THEN 'high'
        ELSE 'ultra_high'
      END,
      updated_at = now()
    WHERE u.role IN ('renter', 'owner')
  `);
}

let overdueInterval: ReturnType<typeof setInterval> | null = null;
let sanadInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  console.log("[scheduler] Starting scheduled tasks...");

  checkOverdueRentals()
    .then((n) => console.log(`[scheduler] Initial overdue check: ${n} new alerts`))
    .catch((err) => console.error("[scheduler] Overdue check failed:", err));

  overdueInterval = setInterval(() => {
    checkOverdueRentals().catch((err) =>
      console.error("[scheduler] Overdue check failed:", err)
    );
  }, OVERDUE_CHECK_INTERVAL_MS);

  sanadInterval = setInterval(() => {
    checkSanadMaturity().catch((err) =>
      console.error("[scheduler] Sanad maturity check failed:", err)
    );
  }, SANAD_MATURITY_CHECK_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (overdueInterval) clearInterval(overdueInterval);
  if (sanadInterval) clearInterval(sanadInterval);
  overdueInterval = null;
  sanadInterval = null;
  console.log("[scheduler] Stopped.");
}

export { checkOverdueRentals, checkSanadMaturity, updateUserTrustScores };
