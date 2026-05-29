import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { rentals, operationalAlerts, users } from "../db/schema.js";
import { recordAudit } from "./auditService.js";

async function detectOverdueRentals(): Promise<number> {
  const overdueRentals = await db
    .select({ id: rentals.id, reference: rentals.reference, renterId: rentals.renterId, endDate: rentals.endDate })
    .from(rentals)
    .where(
      and(
        eq(rentals.status, "active"),
        sql`end_date < current_date`
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

    const daysLate = Math.floor(
      (Date.now() - new Date(rental.endDate + "T00:00:00Z").getTime()) / (1000 * 60 * 60 * 24)
    );

    await db.insert(operationalAlerts).values({
      type: "late_return",
      severity: daysLate > 7 ? "critical" : daysLate > 3 ? "high" : "medium",
      subjectType: "rental",
      subjectId: rental.id,
      message: `Rental ${rental.reference} is ${daysLate} day(s) overdue. Renter #${rental.renterId}.`,
      payloadJson: { rentalId: rental.id, daysLate, renterId: rental.renterId },
    });

    alertsCreated++;
  }

  return alertsCreated;
}

async function updateUserTrustScores(): Promise<number> {
  const result = await db.execute(sql`
    update users u
    set trust_score = greatest(0, least(100,
      50
      + case when extract(day from now() - u.created_at) >= 365 then 15
             when extract(day from now() - u.created_at) >= 90 then 8
             when extract(day from now() - u.created_at) < 30 then -10
             else 0 end
      + case when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) >= 10 then 15
             when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) >= 3 then 8
             when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) = 0 then -5
             else 0 end
      - coalesce((select count(*) * 10 from rentals r where r.renter_id = u.id and r.status in ('in_dispute','enforcement')), 0)
      + case when u.phone_verified then 2 else 0 end
      + case when u.email_verified then 2 else 0 end
    )),
    risk_category = case
      when greatest(0, least(100,
        50
        + case when extract(day from now() - u.created_at) >= 365 then 15
               when extract(day from now() - u.created_at) >= 90 then 8
               when extract(day from now() - u.created_at) < 30 then -10
               else 0 end
        + case when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) >= 10 then 15
               when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) >= 3 then 8
               when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) = 0 then -5
               else 0 end
        - coalesce((select count(*) * 10 from rentals r where r.renter_id = u.id and r.status in ('in_dispute','enforcement')), 0)
        + case when u.phone_verified then 2 else 0 end
        + case when u.email_verified then 2 else 0 end
      )) >= 80 then 'low'
      when greatest(0, least(100,
        50
        + case when extract(day from now() - u.created_at) >= 365 then 15
               when extract(day from now() - u.created_at) >= 90 then 8
               when extract(day from now() - u.created_at) < 30 then -10
               else 0 end
        + case when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) >= 10 then 15
               when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) >= 3 then 8
               when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) = 0 then -5
               else 0 end
        - coalesce((select count(*) * 10 from rentals r where r.renter_id = u.id and r.status in ('in_dispute','enforcement')), 0)
        + case when u.phone_verified then 2 else 0 end
        + case when u.email_verified then 2 else 0 end
      )) >= 60 then 'medium'
      when greatest(0, least(100,
        50
        + case when extract(day from now() - u.created_at) >= 365 then 15
               when extract(day from now() - u.created_at) >= 90 then 8
               when extract(day from now() - u.created_at) < 30 then -10
               else 0 end
        + case when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) >= 10 then 15
               when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) >= 3 then 8
               when (select count(*) from rentals r where r.renter_id = u.id and r.status in ('closed','closed_with_penalty')) = 0 then -5
               else 0 end
        - coalesce((select count(*) * 10 from rentals r where r.renter_id = u.id and r.status in ('in_dispute','enforcement')), 0)
        + case when u.phone_verified then 2 else 0 end
        + case when u.email_verified then 2 else 0 end
      )) >= 25 then 'high'
      else 'ultra_high'
    end,
    updated_at = now()
    where u.role = 'renter'
  `);

  return Number((result as any).rowCount ?? 0);
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (intervalId) return;

  async function tick() {
    try {
      const alerts = await detectOverdueRentals();
      if (alerts > 0) {
        console.log(`[scheduler] Created ${alerts} late return alert(s)`);
      }
    } catch (err) {
      console.error("[scheduler] overdue check failed:", err);
    }
  }

  tick();

  intervalId = setInterval(tick, 60 * 60 * 1000);
  console.log("  Scheduler: overdue detection running (hourly)");
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
