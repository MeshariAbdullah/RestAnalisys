import type { RiskCategory } from "./riskEngine.js";

export type DamageLevel = "none" | "minor" | "moderate" | "major" | "total_loss";

interface DamageRule {
  level: DamageLevel;
  penaltyPct: number;
  description: string;
  descriptionAr: string;
}

const DAMAGE_RULES: DamageRule[] = [
  {
    level: "none",
    penaltyPct: 0,
    description: "No damage detected",
    descriptionAr: "لا يوجد ضرر",
  },
  {
    level: "minor",
    penaltyPct: 10,
    description: "Minor scratches or scuffs, normal wear",
    descriptionAr: "خدوش بسيطة أو احتكاك طبيعي",
  },
  {
    level: "moderate",
    penaltyPct: 30,
    description: "Visible damage requiring professional repair",
    descriptionAr: "ضرر واضح يتطلب إصلاحًا احترافيًا",
  },
  {
    level: "major",
    penaltyPct: 70,
    description: "Significant structural or functional damage",
    descriptionAr: "ضرر هيكلي أو وظيفي كبير",
  },
  {
    level: "total_loss",
    penaltyPct: 100,
    description: "Item is lost, stolen, or damaged beyond repair",
    descriptionAr: "القطعة مفقودة أو مسروقة أو تالفة بالكامل",
  },
];

const LATE_RETURN_DAILY_PCT = 2;
const MAX_LATE_PENALTY_PCT = 30;

export interface PenaltyBreakdown {
  damageLevel: DamageLevel;
  damagePenaltyHalalas: number;
  damagePenaltyPct: number;
  lateDays: number;
  latePenaltyHalalas: number;
  latePenaltyPct: number;
  totalPenaltyHalalas: number;
  description: string;
  descriptionAr: string;
  outcome: "clean" | "penalty" | "major_damage" | "loss";
}

export function computePenalty(args: {
  assetValueHalalas: number;
  conditionScoreBefore: number;
  conditionScoreAfter: number;
  lateDays: number;
  damageLevel?: DamageLevel;
}): PenaltyBreakdown {
  let damageLevel = args.damageLevel;
  if (!damageLevel) {
    const drop = args.conditionScoreBefore - args.conditionScoreAfter;
    if (drop <= 0) damageLevel = "none";
    else if (drop <= 10) damageLevel = "minor";
    else if (drop <= 30) damageLevel = "moderate";
    else if (drop <= 60) damageLevel = "major";
    else damageLevel = "total_loss";
  }

  const rule = DAMAGE_RULES.find((r) => r.level === damageLevel)!;
  const damagePenaltyHalalas = Math.round(
    (args.assetValueHalalas * rule.penaltyPct) / 100
  );

  const latePenaltyPct = Math.min(
    args.lateDays * LATE_RETURN_DAILY_PCT,
    MAX_LATE_PENALTY_PCT
  );
  const latePenaltyHalalas = Math.round(
    (args.assetValueHalalas * latePenaltyPct) / 100
  );

  const totalPenaltyHalalas = damagePenaltyHalalas + latePenaltyHalalas;

  let outcome: PenaltyBreakdown["outcome"];
  if (damageLevel === "total_loss") outcome = "loss";
  else if (damageLevel === "major") outcome = "major_damage";
  else if (totalPenaltyHalalas > 0) outcome = "penalty";
  else outcome = "clean";

  return {
    damageLevel,
    damagePenaltyHalalas,
    damagePenaltyPct: rule.penaltyPct,
    lateDays: args.lateDays,
    latePenaltyHalalas,
    latePenaltyPct,
    totalPenaltyHalalas,
    description: rule.description,
    descriptionAr: rule.descriptionAr,
    outcome,
  };
}

export function getDamageRules(): DamageRule[] {
  return DAMAGE_RULES;
}
