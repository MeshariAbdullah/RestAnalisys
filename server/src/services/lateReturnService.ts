import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentals, users, operationalAlerts } from "../db/schema.js";
import { notify, NotificationTypes } from "./notificationService.js";

export async function detectLateReturns(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const lateRentals = await db
    .select({
      id: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      ownerId: rentals.ownerId,
      assetId: rentals.assetId,
      endDate: rentals.endDate,
    })
    .from(rentals)
    .where(
      and(
        eq(rentals.status, "active"),
        lt(rentals.endDate, today)
      )
    );

  for (const rental of lateRentals) {
    const existingAlert = await db
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

    if (existingAlert.length > 0) continue;

    await db.insert(operationalAlerts).values({
      type: "late_return",
      severity: "high",
      subjectType: "rental",
      subjectId: rental.id,
      message: `Rental ${rental.reference} is past due (end date: ${rental.endDate}).`,
      payloadJson: { rentalId: rental.id, endDate: rental.endDate },
    });

    await notify({
      userId: rental.renterId,
      type: NotificationTypes.RENTAL_LATE_RETURN,
      title: "Late Return Notice",
      body: `Your rental ${rental.reference} is past its return date (${rental.endDate}). Please return the item immediately to avoid penalties.`,
      relatedEntityType: "rental",
      relatedEntityId: rental.id,
      actionUrl: `/my-rentals`,
    });

    await notify({
      userId: rental.ownerId,
      type: NotificationTypes.RENTAL_LATE_RETURN,
      title: "Late Return on Your Item",
      body: `Rental ${rental.reference} is past its return date. Our team is following up with the renter.`,
      relatedEntityType: "rental",
      relatedEntityId: rental.id,
      actionUrl: `/owner`,
    });
  }

  return lateRentals.length;
}

export async function countLateReturnsForUser(userId: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rentals)
    .where(
      and(
        eq(rentals.renterId, userId),
        eq(rentals.status, "active"),
        lt(rentals.endDate, today)
      )
    );

  return Number(result?.count ?? 0);
}
