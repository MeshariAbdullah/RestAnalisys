import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  AssetSubmissionSchema,
  AssetListingFilter,
  RentalQuoteRequestSchema,
  DisputeOpenSchema,
  DisputeAssignSchema,
  DisputeResolveSchema,
  PaymentChargeSchema,
  SaudiPhone,
  SaudiNationalId,
  IsoDate,
  HalalasAmount,
} from "./schemas.js";

describe("Primitive validators", () => {
  it("SaudiPhone accepts valid numbers", () => {
    expect(SaudiPhone.safeParse("+966512345678").success).toBe(true);
    expect(SaudiPhone.safeParse("966512345678").success).toBe(true);
  });

  it("SaudiPhone rejects invalid numbers", () => {
    expect(SaudiPhone.safeParse("+1234567890").success).toBe(false);
    expect(SaudiPhone.safeParse("0512345678").success).toBe(false);
    expect(SaudiPhone.safeParse("").success).toBe(false);
  });

  it("SaudiNationalId accepts valid 10-digit IDs", () => {
    expect(SaudiNationalId.safeParse("1234567890").success).toBe(true);
    expect(SaudiNationalId.safeParse("2345678901").success).toBe(true);
  });

  it("SaudiNationalId rejects invalid IDs", () => {
    expect(SaudiNationalId.safeParse("3456789012").success).toBe(false);
    expect(SaudiNationalId.safeParse("12345").success).toBe(false);
  });

  it("IsoDate accepts YYYY-MM-DD", () => {
    expect(IsoDate.safeParse("2024-12-01").success).toBe(true);
  });

  it("IsoDate rejects other formats", () => {
    expect(IsoDate.safeParse("12/01/2024").success).toBe(false);
    expect(IsoDate.safeParse("2024-1-1").success).toBe(false);
  });

  it("HalalasAmount accepts non-negative integers", () => {
    expect(HalalasAmount.safeParse(0).success).toBe(true);
    expect(HalalasAmount.safeParse(100000).success).toBe(true);
  });

  it("HalalasAmount rejects negative and fractional values", () => {
    expect(HalalasAmount.safeParse(-1).success).toBe(false);
    expect(HalalasAmount.safeParse(1.5).success).toBe(false);
  });
});

describe("RegisterSchema", () => {
  it("accepts valid registration", () => {
    const result = RegisterSchema.safeParse({
      email: "user@example.com",
      password: "12345678",
      fullName: "Test User",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("renter");
    }
  });

  it("rejects short password", () => {
    expect(
      RegisterSchema.safeParse({
        email: "user@example.com",
        password: "short",
        fullName: "Test",
      }).success
    ).toBe(false);
  });
});

describe("AssetSubmissionSchema", () => {
  const valid = {
    category: "handbag",
    brand: "Hermès",
    title: "Birkin 30",
    ownerDeclaredValueHalalas: 18000000,
    submissionImages: ["https://example.com/img.jpg"],
  };

  it("accepts valid asset submission", () => {
    expect(AssetSubmissionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid category", () => {
    expect(
      AssetSubmissionSchema.safeParse({ ...valid, category: "bag" }).success
    ).toBe(false);
  });

  it("requires at least one submission image", () => {
    expect(
      AssetSubmissionSchema.safeParse({ ...valid, submissionImages: [] }).success
    ).toBe(false);
  });
});

describe("AssetListingFilter", () => {
  it("applies defaults", () => {
    const result = AssetListingFilter.parse({});
    expect(result.sortBy).toBe("newest");
    expect(result.limit).toBe(20);
  });

  it("accepts category filter", () => {
    const result = AssetListingFilter.parse({ category: "watch" });
    expect(result.category).toBe("watch");
  });

  it("accepts search query", () => {
    const result = AssetListingFilter.parse({ q: "birkin" });
    expect(result.q).toBe("birkin");
  });
});

describe("DisputeAssignSchema", () => {
  it("accepts valid assignee user ID", () => {
    expect(DisputeAssignSchema.safeParse({ assigneeUserId: 1 }).success).toBe(
      true
    );
  });

  it("rejects missing assignee user ID", () => {
    expect(DisputeAssignSchema.safeParse({}).success).toBe(false);
  });

  it("rejects non-positive assignee user ID", () => {
    expect(
      DisputeAssignSchema.safeParse({ assigneeUserId: 0 }).success
    ).toBe(false);
    expect(
      DisputeAssignSchema.safeParse({ assigneeUserId: -1 }).success
    ).toBe(false);
  });
});

describe("DisputeResolveSchema", () => {
  it("accepts valid resolution", () => {
    const result = DisputeResolveSchema.safeParse({
      disputeId: 1,
      resolution: "resolved_for_renter",
      notes: "Refund issued",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid resolution type", () => {
    expect(
      DisputeResolveSchema.safeParse({
        disputeId: 1,
        resolution: "invalid",
        notes: "test",
      }).success
    ).toBe(false);
  });
});

describe("PaymentChargeSchema", () => {
  it("accepts rental ID", () => {
    expect(PaymentChargeSchema.safeParse({ rentalId: 1 }).success).toBe(true);
  });

  it("rejects missing rental ID", () => {
    expect(PaymentChargeSchema.safeParse({}).success).toBe(false);
  });
});
