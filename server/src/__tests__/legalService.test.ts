import { describe, it, expect } from "vitest";
import {
  generateLegalCommitment,
  type LegalCommitmentInput,
} from "../services/legalService.js";

function baseInput(overrides: Partial<LegalCommitmentInput> = {}): LegalCommitmentInput {
  return {
    rentalReference: "MLR-2024-123456",
    renterFullName: "Mohammed Al-Test",
    renterNationalId: "1234567890",
    assetTitle: "Chanel Classic Flap Bag",
    assetEvaluatedValueHalalas: 2_500_000, // 25,000 SAR
    commitmentPct: 150,
    commitmentHalalas: 3_750_000, // 150% of 25,000
    rentalStartDate: "2024-03-01",
    rentalEndDate: "2024-03-15",
    rentalTotalHalalas: 345_000,
    ...overrides,
  };
}

describe("generateLegalCommitment", () => {
  it("produces exactly 8 clauses", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.clauses).toHaveLength(8);
  });

  it("every clause has EN and AR titles and bodies", () => {
    const result = generateLegalCommitment(baseInput());
    for (const clause of result.clauses) {
      expect(clause.id).toBeTruthy();
      expect(clause.titleEn).toBeTruthy();
      expect(clause.titleAr).toBeTruthy();
      expect(clause.bodyEn).toBeTruthy();
      expect(clause.bodyAr).toBeTruthy();
    }
  });

  it("includes all expected clause IDs", () => {
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

  it("embeds renter name and national ID in the parties clause", () => {
    const result = generateLegalCommitment(baseInput());
    const parties = result.clauses.find((c) => c.id === "parties")!;
    expect(parties.bodyEn).toContain("Mohammed Al-Test");
    expect(parties.bodyEn).toContain("1234567890");
    expect(parties.bodyAr).toContain("Mohammed Al-Test");
    expect(parties.bodyAr).toContain("1234567890");
  });

  it("embeds the asset title in the asset clause", () => {
    const result = generateLegalCommitment(baseInput());
    const asset = result.clauses.find((c) => c.id === "asset")!;
    expect(asset.bodyEn).toContain("Chanel Classic Flap Bag");
  });

  it("embeds rental dates in the period clause", () => {
    const result = generateLegalCommitment(baseInput());
    const period = result.clauses.find((c) => c.id === "period")!;
    expect(period.bodyEn).toContain("2024-03-01");
    expect(period.bodyEn).toContain("2024-03-15");
    expect(period.bodyEn).toContain("MLR-2024-123456");
  });

  it("embeds commitment percentage and amount in the commitment clause", () => {
    const result = generateLegalCommitment(baseInput());
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("150%");
    expect(commitment.bodyAr).toContain("150%");
  });

  describe("canonical text and hash", () => {
    it("produces a SHA-256 hex hash (64 chars)", () => {
      const result = generateLegalCommitment(baseInput());
      expect(result.textHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("hash is deterministic for same input", () => {
      const a = generateLegalCommitment(baseInput());
      const b = generateLegalCommitment(baseInput());
      expect(a.textHash).toBe(b.textHash);
      expect(a.canonicalText).toBe(b.canonicalText);
    });

    it("hash changes when input changes", () => {
      const a = generateLegalCommitment(baseInput());
      const b = generateLegalCommitment(
        baseInput({ renterFullName: "Different Person" })
      );
      expect(a.textHash).not.toBe(b.textHash);
    });

    it("canonical text includes rental reference", () => {
      const result = generateLegalCommitment(baseInput());
      expect(result.canonicalText).toContain("MLR-2024-123456");
    });

    it("canonical text includes all clause bodies", () => {
      const result = generateLegalCommitment(baseInput());
      for (const clause of result.clauses) {
        expect(result.canonicalText).toContain(clause.bodyEn);
      }
    });
  });

  it("version is v1.0", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.version).toBe("v1.0");
  });

  it("works with 100% commitment for trusted users", () => {
    const result = generateLegalCommitment(
      baseInput({
        commitmentPct: 100,
        commitmentHalalas: 2_500_000,
      })
    );
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("100%");
    expect(result.textHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
