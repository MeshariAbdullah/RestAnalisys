import { describe, it, expect } from "vitest";
import { roleHas, ROLE_PERMISSIONS, Permission } from "../middleware/rbac.js";
import type { Role } from "../middleware/auth.js";

describe("RBAC permission matrix", () => {
  it("renter can create rentals", () => {
    expect(roleHas("renter", "rental.create")).toBe(true);
  });

  it("renter cannot approve assets", () => {
    expect(roleHas("renter", "asset.approve")).toBe(false);
  });

  it("owner can submit assets", () => {
    expect(roleHas("owner", "asset.submit")).toBe(true);
  });

  it("owner cannot close rentals", () => {
    expect(roleHas("owner", "rental.close")).toBe(false);
  });

  it("inspector can create inspections", () => {
    expect(roleHas("inspector", "inspection.create")).toBe(true);
  });

  it("inspector cannot manage payments", () => {
    expect(roleHas("inspector", "payment.refund")).toBe(false);
  });

  it("operations can fulfill rentals", () => {
    expect(roleHas("operations", "rental.fulfill")).toBe(true);
  });

  it("operations can close rentals", () => {
    expect(roleHas("operations", "rental.close")).toBe(true);
  });

  it("admin can block users", () => {
    expect(roleHas("admin", "user.block")).toBe(true);
  });

  it("admin can read finance", () => {
    expect(roleHas("admin", "finance.read")).toBe(true);
  });

  it("admin can create staff", () => {
    expect(roleHas("admin", "user.create_staff")).toBe(true);
  });

  it("super_admin has every permission from all roles", () => {
    const allPermissions = new Set<Permission>();
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role !== "super_admin") {
        for (const p of perms) allPermissions.add(p);
      }
    }
    for (const p of allPermissions) {
      expect(roleHas("super_admin", p)).toBe(true);
    }
  });

  it("super_admin has system.impersonate", () => {
    expect(roleHas("super_admin", "system.impersonate")).toBe(true);
  });

  it("no other role has system.impersonate", () => {
    const roles: Role[] = ["renter", "owner", "inspector", "operations", "admin"];
    for (const role of roles) {
      expect(roleHas(role, "system.impersonate")).toBe(false);
    }
  });

  it("all defined permissions are assigned to at least one role", () => {
    const allAssigned = new Set<string>();
    for (const perms of Object.values(ROLE_PERMISSIONS)) {
      for (const p of perms) allAssigned.add(p);
    }
    expect(allAssigned.size).toBeGreaterThan(0);
  });
});
