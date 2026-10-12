/**
 * Overdue rental detection.
 *
 * Scans active rentals whose end date has passed and creates alerts
 * for the operations team. Also updates renter trust scores.
 */

import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  rentals,
  users,
  assets,
  operationalAlerts,
} from "../db/schema.js";
import { notifyLateReturn } from "./notificationService.js";

export interface OverdueRental {
  rentalId: number;
  reference: string;
  renterId: number;
  renterEmail: string;
  renterPhone: string | null;
  assetId: number;
  assetTitle: string;
  endDate: string;
  daysOverdue: number;
}

export async function detectOverdueRentals(): Promise<OverdueRental[]> {
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      rentalId: rentals.id,
      reference: rentals.reference,
      renterId: rentals.renterId,
      renterEmail: users.email,
      renterPhone: users.phoneE164,
      assetId: rentals.assetId,
      assetTitle: assets.title,
      endDate: rentals.endDate,
    })
    .from(rentals)
    .innerJoin(users, eq(users.id, rentals.renterId))
    .innerJoin(assets, eq(assets.id, rentals.assetId))
    .where(
      and(
        eq(rentals.status, "active"),
        lte(rentals.endDate, today)
      )
    );

  const overdue: OverdueRental[] = rows.map((r) => {
    const endMs = new Date(r.endDate + "T00:00:00Z").getTime();
    const todayMs = new Date(today + "T00:00:00Z").getTime();
    const daysOverdue = Math.max(1, Math.round((todayMs - endMs) / (1000 * 60 * 60 * 24)));
    return { ...r, daysOverdue };
  });

  for (const od of overdue) {
    const existingAlert = await db
      .select({ id: operationalAlerts.id })
      .from(operationalAlerts)
      .where(
        and(
          eq(operationalAlerts.type, "late_return"),
          eq(operationalAlerts.subjectType, "rental"),
          eq(operationalAlerts.subjectId, od.rentalId),
          eq(operationalAlerts.status, "open")
        )
      )
      .limit(1);

    if (existingAlert.length === 0) {
      await db.insert(operationalAlerts).values({
        type: "late_return",
        severity: od.daysOverdue >= 7 ? "critical" : od.daysOverdue >= 3 ? "high" : "medium",
        subjectType: "rental",
        subjectId: od.rentalId,
        message: `Rental ${od.reference} is ${od.daysOverdue} day(s) overdue. Asset: ${od.assetTitle}`,
        payloadJson: {
          rentalId: od.rentalId,
          renterId: od.renterId,
          assetId: od.assetId,
          daysOverdue: od.daysOverdue,
          endDate: od.endDate,
        },
      });

      const trustPenalty = Math.min(od.daysOverdue * 2, 20);
      await db
        .update(users)
        .set({
          trustScore: sql`greatest(0, trust_score - ${trustPenalty})`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, od.renterId));

      await notifyLateReturn({
        renterId: od.renterId,
        renterEmail: od.renterEmail,
        renterPhone: od.renterPhone ?? undefined,
        rentalReference: od.reference,
        assetTitle: od.assetTitle,
        daysOverdue: od.daysOverdue,
      });
    }
  }

  return overdue;
}

export async function countLateReturnsForUser(userId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(operationalAlerts)
    .where(
      and(
        eq(operationalAlerts.type, "late_return"),
        eq(operationalAlerts.subjectType, "rental"),
        sql`(payload_json->>'renterId')::int = ${userId}`
      )
    );
  return Number(result?.count ?? 0);
}
