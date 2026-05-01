import { db } from "../db/index.js";
import { rentals, sanadRecords, operationalAlerts, users } from "../db/schema.js";
import { and, eq, lte, sql, inArray } from "drizzle-orm";
import { notifyLateReturn } from "./notificationService.js";

const INTERVALS = {
  overdueCheck: 60 * 60 * 1000,       // every hour
  sanadMaturityCheck: 6 * 60 * 60 * 1000, // every 6 hours
  trustScoreDecay: 24 * 60 * 60 * 1000,   // daily
};

async function checkOverdueRentals(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const overdueRentals = await db
    .select({
      id: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      endDate: rentals.endDate,
      assetId: rentals.assetId,
    })
    .from(rentals)
    .where(
      and(
        eq(rentals.status, "active"),
        lte(rentals.endDate, today)
      )
    );

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

    if (existing.length === 0) {
      const daysLate = Math.floor(
        (Date.now() - new Date(rental.endDate + "T00:00:00Z").getTime()) / (1000 * 60 * 60 * 24)
      );

      await db.insert(operationalAlerts).values({
        type: "late_return",
        severity: daysLate >= 7 ? "critical" : daysLate >= 3 ? "high" : "medium",
        subjectType: "rental",
        subjectId: rental.id,
        message: `Rental ${rental.reference} is ${daysLate} day(s) overdue. End date: ${rental.endDate}.`,
        payloadJson: { rentalId: rental.id, renterId: rental.renterId, daysLate, endDate: rental.endDate },
      });

      await notifyLateReturn(rental.renterId, rental.reference, rental.endDate).catch(() => {});
    }
  }

  if (overdueRentals.length > 0) {
    console.log(`[scheduler] Found ${overdueRentals.length} overdue rental(s)`);
  }
}

async function checkSanadMaturity(): Promise<void> {
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const maturingSanads = await db
    .select({
      id: sanadRecords.id,
      rentalId: sanadRecords.rentalId,
      renterId: sanadRecords.renterId,
      maturityDate: sanadRecords.maturityDate,
      principalHalalas: sanadRecords.principalHalalas,
    })
    .from(sanadRecords)
    .where(
      and(
        inArray(sanadRecords.status, ["active", "signed"]),
        lte(sanadRecords.maturityDate, threeDaysFromNow)
      )
    );

  for (const sanad of maturingSanads) {
    const existing = await db
      .select({ id: operationalAlerts.id })
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "sanad_overdue"),
          eq(operationalAlerts.subjectType, "rental"),
          eq(operationalAlerts.subjectId, sanad.rentalId),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(operationalAlerts).values({
        type: "sanad_overdue",
        severity: "high",
        subjectType: "rental",
        subjectId: sanad.rentalId,
        message: `Sanad #${sanad.id} for rental ${sanad.rentalId} matures on ${sanad.maturityDate}.`,
        payloadJson: { sanadId: sanad.id, rentalId: sanad.rentalId, maturityDate: sanad.maturityDate },
      });
    }
  }

  if (maturingSanads.length > 0) {
    console.log(`[scheduler] Found ${maturingSanads.length} sanad(s) approaching maturity`);
  }
}

async function decayTrustScores(): Promise<void> {
  const result = await db
    .update(users)
    .set({
      trustScore: sql`GREATEST(0, trust_score - 1)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.isBlocked, true),
        sql`trust_score > 0`
      )
    );

  console.log("[scheduler] Trust score decay completed for blocked users");
}

let timers: NodeJS.Timeout[] = [];

export function startScheduler(): void {
  console.log("[scheduler] Starting background scheduler");

  timers.push(
    setInterval(() => {
      checkOverdueRentals().catch((err) => console.error("[scheduler] overdueCheck error:", err));
    }, INTERVALS.overdueCheck)
  );

  timers.push(
    setInterval(() => {
      checkSanadMaturity().catch((err) => console.error("[scheduler] sanadMaturity error:", err));
    }, INTERVALS.sanadMaturityCheck)
  );

  timers.push(
    setInterval(() => {
      decayTrustScores().catch((err) => console.error("[scheduler] trustDecay error:", err));
    }, INTERVALS.trustScoreDecay)
  );

  // Run overdue check on startup after a short delay
  setTimeout(() => {
    checkOverdueRentals().catch((err) => console.error("[scheduler] initial overdueCheck error:", err));
    checkSanadMaturity().catch((err) => console.error("[scheduler] initial sanadMaturity error:", err));
  }, 5000);
}

export function stopScheduler(): void {
  timers.forEach(clearInterval);
  timers = [];
  console.log("[scheduler] Scheduler stopped");
}
