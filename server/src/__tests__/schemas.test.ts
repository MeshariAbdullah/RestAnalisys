import { describe, it, expect } from "vitest";
import {
  SaudiPhone,
  SaudiNationalId,
  IsoDate,
  RegisterSchema,
  LoginSchema,
  AssetSubmissionSchema,
  RentalCreateSchema,
  RentalQuoteRequestSchema,
  DisputeOpenSchema,
  InspectionReportSchema,
} from "../utils/schemas.js";

describe("primitive schemas", () => {
  describe("SaudiPhone", () => {
    it("accepts valid Saudi mobile", () => {
      expect(SaudiPhone.safeParse("+966512345678").success).toBe(true);
      expect(SaudiPhone.safeParse("966512345678").success).toBe(true);
    });
    it("rejects invalid numbers", () => {
      expect(SaudiPhone.safeParse("+1234567890").success).toBe(false);
      expect(SaudiPhone.safeParse("05123456").success).toBe(false);
    });
  });

  describe("SaudiNationalId", () => {
    it("accepts valid 10-digit IDs starting with 1 or 2", () => {
      expect(SaudiNationalId.safeParse("1234567890").success).toBe(true);
      expect(SaudiNationalId.safeParse("2098765432").success).toBe(true);
    });
    it("rejects invalid IDs", () => {
      expect(SaudiNationalId.safeParse("3234567890").success).toBe(false);
      expect(SaudiNationalId.safeParse("123").success).toBe(false);
    });
  });

  describe("IsoDate", () => {
    it("accepts YYYY-MM-DD", () => {
      expect(IsoDate.safeParse("2024-06-15").success).toBe(true);
    });
    it("rejects other formats", () => {
      expect(IsoDate.safeParse("06/15/2024").success).toBe(false);
      expect(IsoDate.safeParse("2024-6-15").success).toBe(false);
    });
  });
});

describe("RegisterSchema", () => {
  const valid = {
    email: "test@example.com",
    password: "securepass123",
    fullName: "Test User",
    role: "renter",
  };

  it("accepts valid registration", () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short password", () => {
    expect(RegisterSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(RegisterSchema.safeParse({ ...valid, email: "not-email" }).success).toBe(false);
  });

  it("defaults role to renter", () => {
    const { email, password, fullName } = valid;
    const result = RegisterSchema.parse({ email, password, fullName });
    expect(result.role).toBe("renter");
  });

  it("only allows renter or owner roles", () => {
    expect(RegisterSchema.safeParse({ ...valid, role: "admin" }).success).toBe(false);
  });
});

describe("AssetSubmissionSchema", () => {
  const valid = {
    category: "handbag",
    brand: "Hermès",
    title: "Birkin 25 Togo",
    ownerDeclaredValueHalalas: 5_000_000,
    submissionImages: ["https://example.com/img1.jpg"],
  };

  it("accepts valid submission", () => {
    expect(AssetSubmissionSchema.safeParse(valid).success).toBe(true);
  });

  it("requires at least 1 image", () => {
    expect(
      AssetSubmissionSchema.safeParse({ ...valid, submissionImages: [] }).success
    ).toBe(false);
  });

  it("limits to 20 images", () => {
    const tooMany = Array(21).fill("https://example.com/img.jpg");
    expect(
      AssetSubmissionSchema.safeParse({ ...valid, submissionImages: tooMany }).success
    ).toBe(false);
  });

  it("requires valid URLs for images", () => {
    expect(
      AssetSubmissionSchema.safeParse({ ...valid, submissionImages: ["not-a-url"] }).success
    ).toBe(false);
  });
});

describe("RentalCreateSchema", () => {
  const valid = {
    assetId: 1,
    startDate: "2024-07-01",
    endDate: "2024-07-07",
  };

  it("accepts valid rental", () => {
    expect(RentalCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional delivery address", () => {
    const result = RentalCreateSchema.safeParse({
      ...valid,
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
  it("validates dispute categories", () => {
    const valid = {
      rentalId: 1,
      category: "damage",
      summary: "Item received with scratches not documented before rental.",
    };
    expect(DisputeOpenSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown category", () => {
    expect(
      DisputeOpenSchema.safeParse({
        rentalId: 1,
        category: "unknown",
        summary: "Something happened to the item.",
      }).success
    ).toBe(false);
  });
});
