import { Router } from "express";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentals, users, operationalAlerts } from "../db/schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notifyUser } from "../services/notificationService.js";

const router = Router();

const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET ?? "dev-scheduler-secret";

function requireSchedulerAuth(req: any, res: any, next: any) {
  const token = req.headers["x-scheduler-token"] as string;
  if (token !== SCHEDULER_SECRET) {
    return res.status(401).json({ error: "Invalid scheduler token" });
  }
  next();
}

router.post(
  "/check-overdue",
  requireSchedulerAuth,
  asyncHandler(async (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const overdueRentals = await db
      .select({
        id: rentals.id,
        reference: rentals.reference,
        renterId: rentals.renterId,
        endDate: rentals.endDate,
        dailyPriceHalalas: rentals.dailyPriceHalalas,
      })
      .from(rentals)
      .where(
        and(
          eq(rentals.status, "active"),
          lte(rentals.endDate, today)
        )
      );

    let notified = 0;
    let alertsCreated = 0;

    for (const rental of overdueRentals) {
      const endMs = new Date(rental.endDate + "T23:59:59Z").getTime();
      const lateDays = Math.ceil((Date.now() - endMs) / (1000 * 60 * 60 * 24));

      const [renter] = await db.select().from(users).where(eq(users.id, rental.renterId)).limit(1);
      if (!renter) continue;

      if (lateDays === 1) {
        await notifyUser({
          userId: rental.renterId,
          phone: renter.phoneE164,
          email: renter.email,
          category: "late_return_alert",
          vars: { reference: rental.reference },
        });
        notified++;
      } else if (lateDays > 0 && lateDays % 3 === 0) {
        await notifyUser({
          userId: rental.renterId,
          phone: renter.phoneE164,
          email: renter.email,
          category: "late_return_alert",
          vars: { reference: rental.reference },
        });
        notified++;
      }

      if (lateDays === 1 || lateDays === 3 || lateDays === 7) {
        await db.insert(operationalAlerts).values({
          type: "late_return",
          severity: lateDays >= 7 ? "critical" : lateDays >= 3 ? "high" : "medium",
          subjectType: "rental",
          subjectId: rental.id,
          message: `Rental ${rental.reference} is ${lateDays} day(s) overdue.`,
          payloadJson: { rentalId: rental.id, lateDays, renterId: rental.renterId },
        });
        alertsCreated++;
      }
    }

    const dueSoon = await db
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
          sql`end_date = ${new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}`
        )
      );

    let warnings = 0;
    for (const rental of dueSoon) {
      const [renter] = await db.select().from(users).where(eq(users.id, rental.renterId)).limit(1);
      if (!renter) continue;

      await notifyUser({
        userId: rental.renterId,
        phone: renter.phoneE164,
        email: renter.email,
        category: "late_return_warning",
        vars: { reference: rental.reference, endDate: rental.endDate },
      });
      warnings++;
    }

    res.json({
      overdue: overdueRentals.length,
      notified,
      alertsCreated,
      dueSoonWarnings: warnings,
      checkedAt: new Date().toISOString(),
    });
  })
);

export default router;
