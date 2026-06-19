import { describe, it, expect } from "vitest";
import { generateLegalCommitment } from "../services/legalService.js";

const baseInput = {
  rentalReference: "MLR-2024-123456",
  renterFullName: "Ahmed Al-Saud",
  renterNationalId: "1234567890",
  assetTitle: "Hermès Birkin 30 - Black Togo",
  assetEvaluatedValueHalalas: 5_000_000,
  commitmentPct: 100 as const,
  commitmentHalalas: 5_000_000,
  rentalStartDate: "2024-06-01",
  rentalEndDate: "2024-06-08",
  rentalTotalHalalas: 150_000,
};

describe("generateLegalCommitment", () => {
  it("returns version v1.0", () => {
    const result = generateLegalCommitment(baseInput);
    expect(result.version).toBe("v1.0");
  });

  it("generates exactly 8 clauses", () => {
    const result = generateLegalCommitment(baseInput);
    expect(result.clauses).toHaveLength(8);
  });

  it("produces all required clause IDs", () => {
    const result = generateLegalCommitment(baseInput);
    const ids = result.clauses.map((c) => c.id);
    expect(ids).toEqual([
      "parties",
      "asset",
      "period",
      "obligation",
      "commitment",
      "damage",
      "platform_guarantee",
      "jurisdiction",
    ]);
  });

  it("includes renter name and national ID in parties clause", () => {
    const result = generateLegalCommitment(baseInput);
    const parties = result.clauses.find((c) => c.id === "parties")!;
    expect(parties.bodyEn).toContain("Ahmed Al-Saud");
    expect(parties.bodyEn).toContain("1234567890");
    expect(parties.bodyAr).toContain("Ahmed Al-Saud");
    expect(parties.bodyAr).toContain("1234567890");
  });

  it("includes asset title in asset clause", () => {
    const result = generateLegalCommitment(baseInput);
    const asset = result.clauses.find((c) => c.id === "asset")!;
    expect(asset.bodyEn).toContain("Hermès Birkin 30");
  });

  it("includes rental dates in period clause", () => {
    const result = generateLegalCommitment(baseInput);
    const period = result.clauses.find((c) => c.id === "period")!;
    expect(period.bodyEn).toContain("2024-06-01");
    expect(period.bodyEn).toContain("2024-06-08");
    expect(period.bodyEn).toContain("MLR-2024-123456");
  });

  it("includes commitment percentage and amount", () => {
    const result = generateLegalCommitment(baseInput);
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("100%");
  });

  it("each clause has both English and Arabic titles and bodies", () => {
    const result = generateLegalCommitment(baseInput);
    for (const clause of result.clauses) {
      expect(clause.titleEn).toBeTruthy();
      expect(clause.titleAr).toBeTruthy();
      expect(clause.bodyEn).toBeTruthy();
      expect(clause.bodyAr).toBeTruthy();
    }
  });

  it("generates a SHA-256 hash of the canonical text", () => {
    const result = generateLegalCommitment(baseInput);
    expect(result.textHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates deterministic hashes for same input", () => {
    const result1 = generateLegalCommitment(baseInput);
    const result2 = generateLegalCommitment(baseInput);
    expect(result1.textHash).toBe(result2.textHash);
  });

  it("generates different hashes for different inputs", () => {
    const result1 = generateLegalCommitment(baseInput);
    const result2 = generateLegalCommitment({
      ...baseInput,
      renterFullName: "Fatimah Al-Rashid",
    });
    expect(result1.textHash).not.toBe(result2.textHash);
  });

  it("canonical text contains all key fields", () => {
    const result = generateLegalCommitment(baseInput);
    expect(result.canonicalText).toContain("MLR-2024-123456");
    expect(result.canonicalText).toContain("Ahmed Al-Saud");
    expect(result.canonicalText).toContain("5000000");
    expect(result.canonicalText).toContain("100%");
  });

  it("handles 150% commitment correctly", () => {
    const result = generateLegalCommitment({
      ...baseInput,
      commitmentPct: 150,
      commitmentHalalas: 7_500_000,
    });
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("150%");
    expect(commitment.bodyAr).toContain("150%");
  });
});
