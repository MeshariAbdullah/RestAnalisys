import React from "react";
import { Link } from "wouter";
import {
  Diamond,
  Shield,
  Gavel,
  PackageCheck,
  Sparkles,
  CheckCircle2,
  BadgeCheck,
  Lock,
  Truck,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export default function Landing() {
  const { t, lang, setLang } = useI18n();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-900">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <Diamond className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">MLR</p>
              <p className="text-[11px] text-neutral-400">
                {lang === "ar" ? "تأجير الفخامة المُدار" : "Managed Luxury Rental"}
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-300">
            <a href="#how" className="hover:text-white">{t("landing.howLink")}</a>
            <a href="#trust" className="hover:text-white">{t("landing.trustLink")}</a>
            <a href="#owners" className="hover:text-white">{t("landing.ownersLink")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
              title={lang === "ar" ? "English" : "العربية"}
            >
              <Globe className="w-4 h-4" />
            </button>
            <Link href="/login">
              <Button
                variant="outline"
                className="border-neutral-800 bg-transparent text-white hover:bg-neutral-900"
              >
                {t("landing.signIn")}
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                {t("landing.createAccount")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-xs text-amber-300 mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          {t("landing.tagline")}
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
          {t("landing.heroTitle1")}
          <br />
          <span className="text-amber-400">{t("landing.heroTitle2")}</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-10">
          {t("landing.heroDesc")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400 text-base px-8"
            >
              {t("landing.browseCta")}
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="lg"
              variant="outline"
              className="border-neutral-800 bg-transparent text-white hover:bg-neutral-900 text-base px-8"
            >
              {t("landing.submitCta")}
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">{t("landing.howTitle")}</h2>
        <p className="text-center text-neutral-400 mb-14 max-w-xl mx-auto">
          {t("landing.howDesc")}
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {([
            { icon: Diamond, titleKey: "landing.step1Title" as const, descKey: "landing.step1Desc" as const },
            { icon: Shield, titleKey: "landing.step2Title" as const, descKey: "landing.step2Desc" as const },
            { icon: Truck, titleKey: "landing.step3Title" as const, descKey: "landing.step3Desc" as const },
          ]).map((step, i) => (
            <Card key={i} className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-8">
                <step.icon className="w-10 h-10 text-amber-400 mb-5" />
                <h3 className="text-lg font-semibold mb-2">{t(step.titleKey)}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{t(step.descKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="bg-neutral-900/40 border-y border-neutral-900">
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-4">{t("landing.trustTitle")}</h2>
          <p className="text-center text-neutral-400 mb-14 max-w-xl mx-auto">
            {t("landing.trustDesc")}
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {([
              { icon: BadgeCheck, titleKey: "landing.nafathTitle" as const, descKey: "landing.nafathDesc" as const },
              { icon: Gavel, titleKey: "landing.sanadTitle" as const, descKey: "landing.sanadDesc" as const },
              { icon: PackageCheck, titleKey: "landing.inspectionTitle" as const, descKey: "landing.inspectionDesc" as const },
              { icon: Lock, titleKey: "landing.guaranteeTitle" as const, descKey: "landing.guaranteeDesc" as const },
            ]).map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6"
              >
                <item.icon className="w-8 h-8 text-amber-400 mb-4" />
                <p className="font-semibold mb-1">{t(item.titleKey)}</p>
                <p className="text-sm text-neutral-400">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Owners */}
      <section id="owners" className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">{t("landing.ownersTitle")}</h2>
            <p className="text-neutral-400 mb-6 leading-relaxed">
              {t("landing.ownersDesc")}
            </p>
            <ul className="space-y-3 text-sm text-neutral-300">
              {([
                "landing.ownerFeature1" as const,
                "landing.ownerFeature2" as const,
                "landing.ownerFeature3" as const,
                "landing.ownerFeature4" as const,
              ]).map((key, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  {t(key)}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button className="mt-8 bg-amber-500 text-neutral-950 hover:bg-amber-400">
                {t("landing.becomeOwner")}
              </Button>
            </Link>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-amber-500/10 to-neutral-900 p-10">
            <p className="text-sm text-neutral-400 mb-2">{t("landing.examplePayout")}</p>
            <p className="text-4xl font-bold mb-6">
              42,000 <span className="text-base text-neutral-400">{lang === "ar" ? "ر.س/سنة" : "SAR/yr"}</span>
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>{lang === "ar" ? "هيرميس بيركن ٣٠ · توجو" : "Hermes Birkin 30 · Togo"}</span>
                <span>{lang === "ar" ? "١٨٠,٠٠٠ ر.س" : "180,000 SAR"} {t("landing.value")}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>{t("landing.dailyRental")}</span>
                <span>{lang === "ar" ? "٤٥٠ ر.س" : "450 SAR"}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>{t("landing.occupancy")}</span>
                <span>{lang === "ar" ? "٥٢٪" : "52%"}</span>
              </div>
              <div className="flex justify-between text-amber-400 font-semibold pt-3 border-t border-neutral-800">
                <span>{t("landing.yourShare")}</span>
                <span>{lang === "ar" ? "٤٢,٠٠٠ ر.س" : "42,000 SAR"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-900 py-10 text-center text-neutral-500 text-sm">
        <p>
          {lang === "ar"
            ? `© ${new Date().getFullYear()} MLR منصة تأجير الفخامة المُدارة`
            : `© ${new Date().getFullYear()} MLR Managed Luxury Rental Platform`}
        </p>
        <p className="text-xs mt-1">
          {lang === "ar"
            ? "تعمل بموجب السجل التجاري السعودي · الرقم الضريبي لزاتكا مسجل"
            : "Operating under Saudi commercial registration · ZATCA tax ID on file"}
        </p>
      </footer>
    </div>
  );
}
