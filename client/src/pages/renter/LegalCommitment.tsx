import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { legalApi, paymentsApi, formatSar } from "@/lib/api";

export default function LegalCommitmentPage({
  commitmentId,
}: {
  commitmentId: number;
}) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["commitment", commitmentId],
    queryFn: () => legalApi.commitment(commitmentId),
  });

  async function handleSign() {
    setSigning(true);
    setError(null);
    try {
      await legalApi.sign(commitmentId);
      await qc.invalidateQueries({ queryKey: ["commitment", commitmentId] });
    } catch (err) {
      setError((err as Error).message ?? "Signing failed");
    } finally {
      setSigning(false);
    }
  }

  async function handlePay() {
    if (!data) return;
    setPaying(true);
    setError(null);
    try {
      await paymentsApi.charge(data.rental.id);
      navigate("/my-rentals");
    } catch (err) {
      setError((err as Error).message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  if (isLoading || !data) {
    return <div className="p-8">Loading contract…</div>;
  }

  const { commitment, rental, asset } = data;
  const signed = commitment.status === "signed";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <FileSignature className="w-4 h-4" />
        Legal commitment · Contract {commitment.contractVersion}
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Review & sign your contract</h1>
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg">
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                lang === l ? "bg-white shadow-sm" : "text-neutral-500"
              }`}
            >
              {l === "en" ? "English" : "العربية"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <Card className="mb-6 border-amber-200 bg-amber-50/40">
        <CardContent className="p-6 grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-neutral-500 uppercase">Asset</p>
            <p className="font-semibold mt-1">{asset.brand}</p>
            <p className="text-neutral-600">{asset.title}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">Rental period</p>
            <p className="font-semibold mt-1">
              {rental.startDate} → {rental.endDate}
            </p>
            <p className="text-neutral-600">{rental.durationDays} days</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase">
              Your commitment
            </p>
            <p className="font-bold text-xl text-amber-700 mt-1">
              {formatSar(commitment.commitmentHalalas)}
            </p>
            <p className="text-neutral-600">
              = {commitment.commitmentPct}% of evaluated value
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Clauses */}
      <div
        className="bg-white border rounded-xl p-8 space-y-6"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {commitment.clausesJson.map((clause, i) => (
          <section key={clause.id}>
            <h3 className="font-semibold text-lg mb-2">
              {i + 1}. {lang === "en" ? clause.titleEn : clause.titleAr}
            </h3>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
              {lang === "en" ? clause.bodyEn : clause.bodyAr}
            </p>
          </section>
        ))}
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {/* Actions */}
      {!signed ? (
        <Card className="mt-6 border-amber-300">
          <CardContent className="p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 accent-amber-500"
              />
              <span className="text-sm text-neutral-700">
                I have read and agree to all clauses above. I understand that
                signing will issue a Nafith Sanad (electronic promissory note)
                enforceable under Saudi law.
              </span>
            </label>
            <Button
              onClick={handleSign}
              disabled={!accepted || signing}
              className="w-full mt-5 bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {signing ? "Signing via Nafath…" : "Sign contract via Nafath"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6 border-green-200 bg-green-50/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Contract signed</p>
                <p className="text-sm text-green-700">
                  Sanad issued via Nafith. Complete payment to confirm your
                  rental.
                </p>
              </div>
              <Badge className="ml-auto bg-green-600">Signed</Badge>
            </div>
            <Button
              onClick={handlePay}
              disabled={paying}
              className="w-full bg-neutral-900 hover:bg-neutral-800"
            >
              {paying
                ? "Processing payment…"
                : `Pay ${formatSar(rental.totalPayableHalalas)} now`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
