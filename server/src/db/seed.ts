/**
 * Seed the Managed Luxury Rental Platform with realistic demo data so every
 * dashboard has something to show.
 *
 * Creates:
 *  - Users of every role (super_admin, admin, inspector, operations, owner, renter)
 *  - A signed owner consignment agreement
 *  - 6 luxury assets across the lifecycle (pending, listed, rented, closed)
 *  - 1 completed rental with legal commitment, Sanad, payment, payout
 *  - 1 active rental currently with the renter
 *  - 1 rental under dispute
 */

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import {
  users,
  roles,
  ownerAgreements,
  assets,
  inspections,
  rentals,
  riskScores,
  legalCommitments,
  sanadRecords,
  payments,
  payouts,
  disputes,
  shipments,
  operationalAlerts,
  inventoryMovements,
} from "./schema.js";
import { sarToHalalas, computeRentalQuote, computeOwnerPayout } from "../utils/money.js";
import { generateLegalCommitment } from "../services/legalService.js";

async function seed() {
  console.log("🌱 Seeding MLR platform...");

  // ── Roles ─────────────────────────────────────────────────────────────
  await db.insert(roles).values([
    {
      key: "renter",
      nameEn: "Renter",
      nameAr: "مستأجر",
      description: "End user who rents luxury items",
      permissionsJson: ["asset.list", "rental.create", "rental.read.own", "rental.cancel", "legal.sign", "payment.read", "dispute.open"] as unknown as object,
    },
    {
      key: "owner",
      nameEn: "Owner",
      nameAr: "مالك",
      description: "Luxury item owner who consigns assets to the platform",
      permissionsJson: ["asset.submit", "asset.read.own", "asset.withdraw", "rental.read.own", "payment.read", "dispute.open"] as unknown as object,
    },
    {
      key: "inspector",
      nameEn: "Inspector",
      nameAr: "مفتش",
      description: "Authenticates and evaluates luxury items",
      permissionsJson: ["asset.read.any", "inspection.create", "inspection.update", "inspection.read"] as unknown as object,
    },
    {
      key: "operations",
      nameEn: "Operations",
      nameAr: "عمليات",
      description: "Manages logistics, shipments, and warehouse inventory",
      permissionsJson: ["asset.read.any", "rental.read.any", "rental.fulfill", "rental.close", "operations.read", "operations.update", "dispute.open", "inspection.read"] as unknown as object,
    },
    {
      key: "admin",
      nameEn: "Administrator",
      nameAr: "مشرف",
      description: "Platform administrator with broad access",
      permissionsJson: ["asset.read.any", "asset.approve", "asset.reject", "inspection.read", "rental.read.any", "rental.cancel", "legal.enforce", "legal.read.any", "payment.refund", "payment.read", "payout.release", "user.read", "user.block", "user.create_staff", "finance.read", "finance.export", "dispute.assign", "dispute.resolve", "operations.read", "system.audit"] as unknown as object,
    },
    {
      key: "super_admin",
      nameEn: "Super Administrator",
      nameAr: "مشرف أعلى",
      description: "Full system access including impersonation",
      permissionsJson: ["*"] as unknown as object,
    },
  ]);

  // ── Users ─────────────────────────────────────────────────────────────
  const pass = await bcrypt.hash("Mlr@2024!", 10);

  const [superAdmin, admin, inspector, ops, owner, renter, newRenter] =
    await db
      .insert(users)
      .values([
        {
          email: "super@mlr.sa",
          passwordHash: pass,
          fullName: "Super Admin",
          role: "super_admin",
          nationalId: "1000000001",
          nafathVerified: true,
          nafathVerifiedAt: new Date(),
          kycStatus: "verified",
          phoneVerified: true,
          emailVerified: true,
          trustScore: 100,
          riskCategory: "low",
        },
        {
          email: "admin@mlr.sa",
          passwordHash: pass,
          fullName: "Reem AlQahtani",
          role: "admin",
          nationalId: "1000000002",
          nafathVerified: true,
          nafathVerifiedAt: new Date(),
          kycStatus: "verified",
          phoneVerified: true,
          emailVerified: true,
          trustScore: 100,
          riskCategory: "low",
        },
        {
          email: "inspector@mlr.sa",
          passwordHash: pass,
          fullName: "Faisal AlHarbi",
          role: "inspector",
          nationalId: "1000000003",
          nafathVerified: true,
          nafathVerifiedAt: new Date(),
          kycStatus: "verified",
          phoneVerified: true,
          emailVerified: true,
          trustScore: 100,
          riskCategory: "low",
        },
        {
          email: "ops@mlr.sa",
          passwordHash: pass,
          fullName: "Lina AlShehri",
          role: "operations",
          nationalId: "1000000004",
          nafathVerified: true,
          nafathVerifiedAt: new Date(),
          kycStatus: "verified",
          phoneVerified: true,
          emailVerified: true,
          trustScore: 100,
          riskCategory: "low",
        },
        {
          email: "owner@mlr.sa",
          passwordHash: pass,
          fullName: "Nouf AlSaud",
          role: "owner",
          phoneE164: "+966500000001",
          nationalId: "1000000005",
          nafathVerified: true,
          nafathVerifiedAt: new Date(),
          kycStatus: "verified",
          phoneVerified: true,
          emailVerified: true,
          trustScore: 90,
          riskCategory: "low",
        },
        {
          email: "renter@mlr.sa",
          passwordHash: pass,
          fullName: "Sara AlOtaibi",
          role: "renter",
          phoneE164: "+966500000002",
          nationalId: "1000000006",
          nafathVerified: true,
          nafathVerifiedAt: new Date(),
          kycStatus: "verified",
          phoneVerified: true,
          emailVerified: true,
          trustScore: 82,
          riskCategory: "low",
        },
        {
          email: "new.renter@mlr.sa",
          passwordHash: pass,
          fullName: "Mohammed AlZahrani",
          role: "renter",
          phoneE164: "+966500000003",
          nationalId: "1000000007",
          nafathVerified: true,
          nafathVerifiedAt: new Date(),
          kycStatus: "verified",
          phoneVerified: true,
          emailVerified: true,
          trustScore: 55,
          riskCategory: "medium",
        },
      ])
      .returning();

  // ── Owner agreement ───────────────────────────────────────────────────
  await db.insert(ownerAgreements).values({
    ownerId: owner.id,
    version: "1.0",
    commissionPct: 20,
    guaranteeAccepted: true,
    signedAt: new Date(),
    effectiveFrom: new Date(),
  });

  // ── Assets ────────────────────────────────────────────────────────────
  const [asset1, asset2, asset3, asset4, asset5, asset6] = await db
    .insert(assets)
    .values([
      {
        ownerId: owner.id,
        category: "handbag",
        brand: "Hermès",
        model: "Birkin 30",
        title: "Hermès Birkin 30 — Gold Togo",
        description: "Brand-new Birkin 30 in Gold Togo leather with palladium hardware.",
        ownerDeclaredValueHalalas: sarToHalalas(180000),
        evaluatedValueHalalas: sarToHalalas(175000),
        dailyRentalPriceHalalas: sarToHalalas(1800),
        riskCategory: "high",
        status: "listed",
        submissionImagesJson: ["https://picsum.photos/seed/birkin1/600/400"] as unknown as object,
        studioImagesJson: [
          "https://picsum.photos/seed/birkin2/600/400",
          "https://picsum.photos/seed/birkin3/600/400",
        ] as unknown as object,
        attributesJson: { color: "Gold", hardware: "Palladium", size: "30cm" } as object,
        warehouseLocationCode: "KSA-RUH-A1-03",
      },
      {
        ownerId: owner.id,
        category: "watch",
        brand: "Rolex",
        model: "Daytona 116500LN",
        title: "Rolex Cosmograph Daytona — White Dial",
        description: "2023 model, full set, immaculate condition.",
        ownerDeclaredValueHalalas: sarToHalalas(145000),
        evaluatedValueHalalas: sarToHalalas(140000),
        dailyRentalPriceHalalas: sarToHalalas(1200),
        riskCategory: "high",
        status: "rented_out",
        submissionImagesJson: ["https://picsum.photos/seed/daytona1/600/400"] as unknown as object,
        studioImagesJson: ["https://picsum.photos/seed/daytona2/600/400"] as unknown as object,
        attributesJson: { caseSize: "40mm", dial: "White", material: "Steel" } as object,
        warehouseLocationCode: "KSA-RUH-A1-04",
      },
      {
        ownerId: owner.id,
        category: "dress",
        brand: "Elie Saab",
        model: "Haute Couture F/W 2024",
        title: "Elie Saab Haute Couture Gown — Blush",
        description: "One-of-one hand-embroidered gown, worn once.",
        ownerDeclaredValueHalalas: sarToHalalas(85000),
        evaluatedValueHalalas: sarToHalalas(80000),
        dailyRentalPriceHalalas: sarToHalalas(2500),
        riskCategory: "medium",
        status: "listed",
        submissionImagesJson: ["https://picsum.photos/seed/gown1/600/400"] as unknown as object,
        studioImagesJson: ["https://picsum.photos/seed/gown2/600/400"] as unknown as object,
        attributesJson: { size: "EU 36", color: "Blush", material: "Silk" } as object,
        warehouseLocationCode: "KSA-RUH-A1-05",
      },
      {
        ownerId: owner.id,
        category: "jewelry",
        brand: "Van Cleef & Arpels",
        model: "Alhambra 10-motif",
        title: "Van Cleef Alhambra 10-Motif Necklace — Yellow Gold",
        description: "Iconic Alhambra long necklace, 10 motifs, yellow gold.",
        ownerDeclaredValueHalalas: sarToHalalas(65000),
        evaluatedValueHalalas: sarToHalalas(62000),
        dailyRentalPriceHalalas: sarToHalalas(1500),
        riskCategory: "high",
        status: "listed",
        submissionImagesJson: ["https://picsum.photos/seed/vca1/600/400"] as unknown as object,
        studioImagesJson: ["https://picsum.photos/seed/vca2/600/400"] as unknown as object,
        attributesJson: { metal: "18k Yellow Gold", length: "84cm" } as object,
        warehouseLocationCode: "KSA-RUH-A1-06",
      },
      {
        ownerId: owner.id,
        category: "handbag",
        brand: "Chanel",
        model: "Classic Flap Medium",
        title: "Chanel Classic Flap Medium — Black Caviar",
        description: "Timeless Classic Flap in black caviar leather, gold hardware.",
        ownerDeclaredValueHalalas: sarToHalalas(55000),
        status: "pending_approval",
        submissionImagesJson: ["https://picsum.photos/seed/chanel1/600/400"] as unknown as object,
        attributesJson: { color: "Black", hardware: "Gold", size: "Medium" } as object,
      },
      {
        ownerId: owner.id,
        category: "watch",
        brand: "Audemars Piguet",
        model: "Royal Oak 15400ST",
        title: "Audemars Piguet Royal Oak 15400ST",
        description: "Classic stainless steel Royal Oak, black dial.",
        ownerDeclaredValueHalalas: sarToHalalas(120000),
        status: "in_inspection",
        submissionImagesJson: ["https://picsum.photos/seed/ap1/600/400"] as unknown as object,
        attributesJson: { caseSize: "41mm", dial: "Black" } as object,
        warehouseLocationCode: "KSA-RUH-A1-07",
      },
    ])
    .returning();

  // ── Intake inspections for listed assets ─────────────────────────────
  for (const asset of [asset1, asset2, asset3, asset4]) {
    await db.insert(inspections).values({
      assetId: asset.id,
      inspectorId: inspector.id,
      type: "intake",
      authenticityVerified: true,
      authenticityNotes: "Serial matched manufacturer records, holograms intact.",
      conditionScore: 92,
      conditionGrade: "A",
      conditionNotes: "Excellent condition with minor storage marks.",
      marketValueHalalas: asset.evaluatedValueHalalas,
      recommendedDailyPriceHalalas: asset.dailyRentalPriceHalalas,
      riskCategory: asset.riskCategory,
      beforeImagesJson: asset.studioImagesJson,
      checklistJson: {
        authenticity: "pass",
        stitching: "pass",
        hardware: "pass",
        scent: "pass",
        dustbag: true,
      } as object,
      ownerApproved: true,
      ownerApprovedAt: new Date(),
    });
  }

  // ── Active rental (renter holds asset2 for 5 days) ───────────────────
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 5);
  const startIso = startDate.toISOString().slice(0, 10);
  const endIso = endDate.toISOString().slice(0, 10);

  const activeQuote = computeRentalQuote({
    dailyPriceHalalas: asset2.dailyRentalPriceHalalas!,
    durationDays: 5,
  });
  const activeCommitmentHalalas = asset2.evaluatedValueHalalas!;

  const [activeRental] = await db
    .insert(rentals)
    .values({
      reference: "MLR-2024-001001",
      assetId: asset2.id,
      renterId: renter.id,
      ownerId: owner.id,
      status: "active",
      startDate: startIso,
      endDate: endIso,
      durationDays: 5,
      dailyPriceHalalas: activeQuote.dailyPriceHalalas,
      rentalSubtotalHalalas: activeQuote.rentalSubtotalHalalas,
      platformFeeHalalas: activeQuote.platformFeeHalalas,
      vatHalalas: activeQuote.vatHalalas,
      totalPayableHalalas: activeQuote.totalPayableHalalas,
      trustScoreAtBooking: 82,
      legalCommitmentPct: 100,
      legalCommitmentHalalas: activeCommitmentHalalas,
      riskSnapshotJson: {
        finalScore: 82,
        riskCategory: "low",
        modifiers: [{ key: "rentals_3", delta: 8, reason: "3+ completed rentals" }],
      } as object,
      deliveryAddressJson: {
        city: "Riyadh",
        district: "Al Olaya",
        street: "King Fahd Rd",
      } as object,
      confirmedAt: startDate,
      deliveredAt: startDate,
    })
    .returning();

  await db.insert(riskScores).values({
    userId: renter.id,
    rentalId: activeRental.id,
    accountAgeDays: 200,
    completedRentals: 3,
    disputedRentals: 0,
    cancelledRentals: 0,
    lateReturns: 0,
    nafathVerified: true,
    baseScore: 50,
    modifiersJson: [] as unknown as object,
    finalScore: 82,
    riskCategory: "low",
    approved: true,
    legalCommitmentPct: 100,
    legalCommitmentHalalas: activeCommitmentHalalas,
  });

  const legal = generateLegalCommitment({
    rentalReference: activeRental.reference,
    renterFullName: renter.fullName,
    renterNationalId: renter.nationalId!,
    assetTitle: asset2.title,
    assetEvaluatedValueHalalas: asset2.evaluatedValueHalalas!,
    commitmentPct: 100,
    commitmentHalalas: activeCommitmentHalalas,
    rentalStartDate: startIso,
    rentalEndDate: endIso,
    rentalTotalHalalas: activeQuote.totalPayableHalalas,
  });

  const [legalCommitment] = await db
    .insert(legalCommitments)
    .values({
      rentalId: activeRental.id,
      renterId: renter.id,
      status: "active",
      contractVersion: legal.version,
      contractTextHash: legal.textHash,
      clausesJson: legal.clauses as unknown as object,
      commitmentHalalas: activeCommitmentHalalas,
      commitmentPct: 100,
      signedAt: startDate,
    })
    .returning();

  await db.insert(sanadRecords).values({
    rentalId: activeRental.id,
    legalCommitmentId: legalCommitment.id,
    renterId: renter.id,
    status: "active",
    nafithReference: "NFT-DEMO-ACTIVE",
    nafithRequestId: "REQ-DEMO-1",
    issuedAt: startDate,
    signedAt: startDate,
    maturityDate: endIso,
    principalHalalas: activeCommitmentHalalas,
    dueHalalas: activeCommitmentHalalas,
  });

  await db.insert(payments).values({
    rentalId: activeRental.id,
    userId: renter.id,
    type: "rental_fee",
    status: "captured",
    amountHalalas: activeQuote.totalPayableHalalas,
    gateway: "hyperpay",
    gatewayTransactionId: "PAY-DEMO-ACTIVE",
    invoiceNumber: "INV-2024-00000001",
    invoiceXmlUrl: "https://zatca-stub.local/INV-2024-00000001.xml",
    invoiceQrBase64: Buffer.from("INV-2024-00000001").toString("base64"),
    invoicedAt: startDate,
    capturedAt: startDate,
  });

  await db.insert(shipments).values({
    assetId: asset2.id,
    rentalId: activeRental.id,
    direction: "platform_to_renter",
    status: "delivered",
    courier: "SMSA",
    trackingNumber: "SMSA-1234567",
    scheduledAt: startDate,
    pickedUpAt: startDate,
    deliveredAt: startDate,
  });

  // ── Closed rental (happy path, last month) ───────────────────────────
  const closedStart = new Date();
  closedStart.setDate(closedStart.getDate() - 35);
  const closedEnd = new Date();
  closedEnd.setDate(closedEnd.getDate() - 32);
  const closedStartIso = closedStart.toISOString().slice(0, 10);
  const closedEndIso = closedEnd.toISOString().slice(0, 10);
  const closedQuote = computeRentalQuote({
    dailyPriceHalalas: asset1.dailyRentalPriceHalalas!,
    durationDays: 3,
  });

  const [closedRental] = await db
    .insert(rentals)
    .values({
      reference: "MLR-2024-000999",
      assetId: asset1.id,
      renterId: renter.id,
      ownerId: owner.id,
      status: "closed",
      startDate: closedStartIso,
      endDate: closedEndIso,
      durationDays: 3,
      dailyPriceHalalas: closedQuote.dailyPriceHalalas,
      rentalSubtotalHalalas: closedQuote.rentalSubtotalHalalas,
      platformFeeHalalas: closedQuote.platformFeeHalalas,
      vatHalalas: closedQuote.vatHalalas,
      totalPayableHalalas: closedQuote.totalPayableHalalas,
      trustScoreAtBooking: 78,
      legalCommitmentPct: 100,
      legalCommitmentHalalas: asset1.evaluatedValueHalalas!,
      riskSnapshotJson: { finalScore: 78, riskCategory: "low" } as object,
      confirmedAt: closedStart,
      deliveredAt: closedStart,
      returnedAt: closedEnd,
      closedAt: closedEnd,
    })
    .returning();

  const payout = computeOwnerPayout({
    rentalSubtotalHalalas: closedQuote.rentalSubtotalHalalas,
    commissionPct: 20,
  });
  await db.insert(payouts).values({
    ownerId: owner.id,
    rentalId: closedRental.id,
    grossHalalas: payout.grossHalalas,
    commissionHalalas: payout.commissionHalalas,
    netHalalas: payout.netHalalas,
    status: "paid",
    paidAt: closedEnd,
    reference: "PYO-2024-000999",
  });

  // ── Dispute on a third historical rental ─────────────────────────────
  const dispStart = new Date();
  dispStart.setDate(dispStart.getDate() - 15);
  const dispEnd = new Date();
  dispEnd.setDate(dispEnd.getDate() - 13);
  const dispQuote = computeRentalQuote({
    dailyPriceHalalas: asset3.dailyRentalPriceHalalas!,
    durationDays: 2,
  });

  const [dispRental] = await db
    .insert(rentals)
    .values({
      reference: "MLR-2024-001000",
      assetId: asset3.id,
      renterId: newRenter.id,
      ownerId: owner.id,
      status: "in_dispute",
      startDate: dispStart.toISOString().slice(0, 10),
      endDate: dispEnd.toISOString().slice(0, 10),
      durationDays: 2,
      dailyPriceHalalas: dispQuote.dailyPriceHalalas,
      rentalSubtotalHalalas: dispQuote.rentalSubtotalHalalas,
      platformFeeHalalas: dispQuote.platformFeeHalalas,
      vatHalalas: dispQuote.vatHalalas,
      totalPayableHalalas: dispQuote.totalPayableHalalas,
      trustScoreAtBooking: 55,
      legalCommitmentPct: 150,
      legalCommitmentHalalas: Math.round(asset3.evaluatedValueHalalas! * 1.5),
      riskSnapshotJson: {
        finalScore: 55,
        riskCategory: "medium",
        notes: ["new_or_untrusted_user:150pct"],
      } as object,
      confirmedAt: dispStart,
      deliveredAt: dispStart,
      returnedAt: dispEnd,
    })
    .returning();

  await db.insert(disputes).values({
    rentalId: dispRental.id,
    openedByUserId: owner.id,
    category: "damage",
    severity: "high",
    summary: "Stitching damage discovered on hemline during return inspection.",
    evidenceJson: [
      "https://picsum.photos/seed/damage1/600/400",
      "https://picsum.photos/seed/damage2/600/400",
    ] as unknown as object,
    status: "investigating",
  });

  await db.insert(operationalAlerts).values([
    {
      type: "late_return",
      severity: "high",
      subjectType: "rental",
      subjectId: activeRental.id,
      message: `Rental ${activeRental.reference} is approaching end date.`,
    },
    {
      type: "dispute_opened",
      severity: "medium",
      subjectType: "rental",
      subjectId: dispRental.id,
      message: `Dispute opened on rental ${dispRental.reference}.`,
    },
  ]);

  await db.insert(inventoryMovements).values([
    {
      assetId: asset1.id,
      fromLocation: "owner",
      toLocation: "KSA-RUH-A1-03",
      movedByUserId: ops.id,
      reason: "intake_received",
    },
    {
      assetId: asset2.id,
      fromLocation: "KSA-RUH-A1-04",
      toLocation: "renter",
      movedByUserId: ops.id,
      reason: "delivered_to_renter",
    },
  ]);

  console.log("✅ Seed complete.");
  console.log("\nDemo credentials (password for all: Mlr@2024!):");
  console.log("  super@mlr.sa     (super_admin)");
  console.log("  admin@mlr.sa     (admin)");
  console.log("  inspector@mlr.sa (inspector)");
  console.log("  ops@mlr.sa       (operations)");
  console.log("  owner@mlr.sa     (owner)");
  console.log("  renter@mlr.sa    (renter - trusted)");
  console.log("  new.renter@mlr.sa (renter - new, 150% commitment)");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
