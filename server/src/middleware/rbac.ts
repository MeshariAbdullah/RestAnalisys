/**
 * Role-based access control.
 *
 * Permissions are organized by domain:
 *   asset.submit, asset.approve, asset.list
 *   inspection.create, inspection.read
 *   rental.create, rental.cancel, rental.refund
 *   legal.sign, legal.enforce
 *   payment.refund, payment.charge
 *   user.read, user.block
 *   finance.read, finance.export
 *   dispute.assign, dispute.resolve
 *   system.audit, system.impersonate
 */

import { Response, NextFunction } from "express";
import { AuthedRequest, Role } from "./auth.js";

export type Permission =
  | "asset.submit"
  | "asset.read.own"
  | "asset.read.any"
  | "asset.approve"
  | "asset.reject"
  | "asset.withdraw"
  | "asset.list"
  | "inspection.create"
  | "inspection.update"
  | "inspection.read"
  | "rental.create"
  | "rental.read.own"
  | "rental.read.any"
  | "rental.cancel"
  | "rental.fulfill"
  | "rental.close"
  | "legal.sign"
  | "legal.enforce"
  | "legal.read.any"
  | "payment.charge"
  | "payment.refund"
  | "payment.read"
  | "payout.release"
  | "user.read"
  | "user.block"
  | "user.create_staff"
  | "finance.read"
  | "finance.export"
  | "dispute.open"
  | "dispute.assign"
  | "dispute.resolve"
  | "operations.read"
  | "operations.update"
  | "system.audit"
  | "system.impersonate";

/**
 * Permission matrix. The super_admin role inherits every permission.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  renter: [
    "asset.list",
    "rental.create",
    "rental.read.own",
    "rental.cancel",
    "legal.sign",
    "payment.read",
    "dispute.open",
  ],
  owner: [
    "asset.submit",
    "asset.read.own",
    "asset.withdraw",
    "rental.read.own",
    "payment.read",
    "dispute.open",
  ],
  inspector: [
    "asset.read.any",
    "inspection.create",
    "inspection.update",
    "inspection.read",
  ],
  operations: [
    "asset.read.any",
    "rental.read.any",
    "rental.fulfill",
    "rental.close",
    "operations.read",
    "operations.update",
    "dispute.open",
    "inspection.read",
  ],
  admin: [
    "asset.read.any",
    "asset.approve",
    "asset.reject",
    "inspection.read",
    "rental.read.any",
    "rental.cancel",
    "legal.enforce",
    "legal.read.any",
    "payment.refund",
    "payment.read",
    "payout.release",
    "user.read",
    "user.block",
    "user.create_staff",
    "finance.read",
    "finance.export",
    "dispute.assign",
    "dispute.resolve",
    "operations.read",
    "system.audit",
  ],
  super_admin: [], // computed below
};

// super_admin = union of every other permission + system.impersonate
ROLE_PERMISSIONS.super_admin = Array.from(
  new Set<Permission>([
    ...Object.values(ROLE_PERMISSIONS).flat(),
    "system.impersonate",
  ])
);

export function roleHas(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Require that the authenticated user has *at least one* of the given
 * permissions.
 */
export function requirePermission(...required: Permission[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const ok = required.some((p) => roleHas(req.user!.role, p));
    if (!ok) {
      res.status(403).json({
        error: "Forbidden",
        required,
        role: req.user.role,
      });
      return;
    }
    next();
  };
}

/**
 * Require that the authenticated user has *all* of the given roles.
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", required: roles });
      return;
    }
    next();
  };
}

/**
 * Require Nafath verification. Applied to high-risk endpoints (rental creation,
 * legal signing).
 */
export function requireNafath(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!req.user.nafathVerified) {
    res.status(403).json({
      error: "Nafath verification required",
      code: "NAFATH_REQUIRED",
    });
    return;
  }
  next();
}
