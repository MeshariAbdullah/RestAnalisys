import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Shield,
  Phone,
  Mail,
  BadgeCheck,
  AlertCircle,
  Save,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { profileApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import Layout from "@/components/Layout";

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (user && !initialized) {
    setFullName(user.fullName);
    setPhone(user.phoneE164 ?? "");
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      profileApi.update({
        fullName: fullName !== user?.fullName ? fullName : undefined,
        phoneE164: phone !== (user?.phoneE164 ?? "") ? phone : undefined,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      const token = localStorage.getItem("auth_token");
      if (token) {
        saveSession(token, updated);
      }
    },
  });

  const kycColor: Record<string, string> = {
    verified: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    unverified: "bg-neutral-200 text-neutral-600",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <Layout>
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-neutral-500 mb-8">
          Manage your account information.
        </p>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
            <div className="h-60 rounded-xl bg-neutral-100 animate-pulse" />
          </div>
        ) : user ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-neutral-950" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{user.fullName}</h2>
                    <p className="text-sm text-neutral-500">{user.email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge className="capitalize">{user.role.replace("_", " ")}</Badge>
                      <Badge className={kycColor[user.kycStatus] ?? kycColor.unverified}>
                        KYC: {user.kycStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-500">Trust score:</span>
                    <span className="font-semibold">{user.trustScore}/100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.nafathVerified ? (
                      <BadgeCheck className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-neutral-500">Nafath:</span>
                    <span className="font-semibold">
                      {user.nafathVerified ? "Verified" : "Not verified"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-500">Email verified:</span>
                    <span className="font-semibold">
                      {user.emailVerified ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-500">Phone verified:</span>
                    <span className="font-semibold">
                      {user.phoneVerified ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Edit profile</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone (E.164)</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+966…"
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
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-neutral-950"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  {updateMutation.isSuccess && (
                    <p className="text-sm text-green-600">Profile updated.</p>
                  )}
                  {updateMutation.isError && (
                    <p className="text-sm text-red-600">
                      Failed to update: {(updateMutation.error as Error).message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
