import { describe, it, expect } from "vitest";
import { generateLegalCommitment } from "../services/legalService.js";

const defaultInput = {
  rentalReference: "MLR-2024-123456",
  renterFullName: "Ahmed Al-Dosari",
  renterNationalId: "1234567890",
  assetTitle: "Hermès Birkin 25",
  assetEvaluatedValueHalalas: 5_000_000,
  commitmentPct: 150 as const,
  commitmentHalalas: 7_500_000,
  rentalStartDate: "2024-06-01",
  rentalEndDate: "2024-06-07",
  rentalTotalHalalas: 207_000,
};

describe("generateLegalCommitment", () => {
  it("returns version, clauses, text, and hash", () => {
    const result = generateLegalCommitment(defaultInput);
    expect(result.version).toBe("v1.0");
    expect(result.clauses).toHaveLength(8);
    expect(result.canonicalText).toBeTruthy();
    expect(result.textHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates all 8 clause IDs", () => {
    const result = generateLegalCommitment(defaultInput);
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

  it("includes bilingual content (EN/AR)", () => {
    const result = generateLegalCommitment(defaultInput);
    for (const clause of result.clauses) {
      expect(clause.titleEn).toBeTruthy();
      expect(clause.titleAr).toBeTruthy();
      expect(clause.bodyEn).toBeTruthy();
      expect(clause.bodyAr).toBeTruthy();
    }
  });

  it("embeds renter name and national ID in parties clause", () => {
    const result = generateLegalCommitment(defaultInput);
    const parties = result.clauses.find((c) => c.id === "parties")!;
    expect(parties.bodyEn).toContain("Ahmed Al-Dosari");
    expect(parties.bodyEn).toContain("1234567890");
    expect(parties.bodyAr).toContain("Ahmed Al-Dosari");
  });

  it("embeds commitment percentage and amount", () => {
    const result = generateLegalCommitment(defaultInput);
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("150%");
    expect(commitment.bodyAr).toContain("150%");
  });

  it("produces a deterministic hash for same input", () => {
    const r1 = generateLegalCommitment(defaultInput);
    const r2 = generateLegalCommitment(defaultInput);
    expect(r1.textHash).toBe(r2.textHash);
  });

  it("produces different hash for different input", () => {
    const r1 = generateLegalCommitment(defaultInput);
    const r2 = generateLegalCommitment({
      ...defaultInput,
      renterFullName: "Sara Al-Qahtani",
    });
    expect(r1.textHash).not.toBe(r2.textHash);
  });

  it("includes rental reference in canonical text", () => {
    const result = generateLegalCommitment(defaultInput);
    expect(result.canonicalText).toContain("MLR-2024-123456");
  });

  it("includes rental dates in period clause", () => {
    const result = generateLegalCommitment(defaultInput);
    const period = result.clauses.find((c) => c.id === "period")!;
    expect(period.bodyEn).toContain("2024-06-01");
    expect(period.bodyEn).toContain("2024-06-07");
  });
});
