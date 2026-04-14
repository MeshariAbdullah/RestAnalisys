import { Router } from "express";
import { db } from "../db/index.js";
import { employees, employeePerformance, stores } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// GET /api/employees
router.get("/", async (req, res) => {
  try {
    const { storeId, status, shift } = req.query;

    const conditions = [];
    if (storeId) conditions.push(eq(employees.storeId, parseInt(storeId as string)));
    if (status) conditions.push(eq(employees.status, status as "active" | "on_leave" | "terminated"));
    if (shift) conditions.push(eq(employees.shift, shift as string));

    const query = db
      .select({
        id: employees.id,
        storeId: employees.storeId,
        name: employees.name,
        role: employees.role,
        shift: employees.shift,
        phone: employees.phone,
        email: employees.email,
        hireDate: employees.hireDate,
        status: employees.status,
        notes: employees.notes,
        createdAt: employees.createdAt,
        storeName: stores.name,
      })
      .from(employees)
      .leftJoin(stores, eq(stores.id, employees.storeId))
      .orderBy(desc(employees.createdAt));

    const rows =
      conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// GET /api/employees/stats
router.get("/stats", async (req, res) => {
  try {
    const all = await db.select().from(employees);
    const perfRows = await db.select().from(employeePerformance);

    const avgScore =
      perfRows.length > 0
        ? perfRows.reduce((s, r) => s + (r.complianceScore ?? 0), 0) / perfRows.length
        : null;

    const byShift = {
      morning: all.filter((e) => e.shift === "morning").length,
      evening: all.filter((e) => e.shift === "evening").length,
      night: all.filter((e) => e.shift === "night").length,
    };

    return res.json({
      total: all.length,
      active: all.filter((e) => e.status === "active").length,
      onLeave: all.filter((e) => e.status === "on_leave").length,
      terminated: all.filter((e) => e.status === "terminated").length,
      avgComplianceScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
      totalViolations: perfRows.reduce((s, r) => s + (r.violations ?? 0), 0),
      byShift,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch employee stats" });
  }
});

// GET /api/employees/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [emp] = await db
      .select({
        id: employees.id,
        storeId: employees.storeId,
        name: employees.name,
        role: employees.role,
        shift: employees.shift,
        phone: employees.phone,
        email: employees.email,
        hireDate: employees.hireDate,
        status: employees.status,
        notes: employees.notes,
        createdAt: employees.createdAt,
        storeName: stores.name,
      })
      .from(employees)
      .leftJoin(stores, eq(stores.id, employees.storeId))
      .where(eq(employees.id, id))
      .limit(1);

    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const performance = await db
      .select()
      .from(employeePerformance)
      .where(eq(employeePerformance.employeeId, id))
      .orderBy(desc(employeePerformance.createdAt))
      .limit(50);

    const avgCompliance =
      performance.length > 0
        ? performance.reduce((s, r) => s + (r.complianceScore ?? 0), 0) / performance.length
        : null;

    return res.json({
      ...emp,
      performance,
      summary: {
        evaluations: performance.length,
        avgComplianceScore: avgCompliance ? Math.round(avgCompliance * 10) / 10 : null,
        totalViolations: performance.reduce((s, r) => s + (r.violations ?? 0), 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch employee" });
  }
});

// POST /api/employees
router.post("/", async (req, res) => {
  try {
    const { storeId, name, role, shift, phone, email, status, notes } = req.body;
    if (!storeId || !name) {
      return res.status(400).json({ error: "storeId and name are required" });
    }
    const [emp] = await db
      .insert(employees)
      .values({
        storeId: parseInt(storeId),
        name,
        role: role ?? "staff",
        shift: shift ?? "morning",
        phone,
        email,
        status: status ?? "active",
        notes,
      })
      .returning();
    return res.status(201).json(emp);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create employee" });
  }
});

// PUT /api/employees/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { storeId, name, role, shift, phone, email, status, notes } = req.body;

    const [emp] = await db
      .update(employees)
      .set({
        ...(storeId !== undefined ? { storeId: parseInt(storeId) } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(shift !== undefined ? { shift } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      })
      .where(eq(employees.id, id))
      .returning();
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    return res.json(emp);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update employee" });
  }
});

// DELETE /api/employees/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // cascade performance rows first
    await db.delete(employeePerformance).where(eq(employeePerformance.employeeId, id));
    const [emp] = await db.delete(employees).where(eq(employees.id, id)).returning();
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete employee" });
  }
});

// POST /api/employees/:id/performance
router.post("/:id/performance", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const { videoId, complianceScore, safetyScore, hygieneScore, violations, notes } = req.body;
    const [row] = await db
      .insert(employeePerformance)
      .values({
        employeeId,
        videoId: videoId ? parseInt(videoId) : null,
        complianceScore: complianceScore ?? null,
        safetyScore: safetyScore ?? null,
        hygieneScore: hygieneScore ?? null,
        violations: violations ?? 0,
        notes,
      })
      .returning();
    return res.status(201).json(row);
  } catch (err) {
    return res.status(500).json({ error: "Failed to add performance record" });
  }
});

// GET /api/employees/leaderboard/top
router.get("/leaderboard/top", async (req, res) => {
  try {
    const rows = await db
      .select({
        employeeId: employeePerformance.employeeId,
        name: employees.name,
        role: employees.role,
        storeName: stores.name,
        avgScore: sql<number>`avg(compliance_score)::numeric(5,2)`,
        evaluations: sql<number>`count(*)::int`,
        violations: sql<number>`sum(violations)::int`,
      })
      .from(employeePerformance)
      .leftJoin(employees, eq(employees.id, employeePerformance.employeeId))
      .leftJoin(stores, eq(stores.id, employees.storeId))
      .groupBy(employeePerformance.employeeId, employees.name, employees.role, stores.name)
      .orderBy(sql`avg(compliance_score) desc nulls last`)
      .limit(10);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
