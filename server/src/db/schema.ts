/**
 * Managed Luxury Rental Platform - Database Schema
 *
 * Domain: Saudi-based, fully managed rental for luxury assets (bags, watches,
 * dresses). Platform inspects, stores, lists, rents, enforces legal obligations,
 * and guarantees owners either the return of the asset or full compensation
 * equal to the evaluated value.
 *
 * Design principles:
 *  - Financial amounts are stored in halalas (SAR * 100) as bigints to avoid
 *    floating-point drift.
 *  - Every mutable table carries createdAt/updatedAt for auditing.
 *  - Immutable audit trail lives in `audit_logs`.
 *  - All state machines use pgEnum and are enforced at the application layer.
 */

import {
  pgTable,
  serial,
  bigserial,
  text,
  integer,
  bigint,
  jsonb,
  timestamp,
  boolean,
  pgEnum,
  real,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "renter",
  "owner",
  "inspector",
  "operations",
  "admin",
  "super_admin",
]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "unverified",
  "pending",
  "verified",
  "rejected",
]);

export const assetCategoryEnum = pgEnum("asset_category", [
  "handbag",
  "watch",
  "dress",
  "jewelry",
  "accessory",
  "other",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "pending_approval",       // Owner submitted, awaiting admin review
  "rejected",               // Admin rejected submission
  "awaiting_shipment",      // Approved, owner scheduling pickup/drop-off
  "in_inspection",          // With inspector, being authenticated/scored
  "inspection_reported",    // Inspection complete, awaiting owner approval of valuation
  "owner_rejected_valuation", // Owner disagreed with valuation
  "ready_for_listing",      // Owner approved, ready to list
  "listed",                 // Currently visible to renters
  "reserved",               // Pending-payment hold
  "rented_out",             // Currently with a renter
  "returned_under_inspection", // Returned, inspector verifying condition
  "completed",              // Rental cycle closed, back in inventory or withdrawn
  "withdrawn",              // Owner pulled item from platform
  "lost_or_destroyed",      // Compensation paid to owner
]);

export const riskCategoryEnum = pgEnum("risk_category", [
  "low",
  "medium",
  "high",
  "ultra_high",
]);

export const rentalStatusEnum = pgEnum("rental_status", [
  "pending_risk_review",    // Created, awaiting risk engine
  "pending_legal_signing",  // Risk approved, awaiting contract + Sanad
  "pending_payment",        // Legal signed, awaiting payment capture
  "confirmed",              // Paid, awaiting fulfillment
  "out_for_delivery",
  "active",                 // In renter's hands
  "return_in_transit",
  "under_inspection",
  "closed",                 // Happy path close
  "closed_with_penalty",    // Minor damage resolved
  "in_dispute",
  "enforcement",            // Sanad handed to Najiz execution
  "cancelled",
]);

export const legalCommitmentStatusEnum = pgEnum("legal_commitment_status", [
  "draft",
  "pending_signature",
  "signed",
  "active",
  "discharged",
  "breached",
  "void",
]);

export const sanadStatusEnum = pgEnum("sanad_status", [
  "not_required",
  "pending_issuance",
  "issued",
  "signed",
  "active",
  "matured",
  "discharged",
  "under_execution",
  "executed",
  "cancelled",
]);

export const paymentTypeEnum = pgEnum("payment_type", [
  "rental_fee",
  "platform_fee",
  "vat",
  "penalty",
  "compensation",
  "owner_payout",
  "refund",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "chargeback",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "investigating",
  "awaiting_evidence",
  "resolved_for_renter",
  "resolved_for_platform",
  "resolved_for_owner",
  "escalated_to_legal",
  "closed",
]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "scheduled",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "returned",
]);

