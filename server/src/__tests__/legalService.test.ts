import { describe, it, expect } from "vitest";
import { generateLegalCommitment } from "../services/legalService.js";

const sampleInput = {
  rentalReference: "MLR-2024-123456",
  renterFullName: "Ahmed Al-Rashid",
  renterNationalId: "1234567890",
  assetTitle: "Hermès Birkin 25 - Noir Togo",
  assetEvaluatedValueHalalas: 8_000_000,
  commitmentPct: 150 as const,
  commitmentHalalas: 12_000_000,
  rentalStartDate: "2024-07-01",
  rentalEndDate: "2024-07-14",
  rentalTotalHalalas: 2_300_000,
};

describe("generateLegalCommitment", () => {
  it("returns version, clauses, canonicalText, and textHash", () => {
    const result = generateLegalCommitment(sampleInput);
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("clauses");
    expect(result).toHaveProperty("canonicalText");
    expect(result).toHaveProperty("textHash");
  });

  it("returns a valid SHA-256 hex hash (64 characters)", () => {
    const result = generateLegalCommitment(sampleInput);
    expect(result.textHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces deterministic hash for the same input", () => {
    const a = generateLegalCommitment(sampleInput);
    const b = generateLegalCommitment(sampleInput);
    expect(a.textHash).toBe(b.textHash);
  });

  it("produces different hash for different inputs", () => {
    const a = generateLegalCommitment(sampleInput);
    const b = generateLegalCommitment({
      ...sampleInput,
      renterFullName: "Sara Al-Qahtani",
    });
    expect(a.textHash).not.toBe(b.textHash);
  });

  it("includes all 8 required clauses", () => {
    const result = generateLegalCommitment(sampleInput);
    expect(result.clauses).toHaveLength(8);
    const clauseIds = result.clauses.map((c) => c.id);
    expect(clauseIds).toContain("parties");
    expect(clauseIds).toContain("asset");
    expect(clauseIds).toContain("period");
    expect(clauseIds).toContain("obligation");
    expect(clauseIds).toContain("commitment");
    expect(clauseIds).toContain("damage");
    expect(clauseIds).toContain("platform_guarantee");
    expect(clauseIds).toContain("jurisdiction");
  });

  it("includes bilingual content (English and Arabic)", () => {
    const result = generateLegalCommitment(sampleInput);
    for (const clause of result.clauses) {
      expect(clause.titleEn.length).toBeGreaterThan(0);
      expect(clause.titleAr.length).toBeGreaterThan(0);
      expect(clause.bodyEn.length).toBeGreaterThan(0);
      expect(clause.bodyAr.length).toBeGreaterThan(0);
    }
  });

  it("includes renter name in the parties clause", () => {
    const result = generateLegalCommitment(sampleInput);
    const parties = result.clauses.find((c) => c.id === "parties")!;
    expect(parties.bodyEn).toContain("Ahmed Al-Rashid");
    expect(parties.bodyAr).toContain("Ahmed Al-Rashid");
  });

  it("includes commitment percentage in the commitment clause", () => {
    const result = generateLegalCommitment(sampleInput);
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("150%");
  });

  it("reflects 100% commitment for trusted users", () => {
    const result = generateLegalCommitment({
      ...sampleInput,
      commitmentPct: 100,
      commitmentHalalas: 8_000_000,
    });
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("100%");
  });

  it("includes canonical text with all key data points", () => {
    const result = generateLegalCommitment(sampleInput);
    expect(result.canonicalText).toContain("MLR-2024-123456");
    expect(result.canonicalText).toContain("Ahmed Al-Rashid");
    expect(result.canonicalText).toContain("1234567890");
    expect(result.canonicalText).toContain("Hermès Birkin");
    expect(result.canonicalText).toContain("8000000");
    expect(result.canonicalText).toContain("150%");
    expect(result.canonicalText).toContain("12000000");
  });
});
