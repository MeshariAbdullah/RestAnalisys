import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { authApi, type User } from "@/lib/api";
import { getCurrentUser, saveSession, clearSession } from "@/lib/auth";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User as UserIcon,
  Phone,
  Mail,
  Fingerprint,
  TrendingUp,
  Loader2,
} from "lucide-react";

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        ok
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-neutral-100 text-neutral-500 border border-neutral-200"
      }`}
    >
      {ok ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

function trustColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function riskBadge(cat: string) {
  const colors: Record<string, string> = {
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-red-50 text-red-700 border-red-200",
    ultra_high: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
        colors[cat] ?? colors.medium
      }`}
    >
      {cat.replace("_", " ").toUpperCase()}
    </span>
  );
}

export default function Profile() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nafathLoading, setNafathLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [nationalId, setNationalId] = useState("");

  useEffect(() => {
    authApi
      .me()
      .then((u) => {
        setUser(u);
        setForm({ fullName: u.fullName, phone: u.phoneE164 ?? "" });
        setLoading(false);
      })
      .catch(() => {
        clearSession();
        navigate("/login");
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await authApi.updateProfile({
        fullName: form.fullName,
        phone: form.phone || undefined,
      });
      setUser(updated);
      const token = localStorage.getItem("auth_token");
      if (token) saveSession(token, updated);
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message ?? "Failed to update" });
    } finally {
      setSaving(false);
    }
  }

  async function handleNafath() {
    if (!nationalId || nationalId.length !== 10) {
      setMessage({ type: "error", text: "Enter a valid 10-digit National ID" });
      return;
    }
    setNafathLoading(true);
    setMessage(null);
    try {
      const result = await authApi.nafathVerify(nationalId);
      if (result.status === "verified") {
        const updated = await authApi.me();
        setUser(updated);
        const token = localStorage.getItem("auth_token");
        if (token) saveSession(token, updated);
        setMessage({ type: "success", text: "Nafath verification successful!" });
      } else {
        setMessage({ type: "success", text: "Verification pending — check your Nafath app" });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message ?? "Nafath verification failed" });
    } finally {
      setNafathLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Trust Score Card */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Trust Score
          </h2>
          {riskBadge(user.riskCategory)}
        </div>
        <div className="flex items-end gap-2">
          <span className={`text-4xl font-bold ${trustColor(user.trustScore)}`}>
            {user.trustScore}
          </span>
          <span className="text-neutral-400 text-sm mb-1">/ 100</span>
        </div>
        <div className="mt-3 h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              user.trustScore >= 80
                ? "bg-emerald-500"
                : user.trustScore >= 60
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
            style={{ width: `${user.trustScore}%` }}
          />
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          <Badge ok={user.nafathVerified} label="Nafath" />
          <Badge ok={user.kycStatus === "verified"} label="KYC" />
          <Badge ok={!!user.phoneE164} label="Phone" />
          <Badge ok={user.kycStatus === "verified"} label="Email" />
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <UserIcon className="w-5 h-5 text-amber-500" />
          Personal Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Email</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg border text-neutral-500">
              <Mail className="w-4 h-4" />
              {user.email}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Phone</label>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+9665XXXXXXXX"
                className="flex-1 px-3 py-2 rounded-lg border focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Role</label>
            <span className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm font-medium capitalize">
              {user.role.replace("_", " ")}
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Nafath Verification */}
      {!user.nafathVerified && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            <Fingerprint className="w-5 h-5 text-amber-500" />
            Nafath Identity Verification
          </h2>
          <p className="text-sm text-neutral-500 mb-4">
            Verify your identity with Saudi Digital Identity (Nafath) to unlock luxury rentals and
            increase your trust score.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="National ID (10 digits)"
              className="flex-1 px-3 py-2 rounded-lg border focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
            <button
              onClick={handleNafath}
              disabled={nafathLoading}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              {nafathLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify
            </button>
          </div>
        </div>
      )}

      {user.nafathVerified && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-emerald-800">Nafath Verified</p>
              <p className="text-sm text-emerald-600">
                Your identity has been verified with Saudi Digital Identity
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
