import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { getCurrentUser, saveSession } from "@/lib/auth";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  onVerified?: () => void;
  compact?: boolean;
}

export default function NafathVerification({ onVerified, compact }: Props) {
  const user = getCurrentUser();
  const { toast } = useToast();
  const [nationalId, setNationalId] = useState(user?.nationalId ?? "");
  const [step, setStep] = useState<"input" | "pending" | "done">(
    user?.nafathVerified ? "done" : "input"
  );

  const verifyMutation = useMutation({
    mutationFn: (id: string) => authApi.nafathVerify(id),
    onSuccess: async (data) => {
      if (data.status === "verified" || data.status === "auto_verified") {
        setStep("done");
        const updatedUser = await authApi.me();
        const token = localStorage.getItem("auth_token");
        if (token) saveSession(token, updatedUser);
        toast({ title: "Identity verified", description: "Nafath verification complete.", variant: "success" });
        onVerified?.();
      } else {
        setStep("pending");
        toast({ title: "Verification initiated", description: "Check the Nafath app to approve.", variant: "info" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Verification failed", description: err.message, variant: "error" });
    },
  });

  if (step === "done") {
    if (compact) return null;
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">Nafath identity verified</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Identity verification required</p>
            <p className="text-sm text-amber-700 mt-1">
              You need to verify your identity through Nafath before renting luxury items.
            </p>
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="nafath-id" className="text-xs text-amber-800">National ID / Iqama</Label>
                <Input
                  id="nafath-id"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="10-digit ID"
                  maxLength={10}
                  className="mt-1"
                />
              </div>
              <Button
                size="sm"
                onClick={() => verifyMutation.mutate(nationalId)}
                disabled={nationalId.length < 10 || verifyMutation.isPending}
              >
                {verifyMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Verify
              </Button>
            </div>
            {step === "pending" && (
              <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Waiting for Nafath app approval...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Nafath Verification</CardTitle>
            <CardDescription>Verify your identity through the Saudi Digital Identity system</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="nafath-national-id">National ID / Iqama Number</Label>
          <Input
            id="nafath-national-id"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="Enter your 10-digit ID"
            maxLength={10}
            className="mt-1.5"
          />
          <p className="text-xs text-neutral-500 mt-1">Your Iqama or Saudi national ID number</p>
        </div>

        {step === "pending" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Open the Nafath app on your phone and approve the verification request.</span>
          </div>
        )}

        <Button
          className="w-full"
          onClick={() => verifyMutation.mutate(nationalId)}
          disabled={nationalId.length < 10 || verifyMutation.isPending}
        >
          {verifyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {step === "pending" ? "Re-send Verification" : "Verify with Nafath"}
        </Button>
      </CardContent>
    </Card>
  );
}
