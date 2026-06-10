import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Diamond } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { saveSession, homeForRole } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toaster";
import LanguageToggle from "@/components/LanguageToggle";

export default function Register() {
  const [, navigate] = useLocation();
  const { t, dir } = useI18n();
  const { success, error: showError } = useToast();
  const [role, setRole] = useState<"renter" | "owner">("renter");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.register(email, password, fullName, role);
      saveSession(res.token, res.user);
      success(t("toast.registerSuccess"));
      navigate(homeForRole(res.user.role));
    } catch (err) {
      const msg = (err as Error).message ?? "Registration failed";
      setError(msg);
      showError(t("toast.error"), msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-12" dir={dir}>
      <div className="absolute top-4 end-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md">
        <Link href="/">
          <a className="flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Diamond className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <p className="font-bold">MLR</p>
              <p className="text-xs text-neutral-400">Luxury Rental Platform</p>
            </div>
          </a>
        </Link>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-1">{t("auth.joinMLR")}</h1>
          <p className="text-sm text-neutral-400 mb-6">
            {t("auth.joinDesc")}
          </p>

          <p className="text-xs text-neutral-400 mb-2 font-medium">
            {t("auth.selectRole")}
          </p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {(["renter", "owner"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                  role === r
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                }`}
              >
                {r === "renter" ? t("auth.roleRenter") : t("auth.roleOwner")}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-neutral-300">{t("auth.fullName")}</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-neutral-300">{t("auth.email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                dir="ltr"
                required
              />
            </div>
            <div>
              <Label className="text-neutral-300">{t("auth.password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                dir="ltr"
                placeholder={t("auth.passwordHint")}
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-md p-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
              disabled={loading}
            >
              {loading ? t("common.loading") : t("auth.register")}
            </Button>

            <p className="text-xs text-neutral-500 text-center">
              {t("auth.termsNote")}
            </p>
          </form>

          <p className="text-center text-sm text-neutral-400 mt-6">
            {t("auth.haveAccount")}{" "}
            <Link href="/login">
              <a className="text-amber-400 hover:underline">{t("auth.loginHere")}</a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
