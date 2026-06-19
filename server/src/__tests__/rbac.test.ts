import { describe, it, expect } from "vitest";
import { roleHas, ROLE_PERMISSIONS, type Permission } from "../middleware/rbac.js";
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

  it("owner cannot create rentals", () => {
    expect(roleHas("owner", "rental.create")).toBe(false);
  });

  it("inspector can create inspections", () => {
    expect(roleHas("inspector", "inspection.create")).toBe(true);
  });

  it("inspector cannot release payouts", () => {
    expect(roleHas("inspector", "payout.release")).toBe(false);
  });

  it("operations can fulfill rentals", () => {
    expect(roleHas("operations", "rental.fulfill")).toBe(true);
  });

  it("admin can block users", () => {
    expect(roleHas("admin", "user.block")).toBe(true);
  });

  it("admin can resolve disputes", () => {
    expect(roleHas("admin", "dispute.resolve")).toBe(true);
  });

  it("admin can enforce legal commitments", () => {
    expect(roleHas("admin", "legal.enforce")).toBe(true);
  });

  it("super_admin has all permissions from other roles", () => {
    const allPermissions = new Set<Permission>();
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role !== "super_admin") {
        for (const p of perms) allPermissions.add(p);
      }
    }
    for (const perm of allPermissions) {
      expect(roleHas("super_admin", perm)).toBe(true);
    }
  });

  it("super_admin has system.impersonate", () => {
    expect(roleHas("super_admin", "system.impersonate")).toBe(true);
  });

  it("non-super_admin roles cannot impersonate", () => {
    const roles: Role[] = ["renter", "owner", "inspector", "operations", "admin"];
    for (const role of roles) {
      expect(roleHas(role, "system.impersonate")).toBe(false);
    }
  });

  it("every role has at least one permission", () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      expect(perms.length).toBeGreaterThan(0);
    }
  });
});
