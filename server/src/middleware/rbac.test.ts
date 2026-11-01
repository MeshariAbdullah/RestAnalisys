import { describe, it, expect } from "vitest";
import { roleHas, ROLE_PERMISSIONS, type Permission } from "./rbac.js";

describe("RBAC permission matrix", () => {
  it("renter can create rentals and sign legal commitments", () => {
    expect(roleHas("renter", "rental.create")).toBe(true);
    expect(roleHas("renter", "legal.sign")).toBe(true);
    expect(roleHas("renter", "payment.read")).toBe(true);
  });

  it("renter cannot access admin functions", () => {
    expect(roleHas("renter", "user.block")).toBe(false);
    expect(roleHas("renter", "finance.read")).toBe(false);
    expect(roleHas("renter", "system.audit")).toBe(false);
    expect(roleHas("renter", "payout.release")).toBe(false);
  });

  it("owner can submit assets and read own payouts", () => {
    expect(roleHas("owner", "asset.submit")).toBe(true);
    expect(roleHas("owner", "asset.read.own")).toBe(true);
    expect(roleHas("owner", "payout.read")).toBe(true);
    expect(roleHas("owner", "dispute.open")).toBe(true);
  });

  it("owner cannot approve assets or manage users", () => {
    expect(roleHas("owner", "asset.approve")).toBe(false);
    expect(roleHas("owner", "user.block")).toBe(false);
    expect(roleHas("owner", "payout.release")).toBe(false);
  });

  it("inspector has inspection permissions but not financial", () => {
    expect(roleHas("inspector", "inspection.create")).toBe(true);
    expect(roleHas("inspector", "inspection.read")).toBe(true);
    expect(roleHas("inspector", "asset.read.any")).toBe(true);
    expect(roleHas("inspector", "finance.read")).toBe(false);
    expect(roleHas("inspector", "rental.create")).toBe(false);
  });

  it("operations can fulfill and close rentals", () => {
    expect(roleHas("operations", "rental.fulfill")).toBe(true);
    expect(roleHas("operations", "rental.close")).toBe(true);
    expect(roleHas("operations", "operations.read")).toBe(true);
    expect(roleHas("operations", "operations.update")).toBe(true);
  });

  it("admin has broad permissions", () => {
    expect(roleHas("admin", "asset.approve")).toBe(true);
    expect(roleHas("admin", "user.block")).toBe(true);
    expect(roleHas("admin", "finance.read")).toBe(true);
    expect(roleHas("admin", "payout.release")).toBe(true);
    expect(roleHas("admin", "dispute.resolve")).toBe(true);
    expect(roleHas("admin", "legal.enforce")).toBe(true);
  });

  it("super_admin inherits all permissions including system.impersonate", () => {
    expect(roleHas("super_admin", "system.impersonate")).toBe(true);
    expect(roleHas("super_admin", "asset.submit")).toBe(true);
    expect(roleHas("super_admin", "rental.create")).toBe(true);
    expect(roleHas("super_admin", "payout.release")).toBe(true);
    expect(roleHas("super_admin", "finance.export")).toBe(true);
  });

  it("super_admin contains the union of all other roles", () => {
    const allPerms = new Set<Permission>();
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role !== "super_admin") {
        perms.forEach((p) => allPerms.add(p));
      }
    }
    for (const perm of allPerms) {
      expect(roleHas("super_admin", perm)).toBe(true);
    }
  });

  it("roleHas returns false for unknown combinations", () => {
    expect(roleHas("renter", "system.impersonate")).toBe(false);
    expect(roleHas("inspector", "payout.release")).toBe(false);
  });
});
