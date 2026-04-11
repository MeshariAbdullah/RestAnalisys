import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, AlertCircle, Loader2, Phone, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";

/**
 * Renter profile page. Primary purpose is to collect the Saudi National ID
 * and run it through the Nafath verification placeholder so the user becomes
 * eligible to sign legal commitments (required before the first rental).
 */
export default function Profile() {
  const qc = useQueryClient();
  const [nationalId, setNationalId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    initialData: getCurrentUser() ?? undefined,
  });

  const user = profileQuery.data;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!/^[12]\d{9}$/.test(nationalId)) {
      setError("National ID must be 10 digits starting with 1 or 2.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.nafathVerify(nationalId);
      if (res.status === "verified") {
        setSuccess("Your identity was verified successfully.");
        // Refresh /auth/me so the UI flips to the verified state, and push
        // the updated user into localStorage so Layout / ProtectedRoute see it.
        const fresh = await authApi.me();
        const token = localStorage.getItem("auth_token") ?? "";
        if (token) saveSession(token, fresh);
        await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      } else {
        setError(
          `Nafath returned status "${res.status}". Please try again or contact support.`
        );
      }
    } catch (err) {
      setError((err as Error).message ?? "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My profile</h1>
      <p className="text-neutral-500 mb-8">
        Account details and identity verification.
      </p>

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-neutral-500">Full name</p>
              <p className="font-semibold text-lg">{user.fullName}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {user.role.replace("_", " ")}
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs uppercase text-neutral-500 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </p>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-500 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </p>
              <p className="text-sm">
                {user.phoneE164 ?? (
                  <span className="text-neutral-400">Not provided</span>
                )}
              </p>
            </div>
          </div>
          {user.trustScore !== undefined && user.trustScore !== null && (
            <div className="pt-2">
              <p className="text-xs uppercase text-neutral-500">Trust score</p>
              <p className="text-sm">
                {user.trustScore}{" "}
                {user.riskCategory && (
                  <span className="text-neutral-500">· {user.riskCategory}</span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                user.nafathVerified
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {user.nafathVerified ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">Nafath identity verification</h2>
              <p className="text-sm text-neutral-500">
                Verified through the Saudi National Single Sign-On platform.
                Required before signing any legal commitment.
              </p>
            </div>
          </div>

          {user.nafathVerified ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <p className="font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Your identity is verified.
              </p>
              <p className="mt-1">
                National ID on file:{" "}
                <span className="font-mono">
                  {user.nationalId
                    ? `${user.nationalId.slice(0, 2)}******${user.nationalId.slice(-2)}`
                    : "—"}
                </span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Label htmlFor="national-id">Saudi National ID</Label>
                <Input
                  id="national-id"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10XXXXXXXX"
                  className="mt-1 font-mono"
                  required
                />
                <p className="text-xs text-neutral-500 mt-1">
                  We'll send a verification request to Nafath. You may be
                  prompted to approve it in the Nafath mobile app.
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify with Nafath"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
