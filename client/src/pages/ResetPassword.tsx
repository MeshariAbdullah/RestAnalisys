import React, { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Diamond } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tokenFromUrl = params.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
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
          <h1 className="text-2xl font-bold mb-1">Set New Password</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Enter your new password below.
          </p>

          {success ? (
            <div className="space-y-4">
              <p className="text-green-400 text-sm bg-green-950/40 border border-green-900 rounded-md p-3">
                Password reset successfully. Redirecting to login...
              </p>
              <Link href="/login">
                <a className="text-amber-400 hover:underline text-sm">Go to login now</a>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!tokenFromUrl && (
                <div>
                  <Label className="text-neutral-300">Reset Token</Label>
                  <Input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="mt-1 bg-neutral-950 border-neutral-800 text-white font-mono text-xs"
                    placeholder="Paste your reset token"
                    required
                  />
                </div>
              )}
              <div>
                <Label className="text-neutral-300">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <Label className="text-neutral-300">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
