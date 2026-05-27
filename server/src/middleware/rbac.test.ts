import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS, roleHas, type Permission } from "./rbac.js";
import type { Role } from "./auth.js";

describe("ROLE_PERMISSIONS", () => {
  it("defines permissions for all 6 roles", () => {
    const roles: Role[] = ["renter", "owner", "inspector", "operations", "admin", "super_admin"];
    roles.forEach((r) => {
      expect(ROLE_PERMISSIONS[r]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[r])).toBe(true);
    });
  });

  it("super_admin has every permission from other roles", () => {
    const allOtherPerms = new Set<Permission>();
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role === "super_admin") continue;
      perms.forEach((p) => allOtherPerms.add(p));
    }

    const superPerms = new Set(ROLE_PERMISSIONS.super_admin);
    allOtherPerms.forEach((p) => {
      expect(superPerms.has(p)).toBe(true);
    });
  });

  it("super_admin has system.impersonate", () => {
    expect(ROLE_PERMISSIONS.super_admin).toContain("system.impersonate");
  });

  it("no other role has system.impersonate", () => {
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
      if (role === "super_admin") continue;
      expect(perms).not.toContain("system.impersonate");
    }
  });
});

describe("roleHas", () => {
  it("returns true when role has permission", () => {
    expect(roleHas("renter", "rental.create")).toBe(true);
    expect(roleHas("owner", "asset.submit")).toBe(true);
    expect(roleHas("inspector", "inspection.create")).toBe(true);
    expect(roleHas("admin", "user.block")).toBe(true);
  });

  it("returns false when role lacks permission", () => {
    expect(roleHas("renter", "asset.approve")).toBe(false);
    expect(roleHas("owner", "rental.create")).toBe(false);
    expect(roleHas("inspector", "user.block")).toBe(false);
  });

  it("super_admin has all permissions", () => {
    const samplePerms: Permission[] = [
      "asset.submit",
      "rental.create",
      "inspection.create",
      "user.block",
      "finance.read",
      "system.impersonate",
    ];

    samplePerms.forEach((p) => {
      expect(roleHas("super_admin", p)).toBe(true);
    });
  });
});

describe("role-specific permission checks", () => {
  it("renter can create rentals and sign legal", () => {
    expect(roleHas("renter", "rental.create")).toBe(true);
    expect(roleHas("renter", "legal.sign")).toBe(true);
    expect(roleHas("renter", "dispute.open")).toBe(true);
  });

  it("renter cannot approve assets or manage users", () => {
    expect(roleHas("renter", "asset.approve")).toBe(false);
    expect(roleHas("renter", "user.block")).toBe(false);
    expect(roleHas("renter", "finance.read")).toBe(false);
  });

  it("owner can submit and withdraw assets", () => {
    expect(roleHas("owner", "asset.submit")).toBe(true);
    expect(roleHas("owner", "asset.withdraw")).toBe(true);
    expect(roleHas("owner", "asset.read.own")).toBe(true);
  });

  it("inspector can create and read inspections", () => {
    expect(roleHas("inspector", "inspection.create")).toBe(true);
    expect(roleHas("inspector", "inspection.update")).toBe(true);
    expect(roleHas("inspector", "inspection.read")).toBe(true);
  });

  it("operations can fulfill rentals and manage operations", () => {
    expect(roleHas("operations", "rental.fulfill")).toBe(true);
    expect(roleHas("operations", "rental.close")).toBe(true);
    expect(roleHas("operations", "operations.read")).toBe(true);
    expect(roleHas("operations", "operations.update")).toBe(true);
  });

  it("admin can manage users, disputes, and finance", () => {
    expect(roleHas("admin", "user.read")).toBe(true);
    expect(roleHas("admin", "user.block")).toBe(true);
    expect(roleHas("admin", "dispute.assign")).toBe(true);
    expect(roleHas("admin", "dispute.resolve")).toBe(true);
    expect(roleHas("admin", "finance.read")).toBe(true);
    expect(roleHas("admin", "finance.export")).toBe(true);
  });
});
