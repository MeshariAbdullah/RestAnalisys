import { describe, it, expect } from "vitest";
import {
  generateLegalCommitment,
  LegalCommitmentInput,
} from "../legalService.js";

function baseInput(overrides: Partial<LegalCommitmentInput> = {}): LegalCommitmentInput {
  return {
    rentalReference: "MLR-2026-123456",
    renterFullName: "Ahmed Al-Saud",
    renterNationalId: "1012345678",
    assetTitle: "Hermès Birkin 25 (Black Togo)",
    assetEvaluatedValueHalalas: 10_000_000,
    commitmentPct: 150,
    commitmentHalalas: 15_000_000,
    rentalStartDate: "2026-10-01",
    rentalEndDate: "2026-10-08",
    rentalTotalHalalas: 500_000,
    ...overrides,
  };
}

describe("generateLegalCommitment", () => {
  it("returns version v1.0", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.version).toBe("v1.0");
  });

  it("produces 8 clauses", () => {
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

  it("includes renter name and national ID in parties clause", () => {
    const result = generateLegalCommitment(baseInput());
    const parties = result.clauses.find((c) => c.id === "parties")!;
    expect(parties.bodyEn).toContain("Ahmed Al-Saud");
    expect(parties.bodyEn).toContain("1012345678");
    expect(parties.bodyAr).toContain("Ahmed Al-Saud");
  });

  it("includes asset title and value in asset clause", () => {
    const result = generateLegalCommitment(baseInput());
    const asset = result.clauses.find((c) => c.id === "asset")!;
    expect(asset.bodyEn).toContain("Hermès Birkin 25 (Black Togo)");
    expect(asset.bodyEn).toContain("SAR");
  });

  it("includes rental period in period clause", () => {
    const result = generateLegalCommitment(baseInput());
    const period = result.clauses.find((c) => c.id === "period")!;
    expect(period.bodyEn).toContain("2026-10-01");
    expect(period.bodyEn).toContain("2026-10-08");
    expect(period.bodyEn).toContain("MLR-2026-123456");
  });

  it("includes commitment percentage and amount in commitment clause", () => {
    const result = generateLegalCommitment(baseInput());
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("150%");
    expect(commitment.bodyAr).toContain("150%");
  });

  it("each clause has both English and Arabic titles and bodies", () => {
    const result = generateLegalCommitment(baseInput());
    for (const clause of result.clauses) {
      expect(clause.titleEn.length).toBeGreaterThan(0);
      expect(clause.titleAr.length).toBeGreaterThan(0);
      expect(clause.bodyEn.length).toBeGreaterThan(0);
      expect(clause.bodyAr.length).toBeGreaterThan(0);
    }
  });

  it("produces a non-empty canonical text", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.canonicalText.length).toBeGreaterThan(0);
    expect(result.canonicalText).toContain("MLR Platform Legal Commitment v1.0");
    expect(result.canonicalText).toContain("MLR-2026-123456");
  });

  it("produces a valid SHA-256 hash (64 hex chars)", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.textHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces deterministic output for same input", () => {
    const input = baseInput();
    const a = generateLegalCommitment(input);
    const b = generateLegalCommitment(input);
    expect(a.textHash).toBe(b.textHash);
    expect(a.canonicalText).toBe(b.canonicalText);
  });

  it("produces different hashes for different inputs", () => {
    const a = generateLegalCommitment(baseInput());
    const b = generateLegalCommitment(baseInput({ renterFullName: "Sarah" }));
    expect(a.textHash).not.toBe(b.textHash);
  });

  it("handles 100% commitment", () => {
    const result = generateLegalCommitment(
      baseInput({ commitmentPct: 100, commitmentHalalas: 10_000_000 })
    );
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("100%");
  });
});
