/**
 * Background scheduler — runs periodic platform health tasks.
 *
 * Jobs:
 *  1. Detect overdue rentals and generate operational alerts
 *  2. Flag Sanads approaching maturity
 *  3. Detect stale shipments
 */

import cron from "node-cron";
import { db } from "../db/index.js";
import { rentals, users, operationalAlerts, sanadRecords, shipments } from "../db/schema.js";
import { and, eq, lt, sql, not, inArray } from "drizzle-orm";
import { notifyOverdueRental } from "./notificationService.js";

async function detectOverdueRentals(): Promise<void> {
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
        eq(rentals.status, "active"),
        sql`${rentals.endDate}::date < ${today}::date`
      )
    );

  for (const rental of overdueRentals) {
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

    if (existingAlert.length > 0) continue;

    const daysPastDue = Math.floor(
      (new Date(today).getTime() - new Date(rental.endDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const severity = daysPastDue >= 7 ? "critical" : daysPastDue >= 3 ? "high" : "medium";

    await db.insert(operationalAlerts).values({
      type: "late_return",
      severity,
      subjectType: "rental",
      subjectId: rental.id,
      message: `Rental ${rental.reference} is ${daysPastDue} day(s) overdue.`,
      payloadJson: { rentalId: rental.id, daysPastDue, endDate: rental.endDate },
    });

    const [renter] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, rental.renterId))
      .limit(1);

    if (renter) {
      await notifyOverdueRental(renter.email, rental.reference, daysPastDue).catch((err) =>
        console.error(`[SCHEDULER] Failed to notify renter for ${rental.reference}:`, err)
      );
    }

    console.log(`[SCHEDULER] Alert created: ${rental.reference} overdue by ${daysPastDue}d (${severity})`);
  }
}

async function detectStaleSanads(): Promise<void> {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const cutoff = threeDaysFromNow.toISOString().slice(0, 10);

  const approachingSanads = await db
    .select({
      id: sanadRecords.id,
      rentalId: sanadRecords.rentalId,
      maturityDate: sanadRecords.maturityDate,
    })
    .from(sanadRecords)
    .where(
      and(
        inArray(sanadRecords.status, ["active", "signed"]),
        sql`${sanadRecords.maturityDate}::date <= ${cutoff}::date`
      )
    );

  for (const sanad of approachingSanads) {
    const exists = await db
      .select({ id: operationalAlerts.id })
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

    if (exists.length > 0) continue;

    await db.insert(operationalAlerts).values({
      type: "sanad_overdue",
      severity: "high",
      subjectType: "sanad",
      subjectId: sanad.id,
      message: `Sanad #${sanad.id} (Rental #${sanad.rentalId}) is approaching maturity on ${sanad.maturityDate}.`,
      payloadJson: { sanadId: sanad.id, rentalId: sanad.rentalId, maturityDate: sanad.maturityDate },
    });
  }
}

async function detectStaleShipments(): Promise<void> {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const stale = await db
    .select({
      id: shipments.id,
      assetId: shipments.assetId,
      rentalId: shipments.rentalId,
      status: shipments.status,
    })
    .from(shipments)
    .where(
      and(
        inArray(shipments.status, ["scheduled", "picked_up", "in_transit"]),
        lt(shipments.updatedAt, twoDaysAgo)
      )
    );

  for (const shipment of stale) {
    const exists = await db
      .select({ id: operationalAlerts.id })
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "stale_shipment"),
          eq(operationalAlerts.subjectType, "shipment"),
          eq(operationalAlerts.subjectId, shipment.id),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (exists.length > 0) continue;

    await db.insert(operationalAlerts).values({
      type: "stale_shipment",
      severity: "medium",
      subjectType: "shipment",
      subjectId: shipment.id,
      message: `Shipment #${shipment.id} has been in "${shipment.status}" for over 48 hours.`,
      payloadJson: { shipmentId: shipment.id, currentStatus: shipment.status },
    });
  }
}

export function startScheduler(): void {
  // Run overdue detection every hour
  cron.schedule("0 * * * *", async () => {
    console.log("[SCHEDULER] Running overdue rental detection...");
    try {
      await detectOverdueRentals();
    } catch (err) {
      console.error("[SCHEDULER] Overdue detection failed:", err);
    }
  });

  // Run Sanad maturity check daily at 8 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("[SCHEDULER] Running Sanad maturity check...");
    try {
      await detectStaleSanads();
    } catch (err) {
      console.error("[SCHEDULER] Sanad check failed:", err);
    }
  });

  // Run stale shipment check every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    console.log("[SCHEDULER] Running stale shipment check...");
    try {
      await detectStaleShipments();
    } catch (err) {
      console.error("[SCHEDULER] Stale shipment check failed:", err);
    }
  });

  console.log("   Scheduler: active (overdue hourly, sanads daily, shipments 6h)");
}
