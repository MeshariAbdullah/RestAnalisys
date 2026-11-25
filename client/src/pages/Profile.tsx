import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ShieldAlert, Fingerprint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, type NationalAddress, type User } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

const EMPTY_ADDRESS: NationalAddress = {
  city: "",
  district: "",
  street: "",
  buildingNumber: "",
  postalCode: "",
};

function syncStoredUser(user: User, token?: string) {
  const stored = getCurrentUser();
  const merged = { ...stored, ...user } as User;
  saveSession(token ?? localStorage.getItem("auth_token") ?? "", merged);
}

export default function Profile() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<NationalAddress>(EMPTY_ADDRESS);
  const [nationalId, setNationalId] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!me) return;
    setFullName(me.fullName);
    setPhone(me.phoneE164 ?? "");
    setAddress({ ...EMPTY_ADDRESS, ...(me.nationalAddressJson ?? {}) });
  }, [me]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const hasAddress = address.city && address.district && address.street;
      const updated = await authApi.updateProfile({
        fullName: fullName || undefined,
        phoneE164: phone || undefined,
        nationalAddressJson: hasAddress
          ? {
              city: address.city,
              district: address.district,
              street: address.street,
              buildingNumber: address.buildingNumber || undefined,
              postalCode: address.postalCode || undefined,
            }
          : undefined,
      });
      syncStoredUser(updated);
      qc.setQueryData(["me"], updated);
      toast({ title: "Profile saved" });
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function verifyNafath() {
    setVerifying(true);
    try {
      const res = await authApi.nafathVerify(nationalId);
      if (res.status !== "verified") {
        toast({
          title: "Verification pending",
          description: "Approve the request in the Nafath app, then refresh.",
        });
        return;
      }
      const fresh = await authApi.me();
      syncStoredUser(fresh, res.token);
      qc.setQueryData(["me"], fresh);
      toast({ title: "Nafath verified", description: `Transaction ${res.transactionId}` });
    } catch (err) {
      toast({ title: "Verification failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading || !me) {
    return <div className="p-8 text-neutral-500">Loading…</div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">My profile</h1>
        <p className="text-neutral-500">{me.email}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={
                "w-11 h-11 rounded-full flex items-center justify-center shrink-0 " +
                (me.nafathVerified ? "bg-green-100" : "bg-amber-100")
              }
            >
              {me.nafathVerified ? (
                <BadgeCheck className="w-6 h-6 text-green-700" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-amber-700" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold">Nafath identity</p>
              {me.nafathVerified ? (
                <p className="text-sm text-neutral-600 mt-1">
                  Verified against National ID{" "}
                  <span className="font-mono">{me.nationalId}</span>.
                </p>
              ) : (
                <>
                  <p className="text-sm text-neutral-600 mt-1">
                    Renting requires Nafath verification. Enter your National ID or Iqama
                    number to start.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Input
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="1XXXXXXXXX"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                      className="sm:max-w-xs font-mono"
                    />
                    <Button
                      onClick={verifyNafath}
                      disabled={verifying || !/^[12]\d{9}$/.test(nationalId)}
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                    >
                      <Fingerprint className="w-4 h-4 mr-1" />
                      {verifying ? "Verifying…" : "Verify with Nafath"}
                    </Button>
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline">KYC: {me.kycStatus}</Badge>
                <Badge variant="outline">Trust score: {me.trustScore}</Badge>
                <Badge variant="outline">Risk: {me.riskCategory.replace("_", " ")}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={save} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  minLength={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile</Label>
                <Input
                  id="phone"
                  placeholder="+9665XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.trim())}
                  className="font-mono"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">National address</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {(
                  [
                    ["city", "City"],
                    ["district", "District"],
                    ["street", "Street"],
                    ["buildingNumber", "Building no."],
                    ["postalCode", "Postal code"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      value={address[key] ?? ""}
                      onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                City, district and street are required for the address to be saved.
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
