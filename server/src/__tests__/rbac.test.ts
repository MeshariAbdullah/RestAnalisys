import { describe, it, expect } from "vitest";
import { roleHas, ROLE_PERMISSIONS, type Permission } from "../middleware/rbac.js";
import type { Role } from "../middleware/auth.js";

describe("RBAC permission matrix", () => {
  describe("renter permissions", () => {
    it("can create rentals", () => expect(roleHas("renter", "rental.create")).toBe(true));
    it("can sign legal", () => expect(roleHas("renter", "legal.sign")).toBe(true));
    it("can open disputes", () => expect(roleHas("renter", "dispute.open")).toBe(true));
    it("cannot approve assets", () => expect(roleHas("renter", "asset.approve")).toBe(false));
    it("cannot block users", () => expect(roleHas("renter", "user.block")).toBe(false));
  });

  describe("owner permissions", () => {
    it("can submit assets", () => expect(roleHas("owner", "asset.submit")).toBe(true));
    it("can withdraw assets", () => expect(roleHas("owner", "asset.withdraw")).toBe(true));
    it("cannot create rentals", () => expect(roleHas("owner", "rental.create")).toBe(false));
    it("cannot access finance", () => expect(roleHas("owner", "finance.read")).toBe(false));
  });

  describe("inspector permissions", () => {
    it("can create inspections", () => expect(roleHas("inspector", "inspection.create")).toBe(true));
    it("can read any asset", () => expect(roleHas("inspector", "asset.read.any")).toBe(true));
    it("cannot approve assets", () => expect(roleHas("inspector", "asset.approve")).toBe(false));
  });

  describe("operations permissions", () => {
    it("can fulfill rentals", () => expect(roleHas("operations", "rental.fulfill")).toBe(true));
    it("can close rentals", () => expect(roleHas("operations", "rental.close")).toBe(true));
    it("can manage operations", () => expect(roleHas("operations", "operations.update")).toBe(true));
    it("cannot manage users", () => expect(roleHas("operations", "user.block")).toBe(false));
  });

  describe("admin permissions", () => {
    it("can approve assets", () => expect(roleHas("admin", "asset.approve")).toBe(true));
    it("can block users", () => expect(roleHas("admin", "user.block")).toBe(true));
    it("can resolve disputes", () => expect(roleHas("admin", "dispute.resolve")).toBe(true));
    it("can access finance", () => expect(roleHas("admin", "finance.read")).toBe(true));
    it("cannot impersonate", () => expect(roleHas("admin", "system.impersonate")).toBe(false));
  });

  describe("super_admin permissions", () => {
    it("has every permission from other roles", () => {
      const allPerms = new Set<Permission>();
      for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
        if (role !== "super_admin") {
          for (const p of perms) allPerms.add(p);
        }
      }
      for (const perm of allPerms) {
        expect(roleHas("super_admin", perm)).toBe(true);
      }
    });

    it("can impersonate (exclusive to super_admin)", () => {
      expect(roleHas("super_admin", "system.impersonate")).toBe(true);
    });
  });
});
