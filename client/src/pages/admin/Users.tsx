import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, ShieldAlert, ShieldCheck, X as XIcon } from "lucide-react";
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

function riskColor(c: string): string {
  if (c === "low") return "bg-green-100 text-green-700";
  if (c === "medium") return "bg-amber-100 text-amber-800";
  if (c === "high") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<string>("all");
  const [blockTarget, setBlockTarget] = useState<User | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", role],
    queryFn: () => adminApi.users(role === "all" ? undefined : role),
  });

  function openBlockDialog(u: User) {
    if (u.isBlocked) {
      handleBlock(u, false);
      return;
    }
    setBlockTarget(u);
    setBlockReason("");
  }

  async function handleBlock(u: User, block: boolean, reason?: string) {
    setActionError(null);
    try {
      await adminApi.blockUser(u.id, block, reason);
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      setBlockTarget(null);
    } catch (err) {
      setActionError((err as Error).message);
    }
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
      </div>

      {actionError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {actionError}
        </div>
      )}

      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Block user</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBlockTarget(null)}
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                Blocking <b>{blockTarget.fullName}</b> ({blockTarget.email}) will prevent them from using the platform.
              </p>
              <Label>Reason for blocking</Label>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Policy violation, fraudulent activity…"
                className="mt-1 mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setBlockTarget(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={!blockReason.trim()}
                  onClick={() => handleBlock(blockTarget, true, blockReason)}
                >
                  Block user
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
            <div className="overflow-x-auto">
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
                          onClick={() => openBlockDialog(u)}
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
