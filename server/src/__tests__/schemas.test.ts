import { describe, it, expect } from "vitest";
import {
  SaudiPhone,
  SaudiNationalId,
  IsoDate,
  HalalasAmount,
  RegisterSchema,
  LoginSchema,
  AssetSubmissionSchema,
  RentalCreateSchema,
  DisputeOpenSchema,
} from "../utils/schemas.js";

describe("SaudiPhone", () => {
  it("accepts valid Saudi numbers", () => {
    expect(SaudiPhone.safeParse("+966512345678").success).toBe(true);
    expect(SaudiPhone.safeParse("966512345678").success).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(SaudiPhone.safeParse("+1234567890").success).toBe(false);
    expect(SaudiPhone.safeParse("05123456789").success).toBe(false);
    expect(SaudiPhone.safeParse("").success).toBe(false);
  });
});

describe("SaudiNationalId", () => {
  it("accepts valid IDs starting with 1 or 2", () => {
    expect(SaudiNationalId.safeParse("1234567890").success).toBe(true);
    expect(SaudiNationalId.safeParse("2345678901").success).toBe(true);
  });

  it("rejects invalid IDs", () => {
    expect(SaudiNationalId.safeParse("3234567890").success).toBe(false);
    expect(SaudiNationalId.safeParse("123456789").success).toBe(false);
    expect(SaudiNationalId.safeParse("12345678901").success).toBe(false);
  });
});

describe("IsoDate", () => {
  it("accepts YYYY-MM-DD format", () => {
    expect(IsoDate.safeParse("2024-06-15").success).toBe(true);
    expect(IsoDate.safeParse("2025-01-01").success).toBe(true);
  });

  it("rejects other date formats", () => {
    expect(IsoDate.safeParse("06/15/2024").success).toBe(false);
    expect(IsoDate.safeParse("2024-6-15").success).toBe(false);
    expect(IsoDate.safeParse("2024-06-15T00:00:00Z").success).toBe(false);
  });
});

describe("HalalasAmount", () => {
  it("accepts non-negative integers", () => {
    expect(HalalasAmount.safeParse(0).success).toBe(true);
    expect(HalalasAmount.safeParse(100).success).toBe(true);
    expect(HalalasAmount.safeParse(1_500_000).success).toBe(true);
  });

  it("rejects negative and fractional numbers", () => {
    expect(HalalasAmount.safeParse(-1).success).toBe(false);
    expect(HalalasAmount.safeParse(1.5).success).toBe(false);
  });
});

describe("RegisterSchema", () => {
  it("validates a complete registration", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.sa",
      password: "StrongP@ss1",
      fullName: "Ahmed Mohammed",
      phone: "+966512345678",
      role: "renter",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short passwords", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.sa",
      password: "short",
      fullName: "Ahmed",
    });
    expect(result.success).toBe(false);
  });

  it("defaults role to renter", () => {
    const result = RegisterSchema.parse({
      email: "test@example.sa",
      password: "StrongP@ss1",
      fullName: "Ahmed",
    });
    expect(result.role).toBe("renter");
  });

  it("rejects invalid roles", () => {
    const result = RegisterSchema.safeParse({
      email: "test@example.sa",
      password: "StrongP@ss1",
      fullName: "Ahmed",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("validates email and password", () => {
    const result = LoginSchema.safeParse({
      email: "user@mlr.sa",
      password: "test",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = LoginSchema.safeParse({ password: "test" });
    expect(result.success).toBe(false);
  });
});

describe("AssetSubmissionSchema", () => {
  it("accepts valid submission with all categories", () => {
    for (const category of ["handbag", "watch", "dress", "jewelry", "accessory", "other"]) {
      const result = AssetSubmissionSchema.safeParse({
        category,
        brand: "Hermès",
        title: "Birkin 35",
        ownerDeclaredValueHalalas: 15_000_000,
        submissionImages: ["https://example.com/img.jpg"],
      });
      expect(result.success).toBe(true);
    }
  });

  it("requires at least one image", () => {
    const result = AssetSubmissionSchema.safeParse({
      category: "handbag",
      brand: "Hermès",
      title: "Birkin",
      ownerDeclaredValueHalalas: 15_000_000,
      submissionImages: [],
    });
    expect(result.success).toBe(false);
  });

  it("limits images to 20", () => {
    const result = AssetSubmissionSchema.safeParse({
      category: "handbag",
      brand: "Hermès",
      title: "Birkin",
      ownerDeclaredValueHalalas: 15_000_000,
      submissionImages: Array.from({ length: 21 }, (_, i) => `https://example.com/${i}.jpg`),
    });
    expect(result.success).toBe(false);
  });
});

describe("RentalCreateSchema", () => {
  it("validates basic rental creation", () => {
    const result = RentalCreateSchema.safeParse({
      assetId: 1,
      startDate: "2024-06-01",
      endDate: "2024-06-08",
    });
    expect(result.success).toBe(true);
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

describe("DisputeOpenSchema", () => {
  it("accepts all dispute categories", () => {
    for (const category of ["damage", "loss", "fraud", "service", "billing"]) {
      const result = DisputeOpenSchema.safeParse({
        rentalId: 1,
        category,
        summary: "Test dispute summary text",
      });
      expect(result.success).toBe(true);
    }
  });

  it("requires summary of at least 10 characters", () => {
    const result = DisputeOpenSchema.safeParse({
      rentalId: 1,
      category: "damage",
      summary: "short",
    });
    expect(result.success).toBe(false);
  });
});
