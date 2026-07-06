import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Phone, MapPin, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";

export default function Profile() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEditing() {
    if (!user) return;
    setFullName(user.fullName ?? "");
    setPhone(user.phoneE164 ?? "");
    setCity("");
    setDistrict("");
    setStreet("");
    setEditing(true);
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updates: Record<string, unknown> = {};
      if (fullName && fullName !== user?.fullName) updates.fullName = fullName;
      if (phone && phone !== user?.phoneE164) updates.phone = phone;
      if (city && district && street) {
        updates.nationalAddress = { city, district, street };
      }
      if (Object.keys(updates).length === 0) {
        setEditing(false);
        return;
      }
      await authApi.updateProfile(updates as any);
      await qc.invalidateQueries({ queryKey: ["me"] });
      setEditing(false);
    } catch (err) {
      setError((err as Error).message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-neutral-500 mb-8">Manage your account details and verification status.</p>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-neutral-950" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                <p className="text-sm text-neutral-500">{user.email}</p>
                <Badge variant="outline" className="mt-1">{user.role}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <Shield className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-xs text-neutral-500">Trust Score</p>
                  <p className="font-bold">{user.trustScore}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <Shield className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-xs text-neutral-500">Risk Category</p>
                  <p className="font-bold capitalize">{user.riskCategory}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Verification Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-neutral-400" />
                  <span className="text-sm">Nafath Identity</span>
                </div>
                {user.nafathVerified ? (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-0">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    Not Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-neutral-400" />
                  <span className="text-sm">KYC Status</span>
                </div>
                <Badge className={
                  user.kycStatus === "verified"
                    ? "bg-green-100 text-green-700 border-0"
                    : user.kycStatus === "pending"
                    ? "bg-amber-100 text-amber-800 border-0"
                    : "bg-neutral-100 text-neutral-600 border-0"
                }>
                  {user.kycStatus}
                </Badge>
              </div>
              {user.nationalId && (
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-neutral-400" />
                    <span className="text-sm">National ID</span>
                  </div>
                  <span className="text-sm font-mono text-neutral-600">
                    {user.nationalId.slice(0, 3)}•••{user.nationalId.slice(-3)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              {!editing && (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  Edit
                </Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-neutral-600">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-neutral-600">Phone (Saudi Mobile)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+9665XXXXXXXX"
                    className="mt-1"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-2">National Address</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                    <Input
                      placeholder="District"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                    <Input
                      placeholder="Street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleSave} disabled={saving} className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                  <User className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">Full Name</p>
                    <p className="text-sm font-medium">{user.fullName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                  <Phone className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">Phone</p>
                    <p className="text-sm font-medium">{user.phoneE164 || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-xs text-neutral-500">Email</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
