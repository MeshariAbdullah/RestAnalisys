import { describe, it, expect } from "vitest";
import {
  generateLegalCommitment,
  type LegalCommitmentInput,
} from "../services/legalService.js";

function makeInput(overrides: Partial<LegalCommitmentInput> = {}): LegalCommitmentInput {
  return {
    rentalReference: "MLR-2024-123456",
    renterFullName: "Ahmad Al-Rashid",
    renterNationalId: "1098765432",
    assetTitle: "Hermès Birkin 30 — Togo Leather",
    assetEvaluatedValueHalalas: 15_000_000,
    commitmentPct: 150,
    commitmentHalalas: 22_500_000,
    rentalStartDate: "2024-06-01",
    rentalEndDate: "2024-06-08",
    rentalTotalHalalas: 575_000,
    ...overrides,
  };
}

describe("generateLegalCommitment", () => {
  it("returns version v1.0", () => {
    const result = generateLegalCommitment(makeInput());
    expect(result.version).toBe("v1.0");
  });

  it("generates exactly 8 clauses", () => {
    const result = generateLegalCommitment(makeInput());
    expect(result.clauses).toHaveLength(8);
  });

  it("returns all expected clause IDs", () => {
    const result = generateLegalCommitment(makeInput());
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

  it("each clause has English and Arabic text", () => {
    const result = generateLegalCommitment(makeInput());
    for (const clause of result.clauses) {
      expect(clause.titleEn.length).toBeGreaterThan(0);
      expect(clause.titleAr.length).toBeGreaterThan(0);
      expect(clause.bodyEn.length).toBeGreaterThan(0);
      expect(clause.bodyAr.length).toBeGreaterThan(0);
    }
  });

  it("includes renter name and national ID in the parties clause", () => {
    const result = generateLegalCommitment(makeInput());
    const parties = result.clauses.find((c) => c.id === "parties")!;
    expect(parties.bodyEn).toContain("Ahmad Al-Rashid");
    expect(parties.bodyEn).toContain("1098765432");
    expect(parties.bodyAr).toContain("Ahmad Al-Rashid");
    expect(parties.bodyAr).toContain("1098765432");
  });

  it("includes asset title in the asset clause", () => {
    const result = generateLegalCommitment(makeInput());
    const asset = result.clauses.find((c) => c.id === "asset")!;
    expect(asset.bodyEn).toContain("Hermès Birkin 30");
  });

  it("includes commitment percentage and amount in the commitment clause", () => {
    const result = generateLegalCommitment(makeInput());
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("150%");
    expect(commitment.bodyAr).toContain("150%");
  });

  it("includes rental dates in the period clause", () => {
    const result = generateLegalCommitment(makeInput());
    const period = result.clauses.find((c) => c.id === "period")!;
    expect(period.bodyEn).toContain("2024-06-01");
    expect(period.bodyEn).toContain("2024-06-08");
    expect(period.bodyEn).toContain("MLR-2024-123456");
  });

  // ── Hash determinism ────────────────────────────────────────────────────

  it("produces a deterministic SHA-256 hash", () => {
    const input = makeInput();
    const r1 = generateLegalCommitment(input);
    const r2 = generateLegalCommitment(input);
    expect(r1.textHash).toBe(r2.textHash);
    expect(r1.textHash).toHaveLength(64); // SHA-256 hex
  });

  it("produces different hashes for different inputs", () => {
    const r1 = generateLegalCommitment(makeInput());
    const r2 = generateLegalCommitment(
      makeInput({ renterFullName: "Sara Al-Otaibi" })
    );
    expect(r1.textHash).not.toBe(r2.textHash);
  });

  it("changes hash when commitment percentage changes", () => {
    const r100 = generateLegalCommitment(makeInput({ commitmentPct: 100 }));
    const r150 = generateLegalCommitment(makeInput({ commitmentPct: 150 }));
    expect(r100.textHash).not.toBe(r150.textHash);
  });

  // ── Canonical text ──────────────────────────────────────────────────────

  it("includes all key data in the canonical text", () => {
    const result = generateLegalCommitment(makeInput());
    expect(result.canonicalText).toContain("MLR-2024-123456");
    expect(result.canonicalText).toContain("Ahmad Al-Rashid");
    expect(result.canonicalText).toContain("1098765432");
    expect(result.canonicalText).toContain("Hermès Birkin 30");
    expect(result.canonicalText).toContain("15000000");
    expect(result.canonicalText).toContain("150%");
    expect(result.canonicalText).toContain("22500000");
  });

  it("embeds clause body text (English) in the canonical text", () => {
    const result = generateLegalCommitment(makeInput());
    for (const clause of result.clauses) {
      expect(result.canonicalText).toContain(`[${clause.id}]`);
      expect(result.canonicalText).toContain(clause.bodyEn);
    }
  });

  // ── 100% vs 150% ───────────────────────────────────────────────────────

  it("uses 100% commitment text for trusted users", () => {
    const result = generateLegalCommitment(
      makeInput({ commitmentPct: 100, commitmentHalalas: 15_000_000 })
    );
    const commitment = result.clauses.find((c) => c.id === "commitment")!;
    expect(commitment.bodyEn).toContain("100%");
  });
});
