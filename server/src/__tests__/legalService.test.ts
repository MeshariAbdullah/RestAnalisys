import { describe, it, expect } from "vitest";
import { generateLegalCommitment } from "../services/legalService.js";

const BASE_INPUT = {
  rentalReference: "MLR-2024-123456",
  renterFullName: "Ahmed Mohammed",
  renterNationalId: "1234567890",
  assetTitle: "Hermès Birkin 35 Black Togo",
  assetEvaluatedValueHalalas: 15_000_000,
  commitmentPct: 150 as const,
  commitmentHalalas: 22_500_000,
  rentalStartDate: "2024-06-01",
  rentalEndDate: "2024-06-08",
  rentalTotalHalalas: 345_000,
};

describe("generateLegalCommitment", () => {
  it("returns version v1.0", () => {
    const result = generateLegalCommitment(BASE_INPUT);
    expect(result.version).toBe("v1.0");
  });

  it("produces exactly 8 legal clauses", () => {
    const result = generateLegalCommitment(BASE_INPUT);
    expect(result.clauses).toHaveLength(8);
    const ids = result.clauses.map((c) => c.id);
    expect(ids).toContain("parties");
    expect(ids).toContain("asset");
    expect(ids).toContain("period");
    expect(ids).toContain("obligation");
    expect(ids).toContain("commitment");
    expect(ids).toContain("damage");
    expect(ids).toContain("platform_guarantee");
    expect(ids).toContain("jurisdiction");
  });

  it("includes both English and Arabic text for each clause", () => {
    const result = generateLegalCommitment(BASE_INPUT);
    for (const clause of result.clauses) {
      expect(clause.titleEn.length).toBeGreaterThan(0);
      expect(clause.titleAr.length).toBeGreaterThan(0);
      expect(clause.bodyEn.length).toBeGreaterThan(0);
      expect(clause.bodyAr.length).toBeGreaterThan(0);
    }
  });

  it("embeds the renter's name and national ID in the contract", () => {
    const result = generateLegalCommitment(BASE_INPUT);
    expect(result.canonicalText).toContain("Ahmed Mohammed");
    expect(result.canonicalText).toContain("1234567890");
  });

  it("embeds asset title and rental reference", () => {
    const result = generateLegalCommitment(BASE_INPUT);
    expect(result.canonicalText).toContain("Hermès Birkin 35 Black Togo");
    expect(result.canonicalText).toContain("MLR-2024-123456");
  });

  it("embeds correct commitment percentage", () => {
    const result = generateLegalCommitment(BASE_INPUT);
    expect(result.canonicalText).toContain("150%");
  });

  it("produces a 64-char hex SHA-256 hash", () => {
    const result = generateLegalCommitment(BASE_INPUT);
    expect(result.textHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces a deterministic hash for same input", () => {
    const a = generateLegalCommitment(BASE_INPUT);
    const b = generateLegalCommitment(BASE_INPUT);
    expect(a.textHash).toBe(b.textHash);
  });

  it("produces different hash for different input", () => {
    const a = generateLegalCommitment(BASE_INPUT);
    const b = generateLegalCommitment({ ...BASE_INPUT, renterFullName: "Fatima Ali" });
    expect(a.textHash).not.toBe(b.textHash);
  });

  it("mentions jurisdiction is Saudi Arabia", () => {
    const result = generateLegalCommitment(BASE_INPUT);
    const jurisdiction = result.clauses.find((c) => c.id === "jurisdiction");
    expect(jurisdiction?.bodyEn).toContain("Kingdom of Saudi Arabia");
    expect(jurisdiction?.bodyAr).toContain("المملكة العربية السعودية");
  });

  it("includes platform guarantee clause", () => {
    const result = generateLegalCommitment(BASE_INPUT);
    const guarantee = result.clauses.find((c) => c.id === "platform_guarantee");
    expect(guarantee?.bodyEn).toContain("guarantees to the asset's owner");
    expect(guarantee?.bodyEn).toContain("full compensation");
  });
});
