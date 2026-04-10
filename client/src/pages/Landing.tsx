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

export default function Landing() {
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
                Managed Luxury Rental
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-300">
            <a href="#how" className="hover:text-white">
              How it works
            </a>
            <a href="#trust" className="hover:text-white">
              Trust & safety
            </a>
            <a href="#owners" className="hover:text-white">
              For owners
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="outline"
                className="border-neutral-800 bg-transparent text-white hover:bg-neutral-900"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-xs text-amber-300 mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Saudi-compliant · Nafath · Nafith · ZATCA
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
          Luxury rentals,
          <br />
          <span className="text-amber-400">fully managed.</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-10">
          Rent designer bags, watches and couture — evaluated, stored, insured,
          and delivered by our operations team. Owners earn passive income,
          renters get verified luxury.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400 text-base px-8"
            >
              Browse the collection
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="lg"
              variant="outline"
              className="border-neutral-800 bg-transparent text-white hover:bg-neutral-900 text-base px-8"
            >
              Submit your asset
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-center text-neutral-400 mb-14 max-w-xl mx-auto">
          Every rental is contracted between the platform and the renter. Owners
          are guaranteed their asset back — or its full evaluated value.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Diamond,
              title: "1. Owners submit assets",
              desc: "Upload photos and a declared value. Our experts authenticate and evaluate the piece.",
            },
            {
              icon: Shield,
              title: "2. We store & insure",
              desc: "Assets live in our monitored vaults. Every movement is logged and insured.",
            },
            {
              icon: Truck,
              title: "3. Renters book & receive",
              desc: "Verified renters sign a Sanad-backed agreement and we ship the item directly.",
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
            Built for trust
          </h2>
          <p className="text-center text-neutral-400 mb-14 max-w-xl mx-auto">
            Every renter is verified via Nafath. Every contract is enforceable
            via Nafith Sanad. Every invoice is ZATCA-compliant.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                icon: BadgeCheck,
                title: "Nafath verified",
                desc: "Saudi national identity check at registration.",
              },
              {
                icon: Gavel,
                title: "Sanad contracts",
                desc: "Electronic promissory notes via MOJ Nafith.",
              },
              {
                icon: PackageCheck,
                title: "Expert inspection",
                desc: "Every asset is authenticated & graded on arrival.",
              },
              {
                icon: Lock,
                title: "Full value guarantee",
                desc: "Owners are paid evaluated value on total loss.",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6"
              >
                <t.icon className="w-8 h-8 text-amber-400 mb-4" />
                <p className="font-semibold mb-1">{t.title}</p>
                <p className="text-sm text-neutral-400">{t.desc}</p>
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
              Turn your closet into income
            </h2>
            <p className="text-neutral-400 mb-6 leading-relaxed">
              Your handbags, watches and couture can earn 15–35% of their
              evaluated value each year. We handle the cleaning, storage,
              shipping, and legal protection — you just receive monthly payouts.
            </p>
            <ul className="space-y-3 text-sm text-neutral-300">
              {[
                "No listing work — we photograph and price your piece",
                "You approve every valuation before going live",
                "Guaranteed return or full evaluated value payout",
                "Withdraw your asset at any time between rentals",
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button className="mt-8 bg-amber-500 text-neutral-950 hover:bg-amber-400">
                Become an asset owner
              </Button>
            </Link>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-amber-500/10 to-neutral-900 p-10">
            <p className="text-sm text-neutral-400 mb-2">Example payout</p>
            <p className="text-4xl font-bold mb-6">
              42,000 <span className="text-base text-neutral-400">SAR/yr</span>
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Hermès Birkin 30 · Togo</span>
                <span>180,000 SAR value</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Daily rental</span>
                <span>450 SAR</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Occupancy</span>
                <span>52%</span>
              </div>
              <div className="flex justify-between text-amber-400 font-semibold pt-3 border-t border-neutral-800">
                <span>Your share (80%)</span>
                <span>42,000 SAR</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-900 py-10 text-center text-neutral-500 text-sm">
        <p>© {new Date().getFullYear()} MLR Managed Luxury Rental Platform</p>
        <p className="text-xs mt-1">
          Operating under Saudi commercial registration · ZATCA tax ID on file
        </p>
      </footer>
    </div>
  );
}
