import { db } from "../db/index.js";
import { sanadRecords, rentals, operationalAlerts, users } from "../db/schema.js";
import { eq, and, lte, sql, ne } from "drizzle-orm";
import { sendNotification } from "./notificationService.js";

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startScheduler(): void {
  console.log("[scheduler] Starting background job scheduler");

  setInterval(async () => {
    try {
      await checkSanadMaturity();
      await checkLateReturns();
      await checkOverduePayments();
    } catch (err) {
      console.error("[scheduler] job cycle failed:", err);
    }
  }, CHECK_INTERVAL_MS);

  setTimeout(async () => {
    try {
      await checkSanadMaturity();
      await checkLateReturns();
      await checkOverduePayments();
    } catch (err) {
      console.error("[scheduler] initial run failed:", err);
    }
  }, 10_000);
}

async function checkSanadMaturity(): Promise<void> {
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + 7);

  const approachingMaturity = await db
    .select()
    .from(sanadRecords)
    .where(
      and(
        sql`status IN ('active', 'signed')`,
        lte(sanadRecords.maturityDate, warningDate.toISOString().split("T")[0])
      )
    );

  for (const sanad of approachingMaturity) {
    const existingAlert = await db
      .select()
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "sanad_overdue"),
          eq(operationalAlerts.subjectType, "sanad"),
          eq(operationalAlerts.subjectId, sanad.id),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (existingAlert.length === 0) {
      await db.insert(operationalAlerts).values({
        type: "sanad_overdue",
        severity: "high",
        subjectType: "sanad",
        subjectId: sanad.id,
        message: `Sanad ${sanad.nafithReference ?? sanad.id} approaching maturity (${sanad.maturityDate})`,
        payloadJson: { sanadId: sanad.id, rentalId: sanad.rentalId, maturityDate: sanad.maturityDate },
      });

      await sendNotification({
        type: "sanad_maturity_warning",
        recipientUserId: sanad.renterId,
        data: { reference: sanad.nafithReference, maturityDate: sanad.maturityDate },
      }).catch(() => {});
    }
  }

  if (approachingMaturity.length > 0) {
    console.log(`[scheduler] Sanad maturity: ${approachingMaturity.length} approaching`);
  }
}

async function checkLateReturns(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const lateRentals = await db
    .select()
    .from(rentals)
    .where(
      and(
        eq(rentals.status, "active"),
        sql`end_date < ${today}`
      )
    );

  for (const rental of lateRentals) {
    const existingAlert = await db
      .select()
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
        severity: "high",
        subjectType: "rental",
        subjectId: rental.id,
        message: `Rental ${rental.reference} is overdue (end date: ${rental.endDate})`,
        payloadJson: { rentalId: rental.id, renterId: rental.renterId, endDate: rental.endDate },
      });

      await sendNotification({
        type: "late_return_warning",
        recipientUserId: rental.renterId,
        data: { reference: rental.reference },
      }).catch(() => {});
    }
  }

  if (lateRentals.length > 0) {
    console.log(`[scheduler] Late returns: ${lateRentals.length} overdue`);
  }
}

async function checkOverduePayments(): Promise<void> {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const staleRentals = await db
    .select()
    .from(rentals)
    .where(
      and(
        eq(rentals.status, "pending_payment"),
        lte(rentals.updatedAt, twoDaysAgo)
      )
    );

  for (const rental of staleRentals) {
    const existingAlert = await db
      .select()
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "payment_failed"),
          eq(operationalAlerts.subjectType, "rental"),
          eq(operationalAlerts.subjectId, rental.id),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (existingAlert.length === 0) {
      await db.insert(operationalAlerts).values({
        type: "payment_failed",
        severity: "medium",
        subjectType: "rental",
        subjectId: rental.id,
        message: `Rental ${rental.reference} has been pending payment for over 48 hours`,
        payloadJson: { rentalId: rental.id, renterId: rental.renterId },
      });
    }
  }
}
