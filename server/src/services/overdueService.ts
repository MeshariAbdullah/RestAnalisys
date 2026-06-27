import { db } from "../db/index.js";
import { rentals, operationalAlerts } from "../db/schema.js";
import { and, eq, inArray, sql, lt } from "drizzle-orm";
import { notifyOverdueReturn } from "./notificationService.js";

export interface OverdueRental {
  id: number;
  reference: string;
  renterId: number;
  ownerId: number;
  assetId: number;
  endDate: string;
  daysOverdue: number;
  status: string;
  totalPayableHalalas: number;
  legalCommitmentHalalas: number;
}

export async function detectOverdueRentals(): Promise<OverdueRental[]> {
  const rows = await db
    .select({
      id: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      ownerId: rentals.ownerId,
      assetId: rentals.assetId,
      endDate: rentals.endDate,
      status: rentals.status,
      totalPayableHalalas: rentals.totalPayableHalalas,
      legalCommitmentHalalas: rentals.legalCommitmentHalalas,
    })
    .from(rentals)
    .where(
      and(
        inArray(rentals.status, ["active", "return_in_transit"]),
        lt(rentals.endDate, sql`current_date`)
      )
    );

  return rows.map((r) => {
    const endMs = new Date(r.endDate + "T00:00:00Z").getTime();
    const nowMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
    const daysOverdue = Math.max(0, Math.floor((nowMs - endMs) / (1000 * 60 * 60 * 24)));
    return { ...r, daysOverdue };
  });
}

export async function processOverdueRentals(): Promise<{
  detected: number;
  alertsCreated: number;
  notificationsSent: number;
}> {
  const overdue = await detectOverdueRentals();
  let alertsCreated = 0;
  let notificationsSent = 0;

  for (const rental of overdue) {
    const [existing] = await db
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

    if (!existing) {
      const severity = rental.daysOverdue >= 7 ? "critical" : rental.daysOverdue >= 3 ? "high" : "medium";

      await db.insert(operationalAlerts).values({
        type: "late_return",
        severity,
        subjectType: "rental",
        subjectId: rental.id,
        message: `Rental ${rental.reference} is ${rental.daysOverdue} day(s) overdue. End date was ${rental.endDate}.`,
        payloadJson: {
          rentalId: rental.id,
          reference: rental.reference,
          renterId: rental.renterId,
          daysOverdue: rental.daysOverdue,
          endDate: rental.endDate,
        },
      });
      alertsCreated++;
    }

    if (rental.daysOverdue >= 1) {
      await notifyOverdueReturn(rental.renterId, rental.reference, rental.daysOverdue);
      notificationsSent++;
    }
  }

  return { detected: overdue.length, alertsCreated, notificationsSent };
}

export async function countLateReturns(userId: number): Promise<number> {
  const [result] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(rentals)
    .where(
      and(
        eq(rentals.renterId, userId),
        inArray(rentals.status, [
          "closed",
          "closed_with_penalty",
          "under_inspection",
          "return_in_transit",
        ]),
        sql`returned_at is not null`,
        sql`returned_at::date > end_date::date`
      )
    );

  return Number(result?.count ?? 0);
}
