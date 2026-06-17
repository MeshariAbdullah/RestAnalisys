import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Gavel,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Scale,
  UserPlus,
  DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { disputesApi, adminApi, formatSar, type Dispute, type User } from "@/lib/api";

type Resolution =
  | "resolved_for_renter"
  | "resolved_for_platform"
  | "resolved_for_owner"
  | "escalated_to_legal";

type StatusFilter = "all" | "open" | "investigating" | "resolved" | "escalated";

function statusColor(s: string): string {
  if (s === "open") return "bg-amber-100 text-amber-800";
  if (s === "investigating" || s === "awaiting_evidence")
    return "bg-blue-100 text-blue-700";
  if (s.startsWith("resolved")) return "bg-green-100 text-green-700";
  if (s === "escalated_to_legal") return "bg-red-100 text-red-700";
  if (s === "closed") return "bg-neutral-200 text-neutral-600";
  return "bg-neutral-200 text-neutral-700";
}

function severityColor(s: string): string {
  if (s === "critical") return "bg-red-100 text-red-700";
  if (s === "high") return "bg-orange-100 text-orange-700";
  if (s === "medium") return "bg-amber-100 text-amber-700";
  return "bg-neutral-100 text-neutral-600";
}

function categoryIcon(c: string): string {
  const map: Record<string, string> = {
    damage: "Damage",
    loss: "Loss",
    fraud: "Fraud",
    service: "Service",
    billing: "Billing",
  };
  return map[c] ?? c;
}

const RESOLVED_STATUSES = [
  "resolved_for_renter",
  "resolved_for_platform",
  "resolved_for_owner",
  "closed",
];

function isResolvable(status: string): boolean {
  return !RESOLVED_STATUSES.includes(status) && status !== "escalated_to_legal";
}

