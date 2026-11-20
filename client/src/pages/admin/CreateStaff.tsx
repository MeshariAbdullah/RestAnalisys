import React, { useState } from "react";
import { UserPlus, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, type User } from "@/lib/api";

const STAFF_ROLES = [
  { value: "inspector", label: "Inspector" },
  { value: "operations", label: "Operations" },
  { value: "admin", label: "Admin" },
] as const;

export default function CreateStaff() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"inspector" | "operations" | "admin">("inspector");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<User | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await adminApi.createStaff({ email, fullName, password, role });
      setCreated(user);
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("inspector");
    } catch (err: any) {
      setError(err.message ?? "Failed to create staff user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Create staff user</h1>
      <p className="text-neutral-500 mb-8">
        Add inspectors, operations staff or admins to the platform.
      </p>

      {created && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-5 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-green-900">Staff user created</p>
              <p className="text-sm text-green-700 mt-1">
                <span className="font-medium">{created.fullName}</span> ({created.email}) as{" "}
                <Badge className="bg-green-100 text-green-800 border-0 ml-1">{created.role}</Badge>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmed Al-Faisal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@mlr.sa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white hover:bg-neutral-800">
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? "Creating…" : "Create staff user"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
