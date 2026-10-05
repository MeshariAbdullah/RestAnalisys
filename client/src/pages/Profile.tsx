import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User as UserIcon, Shield, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, type User } from "@/lib/api";

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
      setNationalId(user.nationalId ?? "");
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await authApi.updateProfile({ fullName, phone: phone || undefined });
      await qc.invalidateQueries({ queryKey: ["me"] });
      setMessage({ type: "success", text: "Profile updated." });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handleNafath() {
    if (!nationalId || nationalId.length !== 10) {
      setMessage({ type: "error", text: "Enter a valid 10-digit National ID." });
      return;
    }
    setVerifying(true);
    setMessage(null);
    try {
      await authApi.nafathVerify(nationalId);
      await qc.invalidateQueries({ queryKey: ["me"] });
      setMessage({ type: "success", text: "Identity verified via Nafath." });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Profile</h1>
      <p className="text-neutral-500 mb-8">Manage your account details.</p>

      {message && (
        <div
          className={`mb-4 text-sm rounded p-3 border ${
            message.type === "success"
              ? "text-green-700 bg-green-50 border-green-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">{user.fullName}</p>
                <p className="text-sm text-neutral-500">{user.email}</p>
                <Badge variant="outline" className="mt-1">
                  {user.role.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            <div>
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
                required
                minLength={2}
              />
            </div>

            <div>
              <Label>Phone (Saudi format)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966512345678"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input value={user.email} disabled className="mt-1 bg-neutral-50" />
              <p className="text-xs text-neutral-400 mt-1">
                Email cannot be changed.
              </p>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-lg">Identity verification</h2>
          </div>

          {user.nafathVerified ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded p-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">
                Nafath verified {user.nationalId ? `(${user.nationalId})` : ""}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                Verify your Saudi Digital Identity via Nafath to unlock
                high-value rentals and legal signing.
              </p>
              <div>
                <Label>National ID / Iqama</Label>
                <Input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="1234567890"
                  className="mt-1"
                  maxLength={10}
                />
              </div>
              <Button
                type="button"
                onClick={handleNafath}
                disabled={verifying}
                className="bg-green-600 hover:bg-green-700"
              >
                {verifying ? "Verifying..." : "Verify with Nafath"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-3">Trust score</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{user.trustScore}</div>
            <div>
              <Badge
                className={
                  user.riskCategory === "low"
                    ? "bg-green-100 text-green-700"
                    : user.riskCategory === "medium"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-700"
                }
              >
                {user.riskCategory}
              </Badge>
              <p className="text-xs text-neutral-500 mt-1">
                Score updates as you complete rentals and maintain good standing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
