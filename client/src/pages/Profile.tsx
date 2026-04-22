import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Phone, Mail, Lock, Save, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { profileApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import Layout from "@/components/Layout";

export default function Profile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
  });

  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [nameInit, setNameInit] = useState(false);

  if (profile && !nameInit) {
    setFullName(profile.fullName);
    setPhoneE164(profile.phoneE164 ?? "");
    setNameInit(true);
  }

  const updateMut = useMutation({
    mutationFn: (data: { fullName?: string; phoneE164?: string }) =>
      profileApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast("Profile updated successfully", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const changePwdMut = useMutation({
    mutationFn: () => profileApi.changePassword(curPwd, newPwd),
    onSuccess: () => {
      setCurPwd("");
      setNewPwd("");
      toast("Password changed successfully", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const updates: Record<string, string> = {};
    if (fullName !== profile?.fullName) updates.fullName = fullName;
    if (phoneE164 !== (profile?.phoneE164 ?? "")) updates.phoneE164 = phoneE164;
    if (Object.keys(updates).length > 0) updateMut.mutate(updates);
  }

  function riskColor(cat: string) {
    if (cat === "low") return "bg-green-100 text-green-700";
    if (cat === "medium") return "bg-amber-100 text-amber-700";
    if (cat === "high") return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">My Account</h1>
        <p className="text-neutral-500 mb-8">Manage your profile and security settings.</p>

        {isLoading ? (
          <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
        ) : profile ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-neutral-950" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{profile.fullName}</h2>
                    <p className="text-sm text-neutral-500">{profile.email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge className="text-xs capitalize">{profile.role.replace("_", " ")}</Badge>
                      <Badge className={`text-xs ${riskColor(profile.riskCategory)}`}>
                        Trust: {profile.trustScore}/100
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-neutral-500 mb-1">Trust Score</p>
                  <Progress value={profile.trustScore} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${profile.nafathVerified ? "text-green-600" : "text-neutral-400"}`} />
                    <span>Nafath: {profile.nafathVerified ? "Verified" : "Not verified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${profile.kycStatus === "verified" ? "text-green-600" : "text-neutral-400"}`} />
                    <span>KYC: {profile.kycStatus}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone (Saudi +966)</Label>
                    <Input
                      id="phone"
                      value={phoneE164}
                      onChange={(e) => setPhoneE164(e.target.value)}
                      placeholder="+966512345678"
                    />
                  </div>
                  <Button type="submit" disabled={updateMut.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {updateMut.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                <form
                  onSubmit={(e) => { e.preventDefault(); changePwdMut.mutate(); }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="curPwd">Current Password</Label>
                    <Input
                      id="curPwd"
                      type="password"
                      value={curPwd}
                      onChange={(e) => setCurPwd(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPwd">New Password</Label>
                    <Input
                      id="newPwd"
                      type="password"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={changePwdMut.isPending}>
                    <Lock className="w-4 h-4 mr-2" />
                    {changePwdMut.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-sm text-neutral-500">
                <p>Account created: {new Date(profile.createdAt).toLocaleDateString("en-SA")}</p>
                {profile.nationalId && <p>National ID: {profile.nationalId}</p>}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
