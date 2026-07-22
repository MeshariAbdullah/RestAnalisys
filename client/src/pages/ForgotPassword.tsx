import React, { useState } from "react";
import { Link } from "wouter";
import { Diamond } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.forgotPassword(email);
      setSubmitted(true);
      if (res.devToken) setDevToken(res.devToken);
    } catch (err) {
      setError((err as Error).message ?? "Request failed");
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
          <h1 className="text-2xl font-bold mb-1">Reset Password</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Enter your email and we'll send you a reset link.
          </p>

          {submitted ? (
            <div className="space-y-4">
              <p className="text-green-400 text-sm bg-green-950/40 border border-green-900 rounded-md p-3">
                If that email exists in our system, a reset link has been sent.
              </p>
              {devToken && (
                <div className="text-xs text-neutral-400 bg-neutral-950/60 border border-neutral-800 rounded-md p-3">
                  <p className="font-medium text-neutral-300 mb-1">Dev mode token:</p>
                  <p className="break-all font-mono">{devToken}</p>
                  <Link href={`/reset-password?token=${devToken}`}>
                    <a className="text-amber-400 hover:underline block mt-2">
                      Use this token to reset password
                    </a>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-neutral-300">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                  placeholder="you@example.com"
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
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-neutral-400 mt-6">
            <Link href="/login">
              <a className="text-amber-400 hover:underline">Back to sign in</a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
