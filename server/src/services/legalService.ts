/**
 * Legal service — generates the platform/renter commitment, computes hashes,
 * and drives the Nafith Sanad lifecycle.
 *
 * Important: the legal contract is between the PLATFORM and the RENTER.
 * The owner has a separate consignment agreement with the platform.
 */

import crypto from "node:crypto";
import { formatHalalas } from "../utils/money.js";

export interface LegalCommitmentInput {
  rentalReference: string;
  renterFullName: string;
  renterNationalId: string;
  assetTitle: string;
  assetEvaluatedValueHalalas: number;
  commitmentPct: 100 | 150;
  commitmentHalalas: number;
  rentalStartDate: string;
  rentalEndDate: string;
  rentalTotalHalalas: number;
}

export interface LegalClause {
  id: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

export interface GeneratedLegalCommitment {
  version: string;
  clauses: LegalClause[];
  canonicalText: string;
  textHash: string;
}

/**
 * Produce the canonical text + SHA-256 hash of the commitment contract.
 * Hashing is critical — it allows us to prove the renter signed exactly this
 * document, even years later.
 */
export function generateLegalCommitment(i: LegalCommitmentInput): GeneratedLegalCommitment {
  const version = "v1.0";

  const clauses: LegalClause[] = [
    {
      id: "parties",
      titleEn: "Parties",
      titleAr: "الأطراف",
      bodyEn: `This commitment is between the Managed Luxury Rental Platform ("Platform") and ${i.renterFullName} (National ID: ${i.renterNationalId}) ("Renter").`,
      bodyAr: `هذا التعهد بين منصة التأجير الفاخر المُدارة ("المنصة") والسيد/ة ${i.renterFullName} (رقم الهوية: ${i.renterNationalId}) ("المستأجر").`,
    },
    {
      id: "asset",
      titleEn: "Asset",
      titleAr: "الأصل",
      bodyEn: `The Renter is temporarily entrusted with: ${i.assetTitle}. Evaluated value: ${formatHalalas(i.assetEvaluatedValueHalalas)}.`,
      bodyAr: `يُعهد إلى المستأجر مؤقتاً بـ: ${i.assetTitle}. القيمة المُقدَّرة: ${formatHalalas(i.assetEvaluatedValueHalalas)}.`,
    },
    {
      id: "period",
      titleEn: "Rental Period",
      titleAr: "فترة التأجير",
      bodyEn: `From ${i.rentalStartDate} to ${i.rentalEndDate}. Rental reference: ${i.rentalReference}.`,
      bodyAr: `من ${i.rentalStartDate} إلى ${i.rentalEndDate}. مرجع العقد: ${i.rentalReference}.`,
    },
    {
      id: "obligation",
      titleEn: "Return Obligation",
      titleAr: "التزام الإرجاع",
      bodyEn: `The Renter undertakes to return the asset to the Platform in the same condition, on or before the end date. Failure to do so triggers the full legal commitment amount below.`,
      bodyAr: `يتعهد المستأجر بإرجاع الأصل إلى المنصة بنفس حالته في الموعد المحدد أو قبله. يؤدي الإخلال بذلك إلى استحقاق المبلغ الكامل للتعهد أدناه.`,
    },
    {
      id: "commitment",
      titleEn: "Legal Commitment",
      titleAr: "التعهد المالي",
      bodyEn: `The Renter legally commits to ${i.commitmentPct}% of the asset's evaluated value, equal to ${formatHalalas(i.commitmentHalalas)}. This commitment is enforceable via a Nafith promissory note (Sanad) issued in the Renter's name.`,
      bodyAr: `يلتزم المستأجر قانونياً بما يعادل ${i.commitmentPct}% من القيمة المُقدَّرة للأصل أي ${formatHalalas(i.commitmentHalalas)}. يُنَفَّذ هذا التعهد عبر سند لأمر صادر في "نافذ" باسم المستأجر.`,
    },
    {
      id: "damage",
      titleEn: "Damage & Loss",
      titleAr: "التلف والفقد",
      bodyEn: `Minor damage: predefined penalty as published in the Platform's damage matrix. Major damage or loss: Platform triggers full legal enforcement through Nafith/Najiz for the full commitment amount.`,
      bodyAr: `ضرر بسيط: غرامة مُسبقة التحديد حسب مصفوفة الأضرار المنشورة. ضرر جسيم أو فقد: تنفذ المنصة التعهد عبر "نافذ/ناجز" لكامل المبلغ المُلتزم به.`,
    },
    {
      id: "platform_guarantee",
      titleEn: "Platform's Owner Guarantee",
      titleAr: "ضمان المنصة للمالك",
      bodyEn: `The Platform independently guarantees to the asset's owner either the return of the asset or full compensation equal to the evaluated value. This contract does not create any direct relationship between the owner and the Renter.`,
      bodyAr: `تضمن المنصة بشكل مستقل للمالك إما إعادة الأصل أو دفع تعويض كامل يساوي القيمة المُقدَّرة. لا ينشأ عن هذا العقد أي علاقة مباشرة بين المالك والمستأجر.`,
    },
    {
      id: "jurisdiction",
      titleEn: "Jurisdiction",
      titleAr: "الاختصاص",
      bodyEn: `This agreement is governed by the laws of the Kingdom of Saudi Arabia. Any dispute is referred to the competent Saudi courts.`,
      bodyAr: `يخضع هذا العقد لأنظمة المملكة العربية السعودية. تختص المحاكم السعودية بالنظر في أي نزاع.`,
    },
  ];

  // Canonical text used for hashing. Do not change formatting after launch —
  // it would invalidate historical signatures.
  const canonicalText = [
    `MLR Platform Legal Commitment ${version}`,
    `Rental: ${i.rentalReference}`,
    `Renter: ${i.renterFullName} (${i.renterNationalId})`,
    `Asset: ${i.assetTitle}`,
    `Evaluated value (halalas): ${i.assetEvaluatedValueHalalas}`,
    `Commitment: ${i.commitmentPct}% = ${i.commitmentHalalas} halalas`,
    `Period: ${i.rentalStartDate} -> ${i.rentalEndDate}`,
    `Rental total (halalas): ${i.rentalTotalHalalas}`,
    ...clauses.map((c) => `[${c.id}] ${c.bodyEn}`),
  ].join("\n");

  const textHash = crypto.createHash("sha256").update(canonicalText, "utf8").digest("hex");

  return { version, clauses, canonicalText, textHash };
}
