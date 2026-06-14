import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Diamond, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { saveSession, homeForRole } from "@/lib/auth";
import { useToast } from "@/components/ui/toast-provider";
import { useLocale } from "@/lib/i18n";

export default function Login() {
  const [, navigate] = useLocation();
  const { addToast } = useToast();
  const { t, locale, changeLocale } = useLocale();
  const [email, setEmail] = useState("renter@demo.sa");
  const [password, setPassword] = useState("Mlr@2024!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(email, password);
      saveSession(res.token, res.user);
      addToast({
        title: t("toast.loginSuccess"),
        variant: "success",
      });
      navigate(homeForRole(res.user.role));
    } catch (err) {
      setError((err as Error).message ?? "Login failed");
      addToast({
        title: t("common.error"),
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => changeLocale(locale === "en" ? "ar" : "en")}
            className="text-neutral-400 hover:text-white"
          >
            <Globe className="w-4 h-4 mr-1.5" />
            {locale === "en" ? "العربية" : "English"}
          </Button>
        </div>

        <Link href="/">
          <a className="flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Diamond className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <p className="font-bold">{t("app.name")}</p>
              <p className="text-xs text-neutral-400">{t("app.tagline")}</p>
            </div>
          </a>
        </Link>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-1">{t("auth.loginTitle")}</h1>
          <p className="text-sm text-neutral-400 mb-6">
            {t("auth.loginSubtitle")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-neutral-300">{t("auth.email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                required
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-neutral-300">{t("auth.password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                required
                dir="ltr"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-md p-2">
                {error}
              </p>
            )}

            <div className="text-xs text-neutral-400 bg-neutral-950/60 border border-neutral-800 rounded-md p-3 space-y-1">
              <p className="font-medium text-neutral-300">{t("auth.demoCredentials")}:</p>
              <p dir="ltr">Password for all: <code>Mlr@2024!</code></p>
              <p dir="ltr">admin@mlr.sa | owner@demo.sa | renter@demo.sa</p>
              <p dir="ltr">inspector@mlr.sa | ops@mlr.sa</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
              disabled={loading}
            >
              {loading
                ? t("common.loading")
                : t("auth.login")}
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-400 mt-6">
            {t("auth.noAccount")}{" "}
            <Link href="/register">
              <a className="text-amber-400 hover:underline">{t("auth.register")}</a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
