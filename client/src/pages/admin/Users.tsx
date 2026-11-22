import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users as UsersIcon,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, type User } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

function riskColor(c: string): string {
  if (c === "low") return "bg-green-100 text-green-700";
  if (c === "medium") return "bg-amber-100 text-amber-800";
  if (c === "high") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", role],
    queryFn: () => adminApi.users(role === "all" ? undefined : role),
  });

  async function toggleBlock(u: User) {
    const block = !u.isBlocked;
    const reason = block
      ? prompt("Reason for blocking?") ?? undefined
      : undefined;
    if (block && !reason) return;
    await adminApi.blockUser(u.id, block, reason);
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Users</h1>
          <p className="text-neutral-500">
            All accounts across the platform.
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Staff User
          </Button>
        )}
      </div>

      {showCreate && (
        <CreateStaffDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["admin-users"] });
          }}
        />
      )}

      <div className="flex items-center gap-3 mb-5">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="renter">Renter</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="inspector">Inspector</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            No users found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50 text-left">
                <tr>
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Trust</th>
                  <th className="p-4 font-medium">Risk</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-4 font-medium">{u.fullName}</td>
                    <td className="p-4 text-neutral-600">{u.email}</td>
                    <td className="p-4">
                      <Badge variant="outline">{u.role}</Badge>
                    </td>
                    <td className="p-4 font-mono">{u.trustScore}</td>
                    <td className="p-4">
                      <Badge
                        className={`border-0 ${riskColor(u.riskCategory)}`}
                      >
                        {u.riskCategory}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {u.isBlocked ? (
                        <Badge className="bg-red-100 text-red-700 border-0">
                          Blocked
                        </Badge>
                      ) : u.nafathVerified ? (
                        <Badge className="bg-green-100 text-green-700 border-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-0">
                          Unverified
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleBlock(u)}
                      >
                        {u.isBlocked ? (
                          <>
                            <ShieldCheck className="w-4 h-4 mr-1" />
                            Unblock
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-4 h-4 mr-1" />
                            Block
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateStaffDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"inspector" | "operations" | "admin">("inspector");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.createStaffUser({
        email,
        password,
        fullName,
        role: staffRole,
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message ?? "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Create Staff User</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="staff-name">Full name</Label>
              <Input
                id="staff-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="staff-password">Password</Label>
              <Input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-neutral-500 mt-1">Minimum 8 characters</p>
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={staffRole}
                onValueChange={(v) => setStaffRole(v as typeof staffRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspector">Inspector</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {submitting ? "Creating..." : "Create user"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
