import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield, ShieldCheck, ShieldAlert, User as UserIcon,
  Lock, Phone, Mail, Calendar, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { profileApi, authApi, formatSar } from "@/lib/api";
import { saveSession, getCurrentUser } from "@/lib/auth";
import { formatDate, getScoreBg } from "@/lib/utils";

export default function Profile() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [changingPw, setChangingPw] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const [nafathId, setNafathId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [nafathMsg, setNafathMsg] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
  });

  function startEdit() {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phoneE164 ?? "");
    setEditing(true);
    setError("");
    setSuccess("");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await profileApi.update({
        fullName: fullName || undefined,
        phone: phone || undefined,
      });
      saveSession(res.token, res.user);
      setEditing(false);
      setSuccess("Profile updated");
      await qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    try {
      await profileApi.changePassword(curPw, newPw);
      setPwSuccess("Password changed");
      setCurPw("");
      setNewPw("");
      setChangingPw(false);
    } catch (err) {
      setPwError((err as Error).message);
    }
  }

  async function handleNafathVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setNafathMsg("");
    try {
      const res = await authApi.nafathVerify(nafathId);
      if (res.status === "verified") {
        setNafathMsg("Identity verified successfully!");
        await qc.invalidateQueries({ queryKey: ["profile"] });
      } else {
        setNafathMsg(`Verification status: ${res.status}`);
      }
    } catch (err) {
      setNafathMsg((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }

  if (isLoading || !profile) {
    return <Layout><div className="p-8">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-neutral-500 mb-8">Manage your account and verification status.</p>

        {success && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
            {success}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <UserIcon className="w-5 h-5" /> Personal Information
                  </h2>
                  {!editing && (
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      Edit
                    </Button>
                  )}
                </div>

                {editing ? (
                  <form onSubmit={saveProfile} className="space-y-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>Phone (Saudi format: +9665XXXXXXXX)</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)} type="button">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3 text-sm">
                    <Row label="Full Name" value={profile.fullName} />
                    <Row label="Email" value={profile.email} />
                    <Row label="Phone" value={profile.phoneE164 ?? "Not set"} />
                    <Row label="Role" value={profile.role.replace(/_/g, " ")} />
                    <Row label="Member since" value={formatDate(profile.createdAt)} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5" /> Verification Status
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <VerifyBadge label="Nafath ID" verified={profile.nafathVerified} />
                  <VerifyBadge label="KYC" verified={profile.kycStatus === "verified"} />
                  <VerifyBadge label="Phone" verified={profile.phoneVerified} />
                  <VerifyBadge label="Email" verified={profile.emailVerified} />
                </div>

                {!profile.nafathVerified && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-medium text-amber-900 mb-2">
                      Verify your Saudi National ID via Nafath to unlock rentals
                    </p>
                    <form onSubmit={handleNafathVerify} className="flex gap-2">
                      <Input
                        placeholder="National ID (10 digits)"
                        value={nafathId}
                        onChange={(e) => setNafathId(e.target.value)}
                        className="flex-1"
                        maxLength={10}
                      />
                      <Button type="submit" disabled={verifying || nafathId.length !== 10}>
                        {verifying ? "Verifying..." : "Verify"}
                      </Button>
                    </form>
                    {nafathMsg && <p className="text-sm mt-2 text-amber-800">{nafathMsg}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5" /> Security
                </h2>
                {changingPw ? (
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div>
                      <Label>Current Password</Label>
                      <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label>New Password (min 8 chars)</Label>
                      <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-1" />
                    </div>
                    {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                    {pwSuccess && <p className="text-sm text-green-600">{pwSuccess}</p>}
                    <div className="flex gap-2">
                      <Button type="submit">Change Password</Button>
                      <Button variant="outline" type="button" onClick={() => setChangingPw(false)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <Button variant="outline" onClick={() => setChangingPw(true)}>Change Password</Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-amber-500 rounded-full mx-auto flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-neutral-950">
                    {profile.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="font-semibold">{profile.fullName}</p>
                <Badge className="mt-1">{profile.role.replace(/_/g, " ")}</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-3">Trust Score</h3>
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-xl font-bold ${getScoreBg(profile.trustScore)}`}>
                    {profile.trustScore}
                  </div>
                  <p className="text-sm text-neutral-500 mt-2 capitalize">
                    {profile.riskCategory.replace(/_/g, " ")} risk
                  </p>
                </div>
              </CardContent>
            </Card>

            {(profile.role === "renter" || profile.role === "owner") && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-3">Activity</h3>
                  <div className="space-y-2 text-sm">
                    {profile.role === "renter" && (
                      <>
                        <Row label="Total Rentals" value={profile.stats.rentals.total} />
                        <Row label="Active" value={profile.stats.rentals.active} />
                        <Row label="Completed" value={profile.stats.rentals.completed} />
                      </>
                    )}
                    {profile.role === "owner" && (
                      <>
                        <Row label="Total Assets" value={profile.stats.assets.total} />
                        <Row label="Listed" value={profile.stats.assets.listed} />
                        <Row label="Rented Out" value={profile.stats.assets.rented} />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Row({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value ?? "---"}</span>
    </div>
  );
}

function VerifyBadge({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${verified ? "bg-green-50" : "bg-neutral-50"}`}>
      {verified ? (
        <ShieldCheck className="w-4 h-4 text-green-600" />
      ) : (
        <ShieldAlert className="w-4 h-4 text-neutral-400" />
      )}
      <span className={verified ? "text-green-800" : "text-neutral-500"}>{label}</span>
      <Badge variant={verified ? "default" : "outline"} className={`ml-auto text-xs ${verified ? "bg-green-100 text-green-800" : ""}`}>
        {verified ? "Verified" : "Pending"}
      </Badge>
    </div>
  );
}
