import React from "react";
import NafathVerification from "@/components/NafathVerification";
import { useLocation } from "wouter";

export default function NafathVerify() {
  const [, navigate] = useLocation();
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Identity Verification</h1>
      <p className="text-neutral-500 mb-6">
        Saudi law requires identity verification before you can rent luxury items through the platform.
      </p>
      <NafathVerification onVerified={() => navigate("/browse")} />
    </div>
  );
}