export const shipmentDirectionEnum = pgEnum("shipment_direction", [
  "owner_to_platform",
  "platform_to_renter",
  "renter_to_platform",
  "platform_to_owner",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Core identity
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    phoneE164: text("phone_e164"),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    role: userRoleEnum("role").notNull().default("renter"),

    // Saudi Digital Identity (Nafath) linkage
    nationalId: text("national_id"),         // Iqama / national ID
    nafathVerified: boolean("nafath_verified").notNull().default(false),
    nafathVerifiedAt: timestamp("nafath_verified_at"),
    nafathTransactionId: text("nafath_transaction_id"),

    kycStatus: kycStatusEnum("kyc_status").notNull().default("unverified"),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    phoneVerifiedAt: timestamp("phone_verified_at"),
    emailVerified: boolean("email_verified").notNull().default(false),

    // Risk profile
    trustScore: integer("trust_score").notNull().default(50), // 0..100
    riskCategory: riskCategoryEnum("risk_category").notNull().default("medium"),

    // Address (National Address integration placeholder)
    nationalAddressJson: jsonb("national_address_json"),

    // Flags
    isBlocked: boolean("is_blocked").notNull().default(false),
    blockedReason: text("blocked_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    nationalIdIdx: index("users_national_id_idx").on(t.nationalId),
    roleIdx: index("users_role_idx").on(t.role),
  })
);

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  permissionsJson: jsonb("permissions_json").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Owner agreement (consignment contract between owner and platform)
// ─────────────────────────────────────────────────────────────────────────────

