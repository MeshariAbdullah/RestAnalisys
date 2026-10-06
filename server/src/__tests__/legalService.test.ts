import { describe, it, expect } from "vitest";
import {
  generateLegalCommitment,
  type LegalCommitmentInput,
} from "../services/legalService.js";

function baseInput(overrides: Partial<LegalCommitmentInput> = {}): LegalCommitmentInput {
  return {
    rentalReference: "MLR-2024-000001",
    renterFullName: "Ahmed Al-Mutairi",
    renterNationalId: "1234567890",
    assetTitle: "Hermès Birkin 25 - Togo Gold",
    assetEvaluatedValueHalalas: 10_000_000,
    commitmentPct: 100,
    commitmentHalalas: 10_000_000,
    rentalStartDate: "2024-06-01",
    rentalEndDate: "2024-06-08",
    rentalTotalHalalas: 500_000,
    ...overrides,
  };
}

describe("generateLegalCommitment", () => {
  it("generates 8 bilingual clauses", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.clauses).toHaveLength(8);
  });

  it("includes all required clause IDs", () => {
    const result = generateLegalCommitment(baseInput());
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

  it("includes both English and Arabic text in every clause", () => {
    const result = generateLegalCommitment(baseInput());
    for (const clause of result.clauses) {
      expect(clause.titleEn).toBeTruthy();
      expect(clause.titleAr).toBeTruthy();
      expect(clause.bodyEn).toBeTruthy();
      expect(clause.bodyAr).toBeTruthy();
    }
  });

  it("embeds renter name and national ID in parties clause", () => {
    const input = baseInput({ renterFullName: "Fatimah Al-Dosari", renterNationalId: "2098765432" });
    const result = generateLegalCommitment(input);
    const parties = result.clauses.find((c) => c.id === "parties")!;
    expect(parties.bodyEn).toContain("Fatimah Al-Dosari");
    expect(parties.bodyEn).toContain("2098765432");
    expect(parties.bodyAr).toContain("Fatimah Al-Dosari");
  });

  it("embeds asset title and value in asset clause", () => {
    const result = generateLegalCommitment(baseInput());
    const assetClause = result.clauses.find((c) => c.id === "asset")!;
    expect(assetClause.bodyEn).toContain("Hermès Birkin 25");
  });

  it("embeds rental dates in period clause", () => {
    const result = generateLegalCommitment(baseInput());
    const period = result.clauses.find((c) => c.id === "period")!;
    expect(period.bodyEn).toContain("2024-06-01");
    expect(period.bodyEn).toContain("2024-06-08");
    expect(period.bodyEn).toContain("MLR-2024-000001");
  });

  it("embeds commitment percentage in commitment clause", () => {
    const result = generateLegalCommitment(baseInput({ commitmentPct: 150 }));
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("150%");
    expect(commitment.bodyAr).toContain("150%");
  });

  it("generates a valid SHA-256 hash", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.textHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces deterministic output for same input", () => {
    const input = baseInput();
    const result1 = generateLegalCommitment(input);
    const result2 = generateLegalCommitment(input);
    expect(result1.textHash).toBe(result2.textHash);
    expect(result1.canonicalText).toBe(result2.canonicalText);
  });

  it("produces different hashes for different inputs", () => {
    const result1 = generateLegalCommitment(baseInput());
    const result2 = generateLegalCommitment(
      baseInput({ renterFullName: "Different Person" })
    );
    expect(result1.textHash).not.toBe(result2.textHash);
  });

  it("includes version v1.0", () => {
    const result = generateLegalCommitment(baseInput());
    expect(result.version).toBe("v1.0");
  });

  it("canonical text includes all key data points", () => {
    const input = baseInput();
    const result = generateLegalCommitment(input);
    expect(result.canonicalText).toContain(input.rentalReference);
    expect(result.canonicalText).toContain(input.renterFullName);
    expect(result.canonicalText).toContain(input.renterNationalId);
    expect(result.canonicalText).toContain(input.assetTitle);
    expect(result.canonicalText).toContain(String(input.assetEvaluatedValueHalalas));
    expect(result.canonicalText).toContain(String(input.commitmentPct));
  });

  it("references Saudi jurisdiction", () => {
    const result = generateLegalCommitment(baseInput());
    const jurisdiction = result.clauses.find((c) => c.id === "jurisdiction")!;
    expect(jurisdiction.bodyEn).toContain("Kingdom of Saudi Arabia");
    expect(jurisdiction.bodyAr).toContain("المملكة العربية السعودية");
  });
});
