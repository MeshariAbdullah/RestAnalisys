import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import NafathVerification from "@/components/NafathVerification";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";

export default function NafathVerify() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => authApi.me(),
  });

  async function handleVerified() {
    const freshUser = await authApi.me();
    const token = localStorage.getItem("auth_token");
    if (token) {
      saveSession(token, freshUser);
    }
    queryClient.invalidateQueries({ queryKey: ["auth-me"] });
  }

  const displayUser = user ?? getCurrentUser();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <ShieldCheck className="w-4 h-4" />
        Identity Verification
      </div>
      <h1 className="text-3xl font-bold mb-2">Nafath Verification</h1>
      <p className="text-neutral-500 mb-8">
        Verify your Saudi Digital Identity to unlock rentals and legal
        commitments on the platform.
      </p>

      {isLoading ? (
        <div className="h-40 rounded-xl bg-neutral-100 animate-pulse" />
      ) : (
        <NafathVerification
          currentStatus={displayUser?.kycStatus ?? "unverified"}
          onVerified={handleVerified}
        />
      )}
    </div>
  );
}
