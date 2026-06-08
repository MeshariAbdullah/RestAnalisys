import { and, eq, lt, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentals, operationalAlerts, users } from "../db/schema.js";
import { notify } from "./notificationService.js";

export async function detectOverdueRentals(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const overdueRentals = await db
    .select({
      id: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      ownerId: rentals.ownerId,
      assetId: rentals.assetId,
      endDate: rentals.endDate,
      status: rentals.status,
    })
    .from(rentals)
    .where(
      and(
        inArray(rentals.status, ["active", "out_for_delivery"]),
        lt(rentals.endDate, today)
      )
    );

  let alertsCreated = 0;

  for (const rental of overdueRentals) {
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

    if (existing) continue;

    const daysOverdue = Math.ceil(
      (Date.now() - new Date(rental.endDate + "T00:00:00Z").getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const severity = daysOverdue >= 7 ? "critical" : daysOverdue >= 3 ? "high" : "medium";

    await db.insert(operationalAlerts).values({
      type: "late_return",
      severity,
      subjectType: "rental",
      subjectId: rental.id,
      message: `Rental ${rental.reference} is ${daysOverdue} day(s) overdue. Asset must be recovered.`,
      payloadJson: { rentalId: rental.id, daysOverdue, endDate: rental.endDate },
    });

    await notify({
      userId: rental.renterId,
      type: "overdue_warning",
      title: "Overdue rental",
      titleAr: "إيجار متأخر",
      body: `Your rental ${rental.reference} is ${daysOverdue} day(s) overdue. Please return the item immediately to avoid penalties.`,
      bodyAr: `إيجارك ${rental.reference} متأخر ${daysOverdue} يوم/أيام. يرجى إعادة العنصر فوراً لتجنب الغرامات.`,
      referenceType: "rental",
      referenceId: rental.id,
    });

    await notify({
      userId: rental.ownerId,
      type: "overdue_warning",
      title: "Asset return overdue",
      titleAr: "تأخر إعادة الأصل",
      body: `The renter for rental ${rental.reference} is ${daysOverdue} day(s) overdue. Our team is following up.`,
      bodyAr: `المستأجر لإيجار ${rental.reference} متأخر ${daysOverdue} يوم/أيام. فريقنا يتابع.`,
      referenceType: "rental",
      referenceId: rental.id,
    });

    alertsCreated++;
  }

  return alertsCreated;
}

export async function detectUpcomingReturns(): Promise<number> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const upcomingReturns = await db
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
        eq(rentals.endDate, tomorrowStr)
      )
    );

  for (const rental of upcomingReturns) {
    await notify({
      userId: rental.renterId,
      type: "rental_status",
      title: "Return reminder",
      titleAr: "تذكير بالإعادة",
      body: `Your rental ${rental.reference} ends tomorrow. Please prepare the item for return.`,
      bodyAr: `ينتهي إيجارك ${rental.reference} غداً. يرجى تجهيز العنصر للإعادة.`,
      referenceType: "rental",
      referenceId: rental.id,
    });
  }

  return upcomingReturns.length;
}
