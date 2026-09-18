import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { rentalsApi, formatSar, type Rental } from "../../lib/api";

const ACTION_MAP: Record<string, { label: string; action: string; variant: "default" | "destructive" | "outline" }[]> = {
  confirmed: [{ label: "Fulfill (Schedule Delivery)", action: "fulfill", variant: "default" }],
  out_for_delivery: [{ label: "Mark Delivered", action: "delivered", variant: "default" }],
  active: [{ label: "Mark Returned", action: "returned", variant: "outline" }],
  under_inspection: [
    { label: "Close — Clean", action: "close_clean", variant: "default" },
    { label: "Close — Penalty", action: "close_penalty", variant: "outline" },
    { label: "Close — Major Damage", action: "close_major_damage", variant: "destructive" },
    { label: "Close — Loss", action: "close_loss", variant: "destructive" },
  ],
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  active: "bg-green-100 text-green-800",
  under_inspection: "bg-purple-100 text-purple-800",
  return_in_transit: "bg-cyan-100 text-cyan-800",
  closed: "bg-gray-100 text-gray-800",
  closed_with_penalty: "bg-red-100 text-red-800",
  in_dispute: "bg-red-100 text-red-800",
  enforcement: "bg-red-200 text-red-900",
};

export default function RentalManagement() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [penaltyInput, setPenaltyInput] = useState<{ rentalId: number; amount: string } | null>(null);
  const [filter, setFilter] = useState("actionable");

  useEffect(() => {
    loadRentals();
  }, []);

  async function loadRentals() {
    try {
      const data = await rentalsApi.list();
      setRentals(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(rental: Rental, action: string) {
    setActionLoading(rental.id);
    setError("");
    try {
      if (action === "fulfill") await rentalsApi.fulfill(rental.id);
      else if (action === "delivered") await rentalsApi.delivered(rental.id);
      else if (action === "returned") await rentalsApi.returned(rental.id);
      else if (action === "close_clean") await rentalsApi.close(rental.id, "clean");
      else if (action === "close_penalty") {
        setPenaltyInput({ rentalId: rental.id, amount: "" });
        setActionLoading(null);
        return;
      }
      else if (action === "close_major_damage") await rentalsApi.close(rental.id, "major_damage");
      else if (action === "close_loss") await rentalsApi.close(rental.id, "loss");
      await loadRentals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function submitPenalty() {
    if (!penaltyInput) return;
    setActionLoading(penaltyInput.rentalId);
    try {
      await rentalsApi.close(penaltyInput.rentalId, "penalty", Math.round(Number(penaltyInput.amount) * 100));
      setPenaltyInput(null);
      await loadRentals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  const actionableStatuses = ["confirmed", "out_for_delivery", "active", "under_inspection", "return_in_transit"];
  const filtered = filter === "actionable"
    ? rentals.filter((r) => actionableStatuses.includes(r.status))
    : rentals;

  if (loading) return <Layout><div className="p-8 text-center text-muted-foreground">Loading rentals...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Rental Lifecycle</h1>
          <div className="flex gap-2">
            <Button
              variant={filter === "actionable" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("actionable")}
            >
              Actionable ({rentals.filter((r) => actionableStatuses.includes(r.status)).length})
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({rentals.length})
            </Button>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>}

        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-12">No rentals to display.</div>
        )}

        <div className="space-y-3">
          {filtered.map((rental) => {
            const actions = ACTION_MAP[rental.status] ?? [];
            return (
              <Card key={rental.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{rental.reference}</span>
                        <Badge className={STATUS_COLORS[rental.status] ?? "bg-gray-100 text-gray-800"}>
                          {rental.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {rental.startDate} — {rental.endDate} · {formatSar(rental.totalPayableHalalas)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {actions.map((a) => (
                        <Button
                          key={a.action}
                          variant={a.variant}
                          size="sm"
                          disabled={actionLoading === rental.id}
                          onClick={() => handleAction(rental, a.action)}
                        >
                          {actionLoading === rental.id ? "..." : a.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {penaltyInput?.rentalId === rental.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-sm w-40"
                        placeholder="Penalty in SAR"
                        value={penaltyInput.amount}
                        onChange={(e) => setPenaltyInput({ ...penaltyInput, amount: e.target.value })}
                      />
                      <Button size="sm" onClick={submitPenalty} disabled={!penaltyInput.amount}>
                        Apply Penalty
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPenaltyInput(null)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
