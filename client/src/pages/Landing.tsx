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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Landing() {
  const { t, dir } = useLanguage();

  return (
    <div className="min-h-screen bg-neutral-950 text-white" dir={dir}>
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
                Managed Luxury Rental
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-300">
            <a href="#how" className="hover:text-white">
              {t("landing.navHow")}
            </a>
            <a href="#trust" className="hover:text-white">
              {t("landing.navTrust")}
            </a>
            <a href="#owners" className="hover:text-white">
              {t("landing.navOwners")}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="border-neutral-800 bg-transparent text-white hover:bg-neutral-900" />
            <Link href="/login">
              <Button
                variant="outline"
                className="border-neutral-800 bg-transparent text-white hover:bg-neutral-900"
              >
                {t("auth.signIn")}
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                {t("auth.createAccount")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-xs text-amber-300 mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          {t("landing.badge")}
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
          {t("landing.heroTitle")}
          <br />
          <span className="text-amber-400">{t("landing.heroTitleHighlight")}</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-10">
          {t("landing.heroSubtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400 text-base px-8"
            >
              {t("landing.ctaBrowse")}
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="lg"
              variant="outline"
              className="border-neutral-800 bg-transparent text-white hover:bg-neutral-900 text-base px-8"
            >
              {t("landing.ctaSubmit")}
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">{t("landing.howItWorks")}</h2>
        <p className="text-center text-neutral-400 mb-14 max-w-xl mx-auto">
          {t("landing.howItWorksSubtitle")}
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Diamond,
              title: t("landing.step1Title"),
              desc: t("landing.step1Desc"),
            },
            {
              icon: Shield,
              title: t("landing.step2Title"),
              desc: t("landing.step2Desc"),
            },
            {
              icon: Truck,
              title: t("landing.step3Title"),
              desc: t("landing.step3Desc"),
            },
          ].map((step, i) => (
            <Card key={i} className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-8">
                <step.icon className="w-10 h-10 text-amber-400 mb-5" />
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {step.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="bg-neutral-900/40 border-y border-neutral-900">
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t("landing.trustTitle")}
          </h2>
          <p className="text-center text-neutral-400 mb-14 max-w-xl mx-auto">
            {t("landing.trustSubtitle")}
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: BadgeCheck,
                title: t("landing.trust1Title"),
                desc: t("landing.trust1Desc"),
              },
              {
                icon: Gavel,
                title: t("landing.trust2Title"),
                desc: t("landing.trust2Desc"),
              },
              {
                icon: PackageCheck,
                title: t("landing.trust3Title"),
                desc: t("landing.trust3Desc"),
              },
              {
                icon: Lock,
                title: t("landing.trust4Title"),
                desc: t("landing.trust4Desc"),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6"
              >
                <item.icon className="w-8 h-8 text-amber-400 mb-4" />
                <p className="font-semibold mb-1">{item.title}</p>
                <p className="text-sm text-neutral-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Owners */}
      <section id="owners" className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">
              {t("landing.ownersTitle")}
            </h2>
            <p className="text-neutral-400 mb-6 leading-relaxed">
              {t("landing.ownersSubtitle")}
            </p>
            <ul className="space-y-3 text-sm text-neutral-300">
              {[
                t("landing.ownerBenefit1"),
                t("landing.ownerBenefit2"),
                t("landing.ownerBenefit3"),
                t("landing.ownerBenefit4"),
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  {f}
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
              42,000 <span className="text-base text-neutral-400">{t("money.sar")}/{dir === "rtl" ? "سنة" : "yr"}</span>
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Hermes Birkin 30 · Togo</span>
                <span>180,000 {t("money.sar")}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>{t("landing.dailyRental")}</span>
                <span>450 {t("money.sar")}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>{t("landing.occupancy")}</span>
                <span>52%</span>
              </div>
              <div className="flex justify-between text-amber-400 font-semibold pt-3 border-t border-neutral-800">
                <span>{t("landing.yourShare")}</span>
                <span>42,000 {t("money.sar")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-900 py-10 text-center text-neutral-500 text-sm">
        <p>&copy; {new Date().getFullYear()} {t("landing.footer")}</p>
        <p className="text-xs mt-1">
          {t("landing.footerSub")}
        </p>
      </footer>
    </div>
  );
}
