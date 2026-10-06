import { describe, it, expect } from "vitest";
import { roleHas, ROLE_PERMISSIONS, type Permission } from "../middleware/rbac.js";
import type { Role } from "../middleware/auth.js";

describe("ROLE_PERMISSIONS", () => {
  const allRoles: Role[] = ["renter", "owner", "inspector", "operations", "admin", "super_admin"];

  it("defines permissions for all roles", () => {
    for (const role of allRoles) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });

  it("super_admin has all permissions from other roles", () => {
    const superPerms = new Set(ROLE_PERMISSIONS.super_admin);
    for (const role of allRoles) {
      if (role === "super_admin") continue;
      for (const perm of ROLE_PERMISSIONS[role]) {
        expect(superPerms.has(perm)).toBe(true);
      }
    }
  });

  it("super_admin has system.impersonate", () => {
    expect(ROLE_PERMISSIONS.super_admin).toContain("system.impersonate");
  });

  it("renter can create rentals and sign legal", () => {
    expect(ROLE_PERMISSIONS.renter).toContain("rental.create");
    expect(ROLE_PERMISSIONS.renter).toContain("legal.sign");
  });

  it("renter cannot approve assets or block users", () => {
    expect(ROLE_PERMISSIONS.renter).not.toContain("asset.approve");
    expect(ROLE_PERMISSIONS.renter).not.toContain("user.block");
  });

  it("owner can submit and withdraw assets", () => {
    expect(ROLE_PERMISSIONS.owner).toContain("asset.submit");
    expect(ROLE_PERMISSIONS.owner).toContain("asset.withdraw");
  });

  it("inspector can create and update inspections", () => {
    expect(ROLE_PERMISSIONS.inspector).toContain("inspection.create");
    expect(ROLE_PERMISSIONS.inspector).toContain("inspection.update");
  });

  it("operations can fulfill rentals and manage shipments", () => {
    expect(ROLE_PERMISSIONS.operations).toContain("rental.fulfill");
    expect(ROLE_PERMISSIONS.operations).toContain("operations.read");
    expect(ROLE_PERMISSIONS.operations).toContain("operations.update");
  });

  it("admin can manage users and enforce legal", () => {
    expect(ROLE_PERMISSIONS.admin).toContain("user.read");
    expect(ROLE_PERMISSIONS.admin).toContain("user.block");
    expect(ROLE_PERMISSIONS.admin).toContain("legal.enforce");
  });

  it("admin cannot impersonate", () => {
    expect(ROLE_PERMISSIONS.admin).not.toContain("system.impersonate");
  });
});

describe("roleHas", () => {
  it("returns true when role has the permission", () => {
    expect(roleHas("renter", "rental.create")).toBe(true);
    expect(roleHas("admin", "user.block")).toBe(true);
  });

  it("returns false when role lacks the permission", () => {
    expect(roleHas("renter", "user.block")).toBe(false);
    expect(roleHas("owner", "legal.enforce")).toBe(false);
  });

  it("super_admin has every permission", () => {
    const testPerms: Permission[] = [
      "asset.submit",
      "rental.create",
      "legal.enforce",
      "user.block",
      "system.impersonate",
      "finance.read",
    ];
    for (const perm of testPerms) {
      expect(roleHas("super_admin", perm)).toBe(true);
    }
  });
});
