import React, { useState } from "react";
import { Shield, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export default function NafathVerification({ onVerified }: { onVerified?: () => void }) {
  const user = getCurrentUser();
  const [nationalId, setNationalId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(user?.nafathVerified ?? false);

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
        <CheckCircle2 className="w-4 h-4" />
        Nafath identity verified
      </div>
    );
  }

  async function handleVerify() {
    if (!nationalId.trim()) return;
    setVerifying(true);
    try {
      await authApi.nafathVerify(nationalId);
      const updatedUser = await authApi.me();
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updatedUser);
      setVerified(true);
      toast({ title: "Identity verified", description: "Nafath verification successful.", variant: "success" });
      onVerified?.();
    } catch (err) {
      toast({ title: "Verification failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-amber-900">Nafath Identity Verification Required</h3>
        </div>
        <p className="text-sm text-amber-800 mb-4">
          To rent luxury items, you must verify your identity via Nafath (Saudi Digital ID).
          Enter your national ID or Iqama number below.
        </p>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs text-amber-700">National ID / Iqama</Label>
            <Input
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="e.g. 1234567890"
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleVerify}
            disabled={verifying || !nationalId.trim()}
            className="self-end bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
