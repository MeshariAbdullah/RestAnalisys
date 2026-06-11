import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Diamond, ShoppingBag, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { saveSession, homeForRole } from "@/lib/auth";

export default function Register() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "renter" as "renter" | "owner",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authApi.register(
        form.email,
        form.password,
        form.fullName,
        form.role
      );
      saveSession(res.token, res.user);
      navigate(homeForRole(res.user.role));
    } catch (err) {
      setError((err as Error).message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
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
          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Join the managed luxury rental platform
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <Label className="text-neutral-300 mb-2 block">I want to</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => update("role", "renter")}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    form.role === "renter"
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                  }`}
                >
                  <ShoppingBag className={`w-5 h-5 mb-2 ${form.role === "renter" ? "text-amber-400" : "text-neutral-500"}`} />
                  <p className="font-medium text-sm">Rent luxury items</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Browse and book verified pieces</p>
                </button>
                <button
                  type="button"
                  onClick={() => update("role", "owner")}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    form.role === "owner"
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"
                  }`}
                >
                  <Briefcase className={`w-5 h-5 mb-2 ${form.role === "owner" ? "text-amber-400" : "text-neutral-500"}`} />
                  <p className="font-medium text-sm">List my assets</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Earn income from your collection</p>
                </button>
              </div>
            </div>

            <div>
              <Label className="text-neutral-300">Full name</Label>
              <Input
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <Label className="text-neutral-300">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-neutral-300">Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label className="text-neutral-300">Confirm password</Label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                  placeholder="Repeat password"
                  required
                />
              </div>
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
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-400 mt-6">
            Already have an account?{" "}
            <Link href="/login">
              <a className="text-amber-400 hover:underline">Sign in</a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