export const ownerAgreements = pgTable("owner_agreements", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  version: text("version").notNull().default("1.0"),
  agreementPdfUrl: text("agreement_pdf_url"),
  commissionPct: real("commission_pct").notNull().default(20), // platform cut
  guaranteeAccepted: boolean("guarantee_accepted").notNull().default(false),
  signedAt: timestamp("signed_at"),
  signedIp: text("signed_ip"),
  effectiveFrom: timestamp("effective_from"),
  effectiveUntil: timestamp("effective_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Assets (the luxury items consigned to the platform)
// ─────────────────────────────────────────────────────────────────────────────

export const assets = pgTable(
  "assets",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id").references(() => users.id).notNull(),

    category: assetCategoryEnum("category").notNull(),
    brand: text("brand").notNull(),
    model: text("model"),
    title: text("title").notNull(),
    description: text("description"),

    ownerDeclaredValueHalalas: bigint("owner_declared_value_halalas", { mode: "number" }),
    evaluatedValueHalalas: bigint("evaluated_value_halalas", { mode: "number" }), // set by inspector
    dailyRentalPriceHalalas: bigint("daily_rental_price_halalas", { mode: "number" }),

    riskCategory: riskCategoryEnum("risk_category").notNull().default("medium"),
    status: assetStatusEnum("status").notNull().default("pending_approval"),

    // Media
    submissionImagesJson: jsonb("submission_images_json").notNull().default("[]"),
    studioImagesJson: jsonb("studio_images_json").notNull().default("[]"),

    // Attributes specific to category (size, dial, material, measurements)
    attributesJson: jsonb("attributes_json").notNull().default("{}"),

    // Physical location in the platform warehouse
    warehouseLocationCode: text("warehouse_location_code"),

    // Lifecycle bookkeeping
    rejectionReason: text("rejection_reason"),
    withdrawnAt: timestamp("withdrawn_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    ownerIdx: index("assets_owner_idx").on(t.ownerId),
    statusIdx: index("assets_status_idx").on(t.status),
    categoryIdx: index("assets_category_idx").on(t.category),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Inspections (authentication + valuation + condition)
// ─────────────────────────────────────────────────────────────────────────────

export const inspections = pgTable(
  "inspections",
  {
    id: serial("id").primaryKey(),
    assetId: integer("asset_id").references(() => assets.id).notNull(),
    inspectorId: integer("inspector_id").references(() => users.id).notNull(),

    type: text("type").notNull().default("intake"), // intake | return | audit
    rentalId: integer("rental_id"), // set when type = return

    authenticityVerified: boolean("authenticity_verified").notNull().default(false),
    authenticityNotes: text("authenticity_notes"),

    conditionScore: integer("condition_score"), // 0..100
    conditionGrade: text("condition_grade"),    // A, B, C, D
    conditionNotes: text("condition_notes"),

    marketValueHalalas: bigint("market_value_halalas", { mode: "number" }),
    recommendedDailyPriceHalalas: bigint("recommended_daily_price_halalas", { mode: "number" }),
    riskCategory: riskCategoryEnum("risk_category").notNull().default("medium"),

    beforeImagesJson: jsonb("before_images_json").notNull().default("[]"),
    afterImagesJson: jsonb("after_images_json").notNull().default("[]"),

    checklistJson: jsonb("checklist_json").notNull().default("{}"),
    reportPdfUrl: text("report_pdf_url"),

    ownerApproved: boolean("owner_approved").notNull().default(false),
    ownerApprovedAt: timestamp("owner_approved_at"),
    ownerRejectedAt: timestamp("owner_rejected_at"),
    ownerRejectionReason: text("owner_rejection_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    assetIdx: index("inspections_asset_idx").on(t.assetId),
    inspectorIdx: index("inspections_inspector_idx").on(t.inspectorId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Inventory movements (audit of where the item physically is)
// ─────────────────────────────────────────────────────────────────────────────

export const inventoryMovements = pgTable("inventory_movements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  fromLocation: text("from_location"),
  toLocation: text("to_location").notNull(),
  movedByUserId: integer("moved_by_user_id").references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Rentals (the core lifecycle object)
// ─────────────────────────────────────────────────────────────────────────────

export const rentals = pgTable(
  "rentals",
  {
    id: serial("id").primaryKey(),
    reference: text("reference").notNull().unique(), // MLR-YYYY-000123
    assetId: integer("asset_id").references(() => assets.id).notNull(),
    renterId: integer("renter_id").references(() => users.id).notNull(),
    ownerId: integer("owner_id").references(() => users.id).notNull(),

    status: rentalStatusEnum("status").notNull().default("pending_risk_review"),

    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    durationDays: integer("duration_days").notNull(),

    // Pricing snapshot (halalas)
    dailyPriceHalalas: bigint("daily_price_halalas", { mode: "number" }).notNull(),
    rentalSubtotalHalalas: bigint("rental_subtotal_halalas", { mode: "number" }).notNull(),
    platformFeeHalalas: bigint("platform_fee_halalas", { mode: "number" }).notNull(),
    vatHalalas: bigint("vat_halalas", { mode: "number" }).notNull(),
    totalPayableHalalas: bigint("total_payable_halalas", { mode: "number" }).notNull(),

    // Risk snapshot
    riskSnapshotJson: jsonb("risk_snapshot_json"),
    trustScoreAtBooking: integer("trust_score_at_booking"),
    legalCommitmentPct: real("legal_commitment_pct").notNull(),      // 100 or 150
    legalCommitmentHalalas: bigint("legal_commitment_halalas", { mode: "number" }).notNull(),

    // Delivery
    deliveryAddressJson: jsonb("delivery_address_json"),

    // Timestamps for lifecycle
    confirmedAt: timestamp("confirmed_at"),
    deliveredAt: timestamp("delivered_at"),
    returnedAt: timestamp("returned_at"),
    closedAt: timestamp("closed_at"),
    cancelledAt: timestamp("cancelled_at"),
    cancellationReason: text("cancellation_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    renterIdx: index("rentals_renter_idx").on(t.renterId),
    ownerIdx: index("rentals_owner_idx").on(t.ownerId),
    assetIdx: index("rentals_asset_idx").on(t.assetId),
    statusIdx: index("rentals_status_idx").on(t.status),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Risk engine
// ─────────────────────────────────────────────────────────────────────────────

export const riskScores = pgTable(
  "risk_scores",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    rentalId: integer("rental_id").references(() => rentals.id),

    // Feature snapshot
    accountAgeDays: integer("account_age_days").notNull(),
    completedRentals: integer("completed_rentals").notNull().default(0),
    disputedRentals: integer("disputed_rentals").notNull().default(0),
    cancelledRentals: integer("cancelled_rentals").notNull().default(0),
    lateReturns: integer("late_returns").notNull().default(0),
    nafathVerified: boolean("nafath_verified").notNull().default(false),

    baseScore: integer("base_score").notNull(),
    modifiersJson: jsonb("modifiers_json").notNull().default("[]"),
    finalScore: integer("final_score").notNull(),
    riskCategory: riskCategoryEnum("risk_category").notNull(),

    approved: boolean("approved").notNull(),
    rejectionReason: text("rejection_reason"),

    legalCommitmentPct: real("legal_commitment_pct").notNull(),
    legalCommitmentHalalas: bigint("legal_commitment_halalas", { mode: "number" }).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("risk_scores_user_idx").on(t.userId),
    rentalIdx: index("risk_scores_rental_idx").on(t.rentalId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Legal commitments (platform <-> renter) and Sanad (promissory notes)
// ─────────────────────────────────────────────────────────────────────────────

export const legalCommitments = pgTable(
  "legal_commitments",
  {
    id: serial("id").primaryKey(),
    rentalId: integer("rental_id").references(() => rentals.id).notNull(),
    renterId: integer("renter_id").references(() => users.id).notNull(),

    status: legalCommitmentStatusEnum("status").notNull().default("draft"),

    contractVersion: text("contract_version").notNull().default("v1.0"),
    contractPdfUrl: text("contract_pdf_url"),
    contractTextHash: text("contract_text_hash"),   // SHA-256 of canonical text
    clausesJson: jsonb("clauses_json").notNull().default("[]"),

    commitmentHalalas: bigint("commitment_halalas", { mode: "number" }).notNull(),
    commitmentPct: real("commitment_pct").notNull(),

    // Nafath e-signing placeholder
    signedAt: timestamp("signed_at"),
    signedIp: text("signed_ip"),
    signedUserAgent: text("signed_user_agent"),
    nafathSignTransactionId: text("nafath_sign_transaction_id"),

    dischargedAt: timestamp("discharged_at"),
    breachedAt: timestamp("breached_at"),
    breachReason: text("breach_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    rentalIdx: index("legal_commitments_rental_idx").on(t.rentalId),
  })
);

export const sanadRecords = pgTable(
  "sanad_records",
  {
    id: serial("id").primaryKey(),
    rentalId: integer("rental_id").references(() => rentals.id).notNull(),
    legalCommitmentId: integer("legal_commitment_id")
      .references(() => legalCommitments.id)
      .notNull(),
    renterId: integer("renter_id").references(() => users.id).notNull(),

    status: sanadStatusEnum("status").notNull().default("pending_issuance"),

    // Nafith (Ministry of Justice promissory note platform) references
    nafithReference: text("nafith_reference"),
    nafithRequestId: text("nafith_request_id"),
    issuedAt: timestamp("issued_at"),
    signedAt: timestamp("signed_at"),
    maturityDate: date("maturity_date"),

    principalHalalas: bigint("principal_halalas", { mode: "number" }).notNull(),
    dueHalalas: bigint("due_halalas", { mode: "number" }).notNull(),

    executionRequestedAt: timestamp("execution_requested_at"),
    executionCaseNumber: text("execution_case_number"),
    executedAt: timestamp("executed_at"),

    rawResponseJson: jsonb("raw_response_json"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    rentalIdx: index("sanad_records_rental_idx").on(t.rentalId),
    statusIdx: index("sanad_records_status_idx").on(t.status),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    rentalId: integer("rental_id").references(() => rentals.id),
    userId: integer("user_id").references(() => users.id).notNull(),

    type: paymentTypeEnum("type").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),

    amountHalalas: bigint("amount_halalas", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("SAR"),

    gateway: text("gateway").notNull().default("hyperpay"), // hyperpay | moyasar | paytabs
    gatewayTransactionId: text("gateway_transaction_id"),
    gatewayRawJson: jsonb("gateway_raw_json"),

    // E-invoicing (ZATCA) integration placeholder
    invoiceNumber: text("invoice_number"),
    invoiceXmlUrl: text("invoice_xml_url"),
    invoiceQrBase64: text("invoice_qr_base64"),
    invoicedAt: timestamp("invoiced_at"),

    capturedAt: timestamp("captured_at"),
    refundedAt: timestamp("refunded_at"),
    failureReason: text("failure_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    rentalIdx: index("payments_rental_idx").on(t.rentalId),
    userIdx: index("payments_user_idx").on(t.userId),
    typeIdx: index("payments_type_idx").on(t.type),
  })
);

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  rentalId: integer("rental_id").references(() => rentals.id),
  grossHalalas: bigint("gross_halalas", { mode: "number" }).notNull(),
  commissionHalalas: bigint("commission_halalas", { mode: "number" }).notNull(),
  netHalalas: bigint("net_halalas", { mode: "number" }).notNull(),
  iban: text("iban"),
  status: text("status").notNull().default("pending"), // pending | processing | paid | failed
  reference: text("reference"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────────────────────────

export const disputes = pgTable(
  "disputes",
  {
    id: serial("id").primaryKey(),
    rentalId: integer("rental_id").references(() => rentals.id).notNull(),
    openedByUserId: integer("opened_by_user_id").references(() => users.id).notNull(),
    assignedToUserId: integer("assigned_to_user_id").references(() => users.id),

    status: disputeStatusEnum("status").notNull().default("open"),
    category: text("category").notNull(), // damage | loss | fraud | service | billing
    severity: text("severity").notNull().default("medium"),

    summary: text("summary").notNull(),
    evidenceJson: jsonb("evidence_json").notNull().default("[]"),
    resolutionNotes: text("resolution_notes"),
    resolutionAmountHalalas: bigint("resolution_amount_halalas", { mode: "number" }),

    openedAt: timestamp("opened_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    rentalIdx: index("disputes_rental_idx").on(t.rentalId),
    statusIdx: index("disputes_status_idx").on(t.status),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Shipments (owner->platform, platform->renter, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const shipments = pgTable(
  "shipments",
  {
    id: serial("id").primaryKey(),
    assetId: integer("asset_id").references(() => assets.id).notNull(),
    rentalId: integer("rental_id").references(() => rentals.id),
    direction: shipmentDirectionEnum("direction").notNull(),
    status: shipmentStatusEnum("status").notNull().default("scheduled"),

    courier: text("courier"),
    trackingNumber: text("tracking_number"),
    fromAddressJson: jsonb("from_address_json"),
    toAddressJson: jsonb("to_address_json"),

    scheduledAt: timestamp("scheduled_at"),
    pickedUpAt: timestamp("picked_up_at"),
    deliveredAt: timestamp("delivered_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    assetIdx: index("shipments_asset_idx").on(t.assetId),
    rentalIdx: index("shipments_rental_idx").on(t.rentalId),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Alerts (operational + compliance)
// ─────────────────────────────────────────────────────────────────────────────

export const operationalAlerts = pgTable("operational_alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // late_return | high_risk_user | payment_failed | sanad_overdue
  severity: text("severity").notNull().default("medium"),
  subjectType: text("subject_type").notNull(), // rental | user | asset
  subjectId: integer("subject_id").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // open | acknowledged | resolved
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Immutable audit logs
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorUserId: integer("actor_user_id").references(() => users.id),
    actorRole: text("actor_role"),
    action: text("action").notNull(),          // e.g. asset.approve, rental.cancel
    entityType: text("entity_type").notNull(), // user | asset | rental | payment | ...
    entityId: integer("entity_id"),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    entityIdx: index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    actorIdx: index("audit_logs_actor_idx").on(t.actorUserId),
    createdIdx: index("audit_logs_created_idx").on(t.createdAt),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// In-app notifications
// ─────────────────────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    read: boolean("read").notNull().default(false),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId),
    readIdx: index("notifications_user_read_idx").on(t.userId, t.read),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Integration webhooks (Nafath, Nafith, payment gateway, courier)
// ─────────────────────────────────────────────────────────────────────────────

export const integrationEvents = pgTable("integration_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  provider: text("provider").notNull(), // nafath | nafith | hyperpay | zatca | courier
  eventType: text("event_type").notNull(),
  referenceId: text("reference_id"),
  payloadJson: jsonb("payload_json"),
  processed: boolean("processed").notNull().default(false),
  processedAt: timestamp("processed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Inspection = typeof inspections.$inferSelect;
export type Rental = typeof rentals.$inferSelect;
export type NewRental = typeof rentals.$inferInsert;
export type RiskScore = typeof riskScores.$inferSelect;
export type LegalCommitment = typeof legalCommitments.$inferSelect;
export type SanadRecord = typeof sanadRecords.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Dispute = typeof disputes.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
