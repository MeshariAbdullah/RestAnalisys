import { describe, it, expect } from "vitest";
import {
  SaudiPhone,
  SaudiNationalId,
  IsoDate,
  HalalasAmount,
  RegisterSchema,
  LoginSchema,
  AssetCategory,
  RentalCreateSchema,
} from "../utils/schemas.js";

describe("SaudiPhone", () => {
  it("accepts valid Saudi numbers", () => {
    expect(SaudiPhone.safeParse("+966512345678").success).toBe(true);
    expect(SaudiPhone.safeParse("966512345678").success).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(SaudiPhone.safeParse("12345").success).toBe(false);
    expect(SaudiPhone.safeParse("+1234567890").success).toBe(false);
    expect(SaudiPhone.safeParse("").success).toBe(false);
  });
});

describe("SaudiNationalId", () => {
  it("accepts valid national IDs starting with 1 or 2", () => {
    expect(SaudiNationalId.safeParse("1234567890").success).toBe(true);
    expect(SaudiNationalId.safeParse("2098765432").success).toBe(true);
  });

  it("rejects invalid IDs", () => {
    expect(SaudiNationalId.safeParse("3234567890").success).toBe(false);
    expect(SaudiNationalId.safeParse("123456789").success).toBe(false);
    expect(SaudiNationalId.safeParse("12345678901").success).toBe(false);
    expect(SaudiNationalId.safeParse("").success).toBe(false);
  });
});

describe("IsoDate", () => {
  it("accepts YYYY-MM-DD format", () => {
    expect(IsoDate.safeParse("2024-06-01").success).toBe(true);
    expect(IsoDate.safeParse("2025-12-31").success).toBe(true);
  });

  it("rejects other formats", () => {
    expect(IsoDate.safeParse("06/01/2024").success).toBe(false);
    expect(IsoDate.safeParse("2024-6-1").success).toBe(false);
    expect(IsoDate.safeParse("").success).toBe(false);
  });
});

describe("HalalasAmount", () => {
  it("accepts non-negative integers", () => {
    expect(HalalasAmount.safeParse(0).success).toBe(true);
    expect(HalalasAmount.safeParse(100).success).toBe(true);
    expect(HalalasAmount.safeParse(10_000_000).success).toBe(true);
  });

  it("rejects negative numbers", () => {
    expect(HalalasAmount.safeParse(-1).success).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(HalalasAmount.safeParse(10.5).success).toBe(false);
  });
});

describe("RegisterSchema", () => {
  it("accepts valid registration", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "Secure123",
      fullName: "Test User",
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to renter", () => {
    const result = RegisterSchema.parse({
      email: "test@example.com",
      password: "Secure123",
      fullName: "Test User",
    });
    expect(result.role).toBe("renter");
  });

  it("rejects short passwords", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "short",
      fullName: "Test User",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const result = RegisterSchema.safeParse({
      email: "not-an-email",
      password: "Secure123",
      fullName: "Test User",
    });
    expect(result.success).toBe(false);
  });

  it("only allows renter or owner role", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.com",
      password: "Secure123",
      fullName: "Test User",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts valid login", () => {
    expect(
      LoginSchema.safeParse({ email: "test@example.com", password: "abc" }).success
    ).toBe(true);
  });

  it("rejects empty password", () => {
    expect(
      LoginSchema.safeParse({ email: "test@example.com", password: "" }).success
    ).toBe(false);
  });
});

describe("AssetCategory", () => {
  it("accepts all valid categories", () => {
    const categories = ["handbag", "watch", "dress", "jewelry", "accessory", "other"];
    for (const cat of categories) {
      expect(AssetCategory.safeParse(cat).success).toBe(true);
    }
  });

  it("rejects invalid categories", () => {
    expect(AssetCategory.safeParse("car").success).toBe(false);
  });
});

describe("RentalCreateSchema", () => {
  it("accepts valid rental creation", () => {
    const result = RentalCreateSchema.safeParse({
      assetId: 1,
      startDate: "2024-06-01",
      endDate: "2024-06-08",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero assetId", () => {
    const result = RentalCreateSchema.safeParse({
      assetId: 0,
      startDate: "2024-06-01",
      endDate: "2024-06-08",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional delivery address", () => {
    const result = RentalCreateSchema.safeParse({
      assetId: 1,
      startDate: "2024-06-01",
      endDate: "2024-06-08",
      deliveryAddress: {
        city: "Riyadh",
        district: "Al Olaya",
        street: "King Fahd Road",
      },
    });
    expect(result.success).toBe(true);
  });
});
