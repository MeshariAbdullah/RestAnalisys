import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Diamond } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { saveSession, homeForRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [role, setRole] = useState<"renter" | "owner">("renter");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.register(email, password, fullName, role);
      saveSession(res.token, res.user);
      toast({ title: "Welcome to MLR!", description: "Your account has been created.", variant: "success" });
      navigate(homeForRole(res.user.role));
    } catch (err) {
      setError((err as Error).message ?? "Registration failed");
      toast({ title: "Registration failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/">
          <a className="flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Diamond className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <p className="font-bold">MLR</p>
              <p className="text-xs text-neutral-400">Luxury Rental Platform</p>
            </div>
          </a>
        </Link>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Join as a renter or an asset owner
          </p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {(["renter", "owner"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                  role === r
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                }`}
              >
                {r === "renter" ? "Rent items" : "List my assets"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-neutral-300">Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-neutral-300">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-neutral-300">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-neutral-950 border-neutral-800 text-white"
                placeholder="Min 8 chars, upper + lower + digit"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-md p-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-xs text-neutral-500 text-center">
              By registering you agree to the MLR terms. Nafath identity
              verification is required before your first transaction.
            </p>
          </form>

          <p className="text-center text-sm text-neutral-400 mt-6">
            Already registered?{" "}
            <Link href="/login">
              <a className="text-amber-400 hover:underline">Sign in</a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
