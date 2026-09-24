import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  AssetSubmissionSchema,
  RentalCloseSchema,
  ValuationResponseSchema,
  AssetReceivedSchema,
  AdminBlockUserSchema,
  AdminCreateUserSchema,
  DisputeAssignSchema,
  SaudiPhone,
  SaudiNationalId,
  IsoDate,
} from "./schemas.js";

describe("SaudiPhone", () => {
  it("accepts valid Saudi number", () => {
    expect(SaudiPhone.safeParse("+966512345678").success).toBe(true);
    expect(SaudiPhone.safeParse("966512345678").success).toBe(true);
  });
  it("rejects non-Saudi number", () => {
    expect(SaudiPhone.safeParse("+1234567890").success).toBe(false);
  });
});

describe("SaudiNationalId", () => {
  it("accepts valid 10-digit ID", () => {
    expect(SaudiNationalId.safeParse("1234567890").success).toBe(true);
    expect(SaudiNationalId.safeParse("2345678901").success).toBe(true);
  });
  it("rejects invalid IDs", () => {
    expect(SaudiNationalId.safeParse("3456789012").success).toBe(false);
    expect(SaudiNationalId.safeParse("123").success).toBe(false);
  });
});

describe("IsoDate", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(IsoDate.safeParse("2024-06-15").success).toBe(true);
  });
  it("rejects other formats", () => {
    expect(IsoDate.safeParse("15/06/2024").success).toBe(false);
    expect(IsoDate.safeParse("2024-6-5").success).toBe(false);
  });
});

describe("RegisterSchema", () => {
  it("accepts valid registration", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "SecurePass1",
      fullName: "Test User",
    });
    expect(result.success).toBe(true);
  });
  it("rejects short password", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "short",
      fullName: "Test",
    });
    expect(result.success).toBe(false);
  });
  it("defaults role to renter", () => {
    const result = RegisterSchema.parse({
      email: "test@example.com",
      password: "SecurePass1",
      fullName: "Test User",
    });
    expect(result.role).toBe("renter");
  });
});

describe("AssetSubmissionSchema", () => {
  it("accepts valid submission with handbag", () => {
    const result = AssetSubmissionSchema.safeParse({
      category: "handbag",
      brand: "Hermes",
      title: "Birkin 30",
      ownerDeclaredValueHalalas: 1_000_000,
      submissionImages: ["https://example.com/photo.jpg"],
    });
    expect(result.success).toBe(true);
  });
  it("rejects invalid category 'bag'", () => {
    const result = AssetSubmissionSchema.safeParse({
      category: "bag",
      brand: "Hermes",
      title: "Birkin 30",
      ownerDeclaredValueHalalas: 1_000_000,
      submissionImages: ["https://example.com/photo.jpg"],
    });
    expect(result.success).toBe(false);
  });
  it("requires at least one image", () => {
    const result = AssetSubmissionSchema.safeParse({
      category: "handbag",
      brand: "Hermes",
      title: "Birkin 30",
      ownerDeclaredValueHalalas: 1_000_000,
      submissionImages: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("RentalCloseSchema", () => {
  it("accepts clean outcome", () => {
    expect(RentalCloseSchema.safeParse({ outcome: "clean" }).success).toBe(true);
  });
  it("accepts penalty with amount", () => {
    expect(
      RentalCloseSchema.safeParse({ outcome: "penalty", penaltyHalalas: 5000 }).success
    ).toBe(true);
  });
  it("rejects invalid outcome", () => {
    expect(RentalCloseSchema.safeParse({ outcome: "unknown" }).success).toBe(false);
  });
});

describe("ValuationResponseSchema", () => {
  it("accepts approval", () => {
    expect(ValuationResponseSchema.safeParse({ approved: true }).success).toBe(true);
  });
  it("accepts rejection with reason", () => {
    expect(
      ValuationResponseSchema.safeParse({ approved: false, rejectionReason: "Too low" }).success
    ).toBe(true);
  });
  it("rejects missing approved field", () => {
    expect(ValuationResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe("AssetReceivedSchema", () => {
  it("accepts valid location code", () => {
    expect(AssetReceivedSchema.safeParse({ warehouseLocationCode: "A-12" }).success).toBe(true);
  });
  it("rejects empty location code", () => {
    expect(AssetReceivedSchema.safeParse({ warehouseLocationCode: "" }).success).toBe(false);
  });
});

describe("AdminCreateUserSchema", () => {
  it("accepts valid staff creation", () => {
    const result = AdminCreateUserSchema.safeParse({
      email: "inspector@mlr.sa",
      password: "SecurePass1",
      fullName: "New Inspector",
      role: "inspector",
    });
    expect(result.success).toBe(true);
  });
  it("rejects renter role for staff", () => {
    const result = AdminCreateUserSchema.safeParse({
      email: "test@mlr.sa",
      password: "SecurePass1",
      fullName: "Test",
      role: "renter",
    });
    expect(result.success).toBe(false);
  });
});

describe("DisputeAssignSchema", () => {
  it("accepts valid user id", () => {
    expect(DisputeAssignSchema.safeParse({ assigneeUserId: 5 }).success).toBe(true);
  });
  it("rejects non-positive id", () => {
    expect(DisputeAssignSchema.safeParse({ assigneeUserId: 0 }).success).toBe(false);
    expect(DisputeAssignSchema.safeParse({ assigneeUserId: -1 }).success).toBe(false);
  });
});
