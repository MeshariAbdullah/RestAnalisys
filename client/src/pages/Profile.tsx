import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Key, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authApi, profileApi } from "@/lib/api";

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const [profileMsg, setProfileMsg] = useState("");

  React.useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phoneE164 ?? "");
      const addr = (user as any).nationalAddressJson as any;
      if (addr) {
        setCity(addr.city ?? "");
        setDistrict(addr.district ?? "");
        setStreet(addr.street ?? "");
      }
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: () =>
      profileApi.update({
        fullName,
        phone: phone || undefined,
        nationalAddressJson:
          city && district && street
            ? { city, district, street }
            : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setProfileMsg("Profile updated!");
      setTimeout(() => setProfileMsg(""), 3000);
    },
    onError: (e: any) => setProfileMsg(e.message),
  });

  const changePw = useMutation({
    mutationFn: () => profileApi.changePassword(currentPw, newPw),
    onSuccess: () => {
      setPwMsg("Password changed successfully.");
      setCurrentPw("");
      setNewPw("");
      setTimeout(() => setPwMsg(""), 3000);
    },
    onError: (e: any) => setPwMsg(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="h-64 bg-neutral-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <User className="w-6 h-6" />
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" /> Account Info
            </h2>
            <Badge>{user?.role}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Email</span>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <span className="text-neutral-500">Trust Score</span>
              <p className="font-medium">{user?.trustScore}/100</p>
            </div>
            <div>
              <span className="text-neutral-500">KYC Status</span>
              <Badge
                variant={user?.kycStatus === "verified" ? "default" : "secondary"}
              >
                {user?.kycStatus}
              </Badge>
            </div>
            <div>
              <span className="text-neutral-500">Nafath</span>
              <Badge variant={user?.nafathVerified ? "default" : "secondary"}>
                {user?.nafathVerified ? "Verified" : "Not verified"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold">Edit Profile</h2>
          <div className="space-y-3">
            <div>
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <Label>Phone (Saudi)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+9665XXXXXXXX"
              />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> National Address
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Riyadh"
                />
              </div>
              <div>
                <Label>District</Label>
                <Input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
              <div>
                <Label>Street</Label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
            </div>
          </div>
          {profileMsg && (
            <p className="text-sm text-green-600">{profileMsg}</p>
          )}
          <Button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Key className="w-4 h-4" /> Change Password
          </h2>
          <div className="space-y-3">
            <div>
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {pwMsg}
            </p>
          )}
          <Button
            onClick={() => changePw.mutate()}
            disabled={changePw.isPending || !currentPw || !newPw}
          >
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
