import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Users as UsersIcon, ShieldAlert, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
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
import { useToast } from "@/components/ui/toast";

function riskColor(c: string): string {
  if (c === "low") return "bg-green-100 text-green-700";
  if (c === "medium") return "bg-amber-100 text-amber-800";
  if (c === "high") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [role, setRole] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", role, page],
    queryFn: () => adminApi.users(role === "all" ? undefined : role),
  });

  const allUsers = data ?? [];
  const paginated = allUsers.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(allUsers.length / limit);

  const blockMut = useMutation({
    mutationFn: ({ id, block, reason }: { id: number; block: boolean; reason?: string }) =>
      adminApi.blockUser(id, block, reason),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast(vars.block ? "User blocked" : "User unblocked", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  function toggleBlock(u: User) {
    const block = !u.isBlocked;
    const reason = block ? prompt("Reason for blocking?") ?? undefined : undefined;
    if (block && !reason) return;
    blockMut.mutate({ id: u.id, block, reason });
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Users</h1>
      <p className="text-neutral-500 mb-6">
        All accounts across the platform ({allUsers.length} total).
      </p>

      <div className="flex items-center gap-3 mb-5">
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
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
            <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
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
        <>
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
                  {paginated.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-neutral-50">
                      <td className="p-4 font-medium">{u.fullName}</td>
                      <td className="p-4 text-neutral-600">{u.email}</td>
                      <td className="p-4">
                        <Badge variant="outline">{u.role}</Badge>
                      </td>
                      <td className="p-4 font-mono">{u.trustScore}</td>
                      <td className="p-4">
                        <Badge className={`border-0 ${riskColor(u.riskCategory)}`}>
                          {u.riskCategory}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {u.isBlocked ? (
                          <Badge className="bg-red-100 text-red-700 border-0">Blocked</Badge>
                        ) : u.nafathVerified ? (
                          <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-0">Unverified</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleBlock(u)}
                          disabled={blockMut.isPending}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
