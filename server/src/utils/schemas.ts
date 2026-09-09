/**
 * Zod validation schemas for the Managed Luxury Rental Platform API.
 *
 * All request payloads are validated through these schemas so routes can stay
 * thin and all input is known-good before it reaches the database layer.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

export const SaudiPhone = z
  .string()
  .regex(/^\+?9665\d{8}$/, "Saudi mobile number must match +9665XXXXXXXX");

export const SaudiNationalId = z
  .string()
  .regex(/^[12]\d{9}$/, "Saudi National ID must be 10 digits starting with 1 or 2");

export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const HalalasAmount = z.number().int().nonnegative();

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2),
  phone: SaudiPhone.optional(),
  role: z.enum(["renter", "owner"]).default("renter"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const NafathVerifySchema = z.object({
  nationalId: SaudiNationalId,
});

// ─────────────────────────────────────────────────────────────────────────────
// Assets (owner submission + admin review)
// ─────────────────────────────────────────────────────────────────────────────

export const AssetCategory = z.enum([
  "handbag",
  "watch",
  "dress",
  "jewelry",
  "accessory",
  "other",
]);

export const AssetSubmissionSchema = z.object({
  category: AssetCategory,
  brand: z.string().min(1),
  model: z.string().optional(),
  title: z.string().min(3),
  description: z.string().optional(),
  ownerDeclaredValueHalalas: HalalasAmount,
  submissionImages: z.array(z.string().url()).min(1).max(20),
  attributes: z.record(z.any()).optional(),
});

export const AssetApprovalSchema = z.object({
  assetId: z.number().int().positive(),
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export const AssetListingFilter = z.object({
  category: AssetCategory.optional(),
  brand: z.string().optional(),
  minDaily: HalalasAmount.optional(),
  maxDaily: HalalasAmount.optional(),
  from: IsoDate.optional(),
  to: IsoDate.optional(),
  cursor: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// Inspections
// ─────────────────────────────────────────────────────────────────────────────

export const InspectionReportSchema = z.object({
  assetId: z.number().int().positive(),
  type: z.enum(["intake", "return", "audit"]).default("intake"),
  rentalId: z.number().int().positive().optional(),
  authenticityVerified: z.boolean(),
  authenticityNotes: z.string().optional(),
  conditionScore: z.number().int().min(0).max(100),
  conditionGrade: z.enum(["A", "B", "C", "D"]),
  conditionNotes: z.string().optional(),
  marketValueHalalas: HalalasAmount,
  recommendedDailyPriceHalalas: HalalasAmount,
  riskCategory: z.enum(["low", "medium", "high", "ultra_high"]),
  beforeImages: z.array(z.string().url()).default([]),
  afterImages: z.array(z.string().url()).default([]),
  checklist: z.record(z.any()).default({}),
});

export const OwnerValuationResponseSchema = z.object({
  inspectionId: z.number().int().positive(),
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Rentals
// ─────────────────────────────────────────────────────────────────────────────

export const RentalQuoteRequestSchema = z.object({
  assetId: z.number().int().positive(),
  startDate: IsoDate,
  endDate: IsoDate,
});

export const RentalCreateSchema = z.object({
  assetId: z.number().int().positive(),
  startDate: IsoDate,
  endDate: IsoDate,
  deliveryAddress: z
    .object({
      city: z.string(),
      district: z.string(),
      street: z.string(),
      buildingNumber: z.string().optional(),
      postalCode: z.string().optional(),
      additionalCode: z.string().optional(),
    })
    .optional(),
});

export const RentalCancelSchema = z.object({
  reason: z.string().min(3),
});

// ─────────────────────────────────────────────────────────────────────────────
// Legal + Sanad
// ─────────────────────────────────────────────────────────────────────────────

export const LegalSignSchema = z.object({
  legalCommitmentId: z.number().int().positive(),
  acceptTerms: z.literal(true),
});

export const SanadExecuteSchema = z.object({
  sanadId: z.number().int().positive(),
  reason: z.string().min(5),
  attachments: z.array(z.string().url()).default([]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentChargeSchema = z.object({
  rentalId: z.number().int().positive(),
  paymentMethodToken: z.string().optional(),
});

export const PaymentRefundSchema = z.object({
  paymentId: z.number().int().positive(),
  amountHalalas: HalalasAmount.optional(),
  reason: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────────────────────────

export const DisputeOpenSchema = z.object({
  rentalId: z.number().int().positive(),
  category: z.enum(["damage", "loss", "fraud", "service", "billing"]),
  summary: z.string().min(10),
  evidence: z.array(z.string().url()).default([]),
});

export const DisputeResolveSchema = z.object({
  disputeId: z.number().int().positive(),
  resolution: z.enum([
    "resolved_for_renter",
    "resolved_for_platform",
    "resolved_for_owner",
    "escalated_to_legal",
  ]),
  notes: z.string().min(3),
  resolutionAmountHalalas: HalalasAmount.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Inventory / Shipments
// ─────────────────────────────────────────────────────────────────────────────

export const ShipmentScheduleSchema = z.object({
  assetId: z.number().int().positive(),
  rentalId: z.number().int().positive().optional(),
  direction: z.enum([
    "owner_to_platform",
    "platform_to_renter",
    "renter_to_platform",
    "platform_to_owner",
  ]),
  courier: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  fromAddress: z.record(z.any()).optional(),
  toAddress: z.record(z.any()).optional(),
});

export const ShipmentUpdateSchema = z.object({
  status: z.enum([
    "scheduled",
    "picked_up",
    "in_transit",
    "delivered",
    "failed",
    "returned",
  ]),
  trackingNumber: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────────────────────────────────────

export const AdminCreateStaffSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(["admin", "operations", "inspector"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const AdminBlockUserSchema = z.object({
  block: z.boolean(),
  reason: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Assets (additional validation)
// ─────────────────────────────────────────────────────────────────────────────

export const AssetReceivedSchema = z.object({
  warehouseLocationCode: z.string().min(1, "Warehouse location code is required"),
});

export const AssetValuationResponseSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Rentals (additional validation)
// ─────────────────────────────────────────────────────────────────────────────

export const RentalCloseSchema = z.object({
  outcome: z.enum(["clean", "penalty", "major_damage", "loss"]),
  penaltyHalalas: z.number().int().nonnegative().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Disputes (additional validation)
// ─────────────────────────────────────────────────────────────────────────────

export const DisputeAssignSchema = z.object({
  assigneeUserId: z.number().int().positive(),
});
