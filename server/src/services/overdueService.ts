import { and, eq, lt, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentals, users, operationalAlerts } from "../db/schema.js";
import { notifyOverdueReturn } from "./notificationService.js";

export interface OverdueRental {
  rentalId: number;
  reference: string;
  renterId: number;
  assetId: number;
  endDate: string;
  daysOverdue: number;
}

export async function detectOverdueRentals(): Promise<OverdueRental[]> {
  const today = new Date().toISOString().slice(0, 10);

  const overdueRows = await db
    .select({
      id: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      assetId: rentals.assetId,
      endDate: rentals.endDate,
    })
    .from(rentals)
    .where(
      and(
        inArray(rentals.status, ["active", "return_in_transit"]),
        lt(rentals.endDate, today)
      )
    );

  const results: OverdueRental[] = [];

  for (const row of overdueRows) {
    const endMs = new Date(row.endDate + "T00:00:00Z").getTime();
    const todayMs = new Date(today + "T00:00:00Z").getTime();
    const daysOverdue = Math.floor((todayMs - endMs) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) continue;

    results.push({
      rentalId: row.id,
      reference: row.reference,
      renterId: row.renterId,
      assetId: row.assetId,
      endDate: row.endDate,
      daysOverdue,
    });

    const [existingAlert] = await db
      .select({ id: operationalAlerts.id })
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "late_return"),
          eq(operationalAlerts.subjectType, "rental"),
          eq(operationalAlerts.subjectId, row.id),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (!existingAlert) {
      await db.insert(operationalAlerts).values({
        type: "late_return",
        severity: daysOverdue >= 7 ? "critical" : daysOverdue >= 3 ? "high" : "medium",
        subjectType: "rental",
        subjectId: row.id,
        message: `Rental ${row.reference} is ${daysOverdue} day(s) overdue. End date was ${row.endDate}.`,
        payloadJson: { rentalId: row.id, daysOverdue, endDate: row.endDate },
      });

      const [renter] = await db
        .select({ id: users.id, email: users.email, phoneE164: users.phoneE164 })
        .from(users)
        .where(eq(users.id, row.renterId))
        .limit(1);

      if (renter) {
        await notifyOverdueReturn(renter, row.reference, daysOverdue);
      }
    }
  }

  return results;
}

export async function countLateReturns(userId: number): Promise<number> {
  const rows = await db
    .select({
      id: rentals.id,
      endDate: rentals.endDate,
      returnedAt: rentals.returnedAt,
    })
    .from(rentals)
    .where(
      and(
        eq(rentals.renterId, userId),
        inArray(rentals.status, [
          "closed",
          "closed_with_penalty",
          "under_inspection",
          "active",
          "return_in_transit",
        ])
      )
    );

  let late = 0;
  for (const row of rows) {
    if (!row.returnedAt && !row.endDate) continue;

    const endDate = new Date(row.endDate + "T23:59:59Z").getTime();
    const returnDate = row.returnedAt
      ? new Date(row.returnedAt).getTime()
      : Date.now();

    if (returnDate > endDate) late++;
  }

  return late;
}
