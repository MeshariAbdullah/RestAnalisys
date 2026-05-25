import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users as UsersIcon,
  ShieldAlert,
  ShieldCheck,
  Search,
  UserCog,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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

function kycColor(s: string): string {
  if (s === "verified") return "bg-green-100 text-green-700";
  if (s === "pending") return "bg-amber-100 text-amber-800";
  if (s === "rejected") return "bg-red-100 text-red-700";
  return "bg-neutral-100 text-neutral-600";
}

const ROLES = ["renter", "owner", "inspector", "operations", "admin"];

export default function UsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingRole, setEditingRole] = useState<number | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", role, debouncedSearch],
    queryFn: () =>
      adminApi.users({
        role: role === "all" ? undefined : role,
        search: debouncedSearch || undefined,
      }),
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

  async function changeRole(userId: number, newRole: string) {
    try {
      await adminApi.changeRole(userId, newRole);
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingRole(null);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Users</h1>
      <p className="text-neutral-500 mb-6">
        All accounts across the platform.{" "}
        {data && (
          <span className="font-medium text-neutral-700">
            {data.length} users
          </span>
        )}
      </p>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-5">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-neutral-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
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
                    <th className="p-4 font-medium">KYC</th>
                    <th className="p-4 font-medium">Trust</th>
                    <th className="p-4 font-medium">Risk</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b last:border-0 hover:bg-neutral-50/50"
                    >
                      <td className="p-4">
                        <p className="font-medium">{u.fullName}</p>
                        <p className="text-xs text-neutral-400">#{u.id}</p>
                      </td>
                      <td className="p-4 text-neutral-600">{u.email}</td>
                      <td className="p-4">
                        {editingRole === u.id ? (
                          <Select
                            value={u.role}
                            onValueChange={(v) => changeRole(u.id, v)}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline">{u.role}</Badge>
                            {u.role !== "super_admin" && (
                              <button
                                onClick={() => setEditingRole(u.id)}
                                className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
                                title="Change role"
                              >
                                <UserCog className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={`border-0 text-xs ${kycColor(u.kycStatus)}`}
                        >
                          {u.kycStatus}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                u.trustScore >= 70
                                  ? "bg-green-500"
                                  : u.trustScore >= 40
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${u.trustScore}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs">
                            {u.trustScore}
                          </span>
                        </div>
                      </td>
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
                            Verified
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
