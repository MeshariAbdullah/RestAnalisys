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

  it("inspector cannot fulfill rentals", () => {
    expect(roleHas("inspector", "rental.fulfill")).toBe(false);
  });

  it("operations can fulfill rentals", () => {
    expect(roleHas("operations", "rental.fulfill")).toBe(true);
  });

  it("admin can approve assets", () => {
    expect(roleHas("admin", "asset.approve")).toBe(true);
  });

  it("admin can refund payments", () => {
    expect(roleHas("admin", "payment.refund")).toBe(true);
  });

  it("admin cannot impersonate", () => {
    expect(roleHas("admin", "system.impersonate")).toBe(false);
  });

  it("super_admin has every permission from all roles", () => {
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

  it("super_admin can impersonate", () => {
    expect(roleHas("super_admin", "system.impersonate")).toBe(true);
  });

  it("every role has at least one permission", () => {
    const roles: Role[] = ["renter", "owner", "inspector", "operations", "admin", "super_admin"];
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it("returns false for unknown role", () => {
    expect(roleHas("unknown_role" as Role, "rental.create")).toBe(false);
  });
});
