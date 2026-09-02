import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Diamond } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { saveSession, homeForRole } from "@/lib/auth";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("renter@mlr.sa");
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
      navigate(homeForRole(res.user.role));
    } catch (err) {
      setError((err as Error).message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
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
          <h1 className="text-2xl font-bold mb-1">Sign in</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Access your MLR dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-neutral-300">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-neutral-300">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-md p-2">
                {error}
              </p>
            )}

            <div className="text-xs text-neutral-400 bg-neutral-950/60 border border-neutral-800 rounded-md p-3 space-y-1">
              <p className="font-medium text-neutral-300">Demo credentials:</p>
              <p>Password for all: <code>Mlr@2024!</code></p>
              <p>· admin@mlr.sa · owner@mlr.sa · renter@mlr.sa</p>
              <p>· inspector@mlr.sa · ops@mlr.sa · new.renter@mlr.sa</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-400 mt-6">
            New to MLR?{" "}
            <Link href="/register">
              <a className="text-amber-400 hover:underline">Create an account</a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