export default function DisputesPage() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);
  const [mode, setMode] = useState<"resolve" | "assign">("resolve");
  const [resolution, setResolution] = useState<Resolution>(
    "resolved_for_renter"
  );
  const [notes, setNotes] = useState("");
  const [compensationHalalas, setCompensationHalalas] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["disputes"],
    queryFn: () => disputesApi.list(),
  });

  const { data: staffUsers } = useQuery({
    queryKey: ["admin-users-staff"],
    queryFn: () => adminApi.users("admin"),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "all") return data;
    if (statusFilter === "open") return data.filter((d) => d.status === "open");
    if (statusFilter === "investigating")
      return data.filter(
        (d) =>
          d.status === "investigating" || d.status === "awaiting_evidence"
      );
    if (statusFilter === "resolved")
      return data.filter((d) => RESOLVED_STATUSES.includes(d.status));
    if (statusFilter === "escalated")
      return data.filter((d) => d.status === "escalated_to_legal");
    return data;
  }, [data, statusFilter]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, open: 0, investigating: 0, resolved: 0, escalated: 0 };
    return {
      total: data.length,
      open: data.filter((d) => d.status === "open").length,
      investigating: data.filter(
        (d) => d.status === "investigating" || d.status === "awaiting_evidence"
      ).length,
      resolved: data.filter((d) => RESOLVED_STATUSES.includes(d.status)).length,
      escalated: data.filter((d) => d.status === "escalated_to_legal").length,
    };
  }, [data]);

  async function resolve(id: number) {
    setError(null);
    try {
      await disputesApi.resolve({
        disputeId: id,
        resolution,
        notes,
        resolutionAmountHalalas: compensationHalalas
          ? Number(compensationHalalas) * 100
          : undefined,
      });
      setOpenId(null);
      setNotes("");
      setCompensationHalalas("");
      await qc.invalidateQueries({ queryKey: ["disputes"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function assign(id: number) {
    setError(null);
    try {
      await disputesApi.assign(id, Number(assigneeId));
      setOpenId(null);
      setAssigneeId("");
      await qc.invalidateQueries({ queryKey: ["disputes"] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Disputes</h1>
          <p className="text-neutral-500 mt-1">
            Manage cases between renters, owners, and the platform.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <Gavel className="w-5 h-5 text-neutral-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-neutral-500">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.open}</p>
              <p className="text-xs text-neutral-500">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.investigating}</p>
              <p className="text-xs text-neutral-500">Investigating</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-xs text-neutral-500">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.escalated}</p>
              <p className="text-xs text-neutral-500">Escalated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="open">Open ({stats.open})</TabsTrigger>
          <TabsTrigger value="investigating">
            Investigating ({stats.investigating})
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({stats.resolved})</TabsTrigger>
          <TabsTrigger value="escalated">
            Escalated ({stats.escalated})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Gavel className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            {statusFilter === "all"
              ? "No disputes."
              : `No ${statusFilter} disputes.`}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d: Dispute) => (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Gavel className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">Dispute #{d.id}</p>
                      <Badge className={`border-0 ${statusColor(d.status)}`}>
                        {d.status.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline">{categoryIcon(d.category)}</Badge>
                      <Badge className={`border-0 ${severityColor(d.severity)}`}>
                        {d.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-600 mt-1">{d.summary}</p>
                    <div className="flex items-center gap-4 text-xs text-neutral-400 mt-2">
                      <span>Rental #{d.rentalId}</span>
                      <span>
                        Opened {new Date(d.openedAt).toLocaleDateString()}
                      </span>
                      {d.resolvedAt && (
                        <span>
                          Resolved{" "}
                          {new Date(d.resolvedAt).toLocaleDateString()}
                        </span>
                      )}
                      {d.resolutionAmountHalalas != null &&
                        d.resolutionAmountHalalas > 0 && (
                          <span className="text-green-600 font-medium">
                            Compensation: {formatSar(d.resolutionAmountHalalas)}
                          </span>
                        )}
                    </div>
                    {d.resolutionNotes && (
                      <p className="text-sm text-neutral-500 mt-2 bg-neutral-50 rounded p-2">
                        {d.resolutionNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {isResolvable(d.status) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMode("assign");
                            setOpenId(openId === d.id && mode === "assign" ? null : d.id);
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Assign
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setMode("resolve");
                            setOpenId(openId === d.id && mode === "resolve" ? null : d.id);
                          }}
                          className="bg-neutral-900 hover:bg-neutral-800"
                        >
                          Resolve
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Assign Panel */}
                {openId === d.id && mode === "assign" && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <Label>Assign to staff member</Label>
                    <Select
                      value={assigneeId}
                      onValueChange={setAssigneeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(staffUsers ?? []).map((u: User) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.fullName} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => assign(d.id)}
                      className="bg-blue-600 text-white hover:bg-blue-500"
                      disabled={!assigneeId}
                    >
                      Assign dispute
                    </Button>
                  </div>
                )}

                {/* Resolve Panel */}
                {openId === d.id && mode === "resolve" && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div>
                      <Label className="mb-1.5 block">Resolution</Label>
                      <Select
                        value={resolution}
                        onValueChange={(v) => setResolution(v as Resolution)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resolved_for_renter">
                            Resolve for renter
                          </SelectItem>
                          <SelectItem value="resolved_for_platform">
                            Resolve for platform
                          </SelectItem>
                          <SelectItem value="resolved_for_owner">
                            Resolve for owner
                          </SelectItem>
                          <SelectItem value="escalated_to_legal">
                            Escalate to legal / Nafith
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-1.5 block">
                        Compensation amount (SAR, optional)
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={compensationHalalas}
                          onChange={(e) =>
                            setCompensationHalalas(e.target.value)
                          }
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1.5 block">
                        Resolution notes (mandatory)
                      </Label>
                      <Textarea
                        placeholder="Describe the resolution decision..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => resolve(d.id)}
                      className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      disabled={!notes.trim()}
                    >
                      Submit resolution
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}
    </div>
  );
}
