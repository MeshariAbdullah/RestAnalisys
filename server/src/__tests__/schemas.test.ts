import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  RentalQuoteRequestSchema,
  RentalCreateSchema,
  DisputeOpenSchema,
  CreateStaffSchema,
  DisputeAssignSchema,
  AssetSubmissionSchema,
} from "../utils/schemas.js";

describe("RentalQuoteRequestSchema", () => {
  it("coerces string assetId from query params", () => {
    const result = RentalQuoteRequestSchema.parse({
      assetId: "42",
      startDate: "2024-06-01",
      endDate: "2024-06-08",
    });
    expect(result.assetId).toBe(42);
  });

  it("accepts numeric assetId", () => {
    const result = RentalQuoteRequestSchema.parse({
      assetId: 42,
      startDate: "2024-06-01",
      endDate: "2024-06-08",
    });
    expect(result.assetId).toBe(42);
  });

  it("rejects invalid date format", () => {
    expect(() =>
      RentalQuoteRequestSchema.parse({
        assetId: 1,
        startDate: "June 1",
        endDate: "2024-06-08",
      })
    ).toThrow();
  });
});

describe("CreateStaffSchema", () => {
  it("accepts valid staff creation", () => {
    const result = CreateStaffSchema.parse({
      email: "inspector@mlr.sa",
      password: "SecureP@ss1",
      fullName: "Ahmed Al-Inspector",
      role: "inspector",
    });
    expect(result.role).toBe("inspector");
  });

  it("rejects non-staff roles", () => {
    expect(() =>
      CreateStaffSchema.parse({
        email: "renter@demo.sa",
        password: "SecureP@ss1",
        fullName: "John Doe",
        role: "renter",
      })
    ).toThrow();
  });

  it("rejects short passwords", () => {
    expect(() =>
      CreateStaffSchema.parse({
        email: "admin@mlr.sa",
        password: "short",
        fullName: "Admin User",
        role: "admin",
      })
    ).toThrow();
  });
});

describe("DisputeAssignSchema", () => {
  it("validates positive integer user IDs", () => {
    const result = DisputeAssignSchema.parse({ assigneeUserId: 5 });
    expect(result.assigneeUserId).toBe(5);
  });

  it("rejects zero or negative IDs", () => {
    expect(() => DisputeAssignSchema.parse({ assigneeUserId: 0 })).toThrow();
    expect(() => DisputeAssignSchema.parse({ assigneeUserId: -1 })).toThrow();
  });
});

describe("RegisterSchema", () => {
  it("defaults role to renter", () => {
    const result = RegisterSchema.parse({
      email: "test@example.com",
      password: "longpassword",
      fullName: "Test User",
    });
    expect(result.role).toBe("renter");
  });

  it("only allows renter and owner roles", () => {
    expect(() =>
      RegisterSchema.parse({
        email: "test@example.com",
        password: "longpassword",
        fullName: "Test User",
        role: "admin",
      })
    ).toThrow();
  });
});

describe("DisputeOpenSchema", () => {
  it("requires a minimum summary length", () => {
    expect(() =>
      DisputeOpenSchema.parse({
        rentalId: 1,
        category: "damage",
        summary: "short",
      })
    ).toThrow();
  });

  it("defaults evidence to empty array", () => {
    const result = DisputeOpenSchema.parse({
      rentalId: 1,
      category: "damage",
      summary: "The item arrived with scratches on the dial",
    });
    expect(result.evidence).toEqual([]);
  });
});
