import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, ShieldAlert, ShieldCheck, Plus, AlertTriangle } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

function riskColor(c: string): string {
  if (c === "low") return "bg-green-100 text-green-700";
  if (c === "medium") return "bg-amber-100 text-amber-800";
  if (c === "high") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<string>("all");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users", role],
    queryFn: () => adminApi.users(role === "all" ? undefined : role),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "operations" | "inspector">("operations");
  const [creating, setCreating] = useState(false);

  async function toggleBlock(u: User) {
    const block = !u.isBlocked;
    const reason = block
      ? prompt("Reason for blocking?") ?? undefined
      : undefined;
    if (block && !reason) return;
    try {
      await adminApi.blockUser(u.id, block, reason);
      toast({ title: block ? "User blocked" : "User unblocked", variant: "success" });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createStaff({ email: newEmail, fullName: newName, password: newPassword, role: newRole });
      toast({ title: "Staff user created", description: `${newEmail} (${newRole})`, variant: "success" });
      setShowCreate(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast({ title: "Failed to create user", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Users</h1>
      <p className="text-neutral-500 mb-6">
        All accounts across the platform.
      </p>

      {showCreate && (
        <Card className="mb-6 border-amber-200 bg-amber-50/30">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Create staff account</h3>
            <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Full name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required minLength={2} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="inspector">Inspector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={creating} className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
                  {creating ? "Creating…" : "Create account"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)} className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
            <Plus className="w-4 h-4 mr-1.5" /> Create staff
          </Button>
        )}
      </div>

      {isError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Failed to load data</p>
          <p className="text-sm text-red-600 mt-1">{(error as Error).message}</p>
        </div>
      ) : isLoading ? (
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
