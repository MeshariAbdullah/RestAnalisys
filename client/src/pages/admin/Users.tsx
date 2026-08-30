import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, ShieldAlert, ShieldCheck, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", role, debouncedSearch, page],
    queryFn: () => adminApi.users(role === "all" ? undefined : role, debouncedSearch || undefined, page),
  });

  const users = data?.users ?? (Array.isArray(data) ? data : []);
  const pagination = data?.pagination;

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
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
        {pagination && (
          <span className="text-sm text-neutral-500 ml-auto">
            {pagination.total} users total
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : users.length === 0 ? (
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
                    {users.map((u: User) => (
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
              </div>
            </CardContent>
          </Card>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-neutral-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
