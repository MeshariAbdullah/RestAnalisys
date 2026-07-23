import React, { useState } from "react";
import { Link } from "wouter";
import { Diamond, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.requestPasswordReset(email);
      setSent(true);
      if (res._devToken) setDevToken(res._devToken);
    } catch (err) {
      setError((err as Error).message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setResetDone(true);
    } catch (err) {
      setError((err as Error).message ?? "Reset failed");
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
          {resetDone ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Password reset</h1>
              <p className="text-neutral-400 mb-6">
                Your password has been reset successfully.
              </p>
              <Link href="/login">
                <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                  Sign in
                </Button>
              </Link>
            </div>
          ) : sent ? (
            <>
              <h1 className="text-2xl font-bold mb-1">Check your email</h1>
              <p className="text-sm text-neutral-400 mb-6">
                If an account exists for <b>{email}</b>, we sent a reset link.
              </p>

              {devToken && (
                <div className="text-xs bg-neutral-950/60 border border-neutral-800 rounded-md p-3 mb-4">
                  <p className="font-medium text-neutral-300 mb-1">
                    Dev mode — reset token:
                  </p>
                  <code className="text-amber-400 break-all">{devToken}</code>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <Label className="text-neutral-300">Reset token</Label>
                  <Input
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                    placeholder="Paste the token from the email"
                    required
                  />
                </div>
                <div>
                  <Label className="text-neutral-300">New password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                    minLength={8}
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
                  {loading ? "Resetting…" : "Reset password"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1">Forgot password</h1>
              <p className="text-sm text-neutral-400 mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleRequest} className="space-y-4">
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
            </>
          )}

          <p className="text-center text-sm text-neutral-400 mt-6">
            <Link href="/login">
              <a className="text-amber-400 hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                Back to sign in
              </a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
