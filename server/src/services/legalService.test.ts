import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  generateLegalCommitment,
  type LegalCommitmentInput,
} from "./legalService.js";

function makeInput(overrides: Partial<LegalCommitmentInput> = {}): LegalCommitmentInput {
  return {
    rentalReference: "MLR-2024-100001",
    renterFullName: "Sara AlOtaibi",
    renterNationalId: "1000000006",
    assetTitle: "Hermès Birkin 30 — Gold Togo",
    assetEvaluatedValueHalalas: 17_500_000,
    commitmentPct: 100,
    commitmentHalalas: 17_500_000,
    rentalStartDate: "2024-06-01",
    rentalEndDate: "2024-06-04",
    rentalTotalHalalas: 621_000,
    ...overrides,
  };
}

describe("generateLegalCommitment", () => {
  it("produces 8 bilingual clauses", () => {
    const result = generateLegalCommitment(makeInput());
    expect(result.clauses).toHaveLength(8);
    for (const clause of result.clauses) {
      expect(clause.titleEn).toBeTruthy();
      expect(clause.titleAr).toBeTruthy();
      expect(clause.bodyEn).toBeTruthy();
      expect(clause.bodyAr).toBeTruthy();
    }
  });

  it("embeds renter identity in the parties clause", () => {
    const result = generateLegalCommitment(makeInput());
    const parties = result.clauses.find((c) => c.id === "parties");
    expect(parties?.bodyEn).toContain("Sara AlOtaibi");
    expect(parties?.bodyEn).toContain("1000000006");
    expect(parties?.bodyAr).toContain("Sara AlOtaibi");
  });

  it("embeds asset details in the asset clause", () => {
    const result = generateLegalCommitment(makeInput());
    const asset = result.clauses.find((c) => c.id === "asset");
    expect(asset?.bodyEn).toContain("Hermès Birkin 30");
  });

  it("embeds commitment percentage and amount", () => {
    const result = generateLegalCommitment(
      makeInput({ commitmentPct: 150, commitmentHalalas: 26_250_000 })
    );
    const commitment = result.clauses.find((c) => c.id === "commitment");
    expect(commitment?.bodyEn).toContain("150%");
    expect(commitment?.bodyAr).toContain("150%");
  });

  it("produces a valid SHA-256 hash", () => {
    const result = generateLegalCommitment(makeInput());
    expect(result.textHash).toMatch(/^[a-f0-9]{64}$/);
    const recomputed = crypto
      .createHash("sha256")
      .update(result.canonicalText, "utf8")
      .digest("hex");
    expect(result.textHash).toBe(recomputed);
  });

  it("produces deterministic output for same input", () => {
    const input = makeInput();
    const a = generateLegalCommitment(input);
    const b = generateLegalCommitment(input);
    expect(a.textHash).toBe(b.textHash);
    expect(a.canonicalText).toBe(b.canonicalText);
  });

  it("produces different hash for different inputs", () => {
    const a = generateLegalCommitment(makeInput());
    const b = generateLegalCommitment(
      makeInput({ renterFullName: "Mohammed AlZahrani" })
    );
    expect(a.textHash).not.toBe(b.textHash);
  });

  it("includes rental reference in canonical text", () => {
    const result = generateLegalCommitment(makeInput());
    expect(result.canonicalText).toContain("MLR-2024-100001");
  });

  it("includes rental period in canonical text", () => {
    const result = generateLegalCommitment(makeInput());
    expect(result.canonicalText).toContain("2024-06-01");
    expect(result.canonicalText).toContain("2024-06-04");
  });

  it("returns version v1.0", () => {
    const result = generateLegalCommitment(makeInput());
    expect(result.version).toBe("v1.0");
  });
});
