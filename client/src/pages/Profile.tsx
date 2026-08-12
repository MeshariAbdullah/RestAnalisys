import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, User, Lock, MapPin, Phone, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, type UserProfile } from "@/lib/api";

export default function Profile() {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.me(),
  });

  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pwMode, setPwMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  function startEdit(p: UserProfile) {
    setFullName(p.fullName);
    setPhone(p.phoneE164 ?? "");
    setCity(p.nationalAddressJson?.city ?? "");
    setDistrict(p.nationalAddressJson?.district ?? "");
    setStreet(p.nationalAddressJson?.street ?? "");
    setBuildingNumber(p.nationalAddressJson?.buildingNumber ?? "");
    setPostalCode(p.nationalAddressJson?.postalCode ?? "");
    setEditMode(true);
    setError(null);
    setSuccess(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const address =
        city || district || street
          ? { city, district, street, buildingNumber: buildingNumber || undefined, postalCode: postalCode || undefined }
          : undefined;
      await authApi.updateProfile({
        fullName: fullName || undefined,
        phone: phone || undefined,
        nationalAddress: address,
      });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      setEditMode(false);
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwMode(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess("Password changed successfully");
    } catch (err) {
      setPwError((err as Error).message);
    } finally {
      setPwSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-neutral-500">Loading profile…</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Profile</h1>
      <p className="text-neutral-500 mb-8">Manage your account details and security.</p>

      {success && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          {success}
        </div>
      )}
      {pwSuccess && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          {pwSuccess}
        </div>
      )}

      <div className="space-y-6">
        {/* Identity Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-neutral-950" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{profile.fullName}</h2>
                <p className="text-sm text-neutral-500">{profile.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge className="border-0 bg-amber-100 text-amber-800 capitalize">
                  {profile.role.replace(/_/g, " ")}
                </Badge>
                {profile.nafathVerified ? (
                  <Badge className="border-0 bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" /> Nafath verified
                  </Badge>
                ) : (
                  <Badge className="border-0 bg-neutral-200 text-neutral-600">
                    <XCircle className="w-3 h-3 mr-1" /> Unverified
                  </Badge>
                )}
              </div>
            </div>

            {!editMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-500">Phone</span>
                    <p className="font-medium">{profile.phoneE164 || "—"}</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">National ID</span>
                    <p className="font-medium">{profile.nationalId || "—"}</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">KYC Status</span>
                    <p className="font-medium capitalize">{profile.kycStatus}</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Trust Score</span>
                    <p className="font-medium">{profile.trustScore}</p>
                  </div>
                </div>

                {profile.nationalAddressJson && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-1 text-sm text-neutral-500 mb-1">
                      <MapPin className="w-3.5 h-3.5" /> National Address
                    </div>
                    <p className="text-sm">
                      {[
                        profile.nationalAddressJson.street,
                        profile.nationalAddressJson.district,
                        profile.nationalAddressJson.city,
                        profile.nationalAddressJson.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t text-xs text-neutral-400">
                  Member since {new Date(profile.createdAt).toLocaleDateString("en-SA")}
                </div>

                <Button variant="outline" size="sm" onClick={() => startEdit(profile)}>
                  Edit profile
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                    {error}
                  </div>
                )}
                <div>
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Phone (Saudi format)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 5x xxx xxxx"
                    className="mt-1"
                  />
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center gap-1 text-sm font-medium mb-3">
                    <MapPin className="w-4 h-4" /> National Address
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>City</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>District</Label>
                      <Input value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Street</Label>
                      <Input value={street} onChange={(e) => setStreet(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Building #</Label>
                      <Input value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Postal code</Label>
                      <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-neutral-500" />
              <h2 className="text-lg font-semibold">Security</h2>
            </div>

            {pwError && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                {pwError}
              </div>
            )}

            {!pwMode ? (
              <Button variant="outline" size="sm" onClick={() => { setPwMode(true); setPwError(null); setPwSuccess(null); }}>
                Change password
              </Button>
            ) : (
              <div className="space-y-3 max-w-md">
                <div>
                  <Label>Current password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>New password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Confirm new password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleChangePassword}
                    disabled={pwSaving}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    {pwSaving ? "Changing…" : "Update password"}
                  </Button>
                  <Button variant="outline" onClick={() => setPwMode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nafath Verification */}
        {!profile.nafathVerified && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-neutral-500" />
                <h2 className="text-lg font-semibold">Identity Verification</h2>
              </div>
              <p className="text-sm text-neutral-500 mb-4">
                Verify your identity through Nafath to unlock full platform features including renting high-value items.
              </p>
              <Button
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                onClick={() => {
                  const id = prompt("Enter your National ID (10 digits)");
                  if (id) authApi.nafathVerify(id).then(() => qc.invalidateQueries({ queryKey: ["profile"] }));
                }}
              >
                Verify with Nafath
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
