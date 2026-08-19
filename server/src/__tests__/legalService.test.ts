import { describe, it, expect } from "vitest";
import {
  generateLegalCommitment,
  type LegalCommitmentInput,
} from "../services/legalService.js";

function baseInput(overrides: Partial<LegalCommitmentInput> = {}): LegalCommitmentInput {
  return {
    rentalReference: "MLR-2024-100001",
    renterFullName: "Sara AlOtaibi",
    renterNationalId: "1000000006",
    assetTitle: "Hermès Birkin 30 — Gold Togo",
    assetEvaluatedValueHalalas: 17_500_000,
    commitmentPct: 100,
    commitmentHalalas: 17_500_000,
    rentalStartDate: "2024-06-01",
    rentalEndDate: "2024-06-06",
    rentalTotalHalalas: 1_242_000,
    ...overrides,
  };
}

describe("generateLegalCommitment", () => {
  it("returns 8 clauses", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.clauses).toHaveLength(8);
  });

  it("includes all required clause IDs", () => {
    const result = generateLegalCommitment(baseInput());
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

  it("includes bilingual content in each clause", () => {
    const result = generateLegalCommitment(baseInput());
    for (const clause of result.clauses) {
      expect(clause.titleEn.length).toBeGreaterThan(0);
      expect(clause.titleAr.length).toBeGreaterThan(0);
      expect(clause.bodyEn.length).toBeGreaterThan(0);
      expect(clause.bodyAr.length).toBeGreaterThan(0);
    }
  });

  it("embeds renter name and national ID in the parties clause", () => {
    const result = generateLegalCommitment(baseInput());
    const parties = result.clauses.find((c) => c.id === "parties")!;
    expect(parties.bodyEn).toContain("Sara AlOtaibi");
    expect(parties.bodyEn).toContain("1000000006");
    expect(parties.bodyAr).toContain("Sara AlOtaibi");
  });

  it("embeds commitment percentage in the commitment clause", () => {
    const result = generateLegalCommitment(
      baseInput({ commitmentPct: 150, commitmentHalalas: 26_250_000 })
    );
    const clause = result.clauses.find((c) => c.id === "commitment")!;
    expect(clause.bodyEn).toContain("150%");
    expect(clause.bodyAr).toContain("150%");
  });

  it("generates a valid SHA-256 hash (64 hex chars)", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.textHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces a deterministic hash for the same input", () => {
    const a = generateLegalCommitment(baseInput());
    const b = generateLegalCommitment(baseInput());
    expect(a.textHash).toBe(b.textHash);
  });

  it("produces different hashes for different inputs", () => {
    const a = generateLegalCommitment(baseInput());
    const b = generateLegalCommitment(baseInput({ renterFullName: "Different Person" }));
    expect(a.textHash).not.toBe(b.textHash);
  });

  it("includes rental reference in canonical text", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.canonicalText).toContain("MLR-2024-100001");
  });

  it("returns version v1.0", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.version).toBe("v1.0");
  });
});
