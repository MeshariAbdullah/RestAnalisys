import React, { useState } from "react";
import { useLocation } from "wouter";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type StaffRole = "admin" | "inspector" | "operations";

export default function CreateStaffUser() {
  const [, navigate] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("inspector");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
      await adminApi.createStaffUser({ email, password, fullName, role });
      toast({
        title: "Staff account created",
        description: `${fullName} (${role}) can now log in.`,
        variant: "success",
      });
      navigate("/admin/users");
    } catch (err) {
      setError((err as Error).message ?? "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-2 text-sm text-neutral-500">
        <UserPlus className="w-4 h-4" />
        Create staff account
      </div>
      <h1 className="text-3xl font-bold mb-1">New staff user</h1>
      <p className="text-neutral-500 mb-8">
        Create an account for inspectors, operations or admin staff. Nafath verification is pre-approved.
      </p>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Fahad Al-Sulaiman"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. fahad@mlr.sa"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="mt-1"
                required
                minLength={8}
              />
            </div>

            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspector">Inspector</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            {submitting ? "Creating..." : "Create account"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/users")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
