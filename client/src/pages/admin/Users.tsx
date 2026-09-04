import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, type User } from "@/lib/api";

function riskColor(c: string): string {
  if (c === "low") return "bg-green-100 text-green-700";
  if (c === "medium") return "bg-amber-100 text-amber-800";
  if (c === "high") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function CreateStaffForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [staffRole, setStaffRole] = useState<"admin" | "operations" | "inspector">("operations");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createStaffUser({ email, fullName, role: staffRole, password }),
    onSuccess: () => {
      setEmail("");
      setFullName("");
      setPassword("");
      setError("");
      onCreated();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Create Staff Account
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as typeof staffRole)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="operations">Operations</option>
            <option value="inspector">Inspector</option>
            <option value="admin">Admin</option>
          </select>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
        <Button
          size="sm"
          className="mt-3"
          disabled={!email || !fullName || !password || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          Create
        </Button>
      </CardContent>
    </Card>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);

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
      <h1 className="text-3xl font-bold mb-2">Users</h1>
      <p className="text-neutral-500 mb-6">
        All accounts across the platform.
      </p>

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
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          {showCreateForm ? "Hide" : "New Staff"}
        </Button>
      </div>

      {showCreateForm && (
        <CreateStaffForm
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            setShowCreateForm(false);
          }}
        />
      )}

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
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
