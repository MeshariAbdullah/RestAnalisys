import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  FileText,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rentalsApi, paymentsApi, formatSar } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

function statusColor(s: string): string {
  if (s === "active") return "bg-green-100 text-green-700";
  if (s === "confirmed") return "bg-blue-100 text-blue-700";
  if (s.includes("closed_clean")) return "bg-green-100 text-green-700";
  if (s.includes("closed")) return "bg-red-100 text-red-700";
  if (s.includes("cancelled")) return "bg-neutral-200 text-neutral-700";
  return "bg-amber-100 text-amber-800";
}

export default function RentalDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [acting, setActing] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeOutcome, setCloseOutcome] = useState<string>("clean");
  const [penaltySar, setPenaltySar] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  async function doAction(action: () => Promise<unknown>, successMsg: string) {
    setActing(true);
    try {
      await action();
      toast({ title: successMsg, variant: "success" });
      await qc.invalidateQueries({ queryKey: ["rental", id] });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  }

  async function handleClose() {
    setCloseDialogOpen(false);
    const penalty = penaltySar ? Math.round(Number(penaltySar) * 100) : undefined;
    await doAction(
      () => rentalsApi.close(id, closeOutcome as "clean" | "penalty" | "major_damage" | "loss", penalty),
      `Rental closed: ${closeOutcome}`
    );
  }

  if (isLoading) return <div className="p-8 text-neutral-500">Loading...</div>;
  if (error || !data) return <div className="p-8 text-red-600">Failed to load rental.</div>;

  const { rental, legal, sanad, payments } = data;
  const status = rental.status;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1 as unknown as string)}>
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">{rental.reference}</h1>
        <Badge className={`border-0 text-sm ${statusColor(status)}`}>
          {status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Rental info
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-neutral-500">Start date</span>
              <span>{new Date(rental.startDate).toLocaleDateString()}</span>
              <span className="text-neutral-500">End date</span>
              <span>{new Date(rental.endDate).toLocaleDateString()}</span>
              <span className="text-neutral-500">Duration</span>
              <span>{rental.durationDays} days</span>
              <span className="text-neutral-500">Daily rate</span>
              <span>{formatSar(rental.dailyPriceHalalas)}</span>
              <span className="text-neutral-500">Subtotal</span>
              <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
              <span className="text-neutral-500">Platform fee</span>
              <span>{formatSar(rental.platformFeeHalalas)}</span>
              <span className="text-neutral-500">VAT (15%)</span>
              <span>{formatSar(rental.vatHalalas)}</span>
              <span className="text-neutral-500 font-medium">Total payable</span>
              <span className="font-bold">{formatSar(rental.totalPayableHalalas)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Legal & risk
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-neutral-500">Commitment %</span>
              <span>{rental.legalCommitmentPct}%</span>
              <span className="text-neutral-500">Commitment amount</span>
              <span className="font-bold text-amber-600">{formatSar(rental.legalCommitmentHalalas)}</span>
              <span className="text-neutral-500">Trust score</span>
              <span>{rental.trustScoreAtBooking ?? "—"}</span>
              {legal && (
                <>
                  <span className="text-neutral-500">Contract</span>
                  <span>
                    <Badge variant="outline">{legal.status}</Badge>
                  </span>
                </>
              )}
              {sanad && (
                <>
                  <span className="text-neutral-500">Sanad</span>
                  <span>
                    <Badge variant="outline">{sanad.status}</Badge>
                  </span>
                  <span className="text-neutral-500">Sanad ref</span>
                  <span className="font-mono text-xs">{sanad.nafithReference ?? "—"}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {payments.length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4" />
              Payments
            </h3>
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50 text-left">
                <tr>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Gateway</th>
                  <th className="p-3 font-medium">Invoice</th>
                  <th className="p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3">{p.type}</td>
                    <td className="p-3 font-medium">{formatSar(p.amountHalalas)}</td>
                    <td className="p-3">
                      <Badge variant="outline">{p.status}</Badge>
                    </td>
                    <td className="p-3 text-neutral-500">{p.gateway}</td>
                    <td className="p-3 font-mono text-xs">{p.invoiceNumber ?? "—"}</td>
                    <td className="p-3 text-neutral-500">
                      {p.capturedAt ? new Date(p.capturedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4" />
            Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            {status === "confirmed" && (
              <Button
                disabled={acting}
                onClick={() => doAction(() => rentalsApi.fulfill(id), "Rental fulfilled — out for delivery")}
                className="bg-blue-600 text-white hover:bg-blue-500"
              >
                <Truck className="w-4 h-4 mr-1.5" />
                Fulfill (ship to renter)
              </Button>
            )}
            {status === "out_for_delivery" && (
              <Button
                disabled={acting}
                onClick={() => doAction(() => rentalsApi.delivered(id), "Marked as delivered")}
                className="bg-green-600 text-white hover:bg-green-500"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Mark delivered
              </Button>
            )}
            {status === "active" && (
              <Button
                disabled={acting}
                onClick={() => doAction(() => rentalsApi.returned(id), "Item returned — sent to inspection")}
                className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                <Package className="w-4 h-4 mr-1.5" />
                Mark returned
              </Button>
            )}
            {status === "under_inspection" && (
              <Button
                disabled={acting}
                onClick={() => setCloseDialogOpen(true)}
                className="bg-neutral-900 text-white hover:bg-neutral-800"
              >
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Close rental
              </Button>
            )}
            {status === "confirmed" && (
              <Button
                disabled={acting}
                variant="outline"
                onClick={() => doAction(() => paymentsApi.releasePayout(id), "Owner payout released")}
              >
                <DollarSign className="w-4 h-4 mr-1.5" />
                Release payout
              </Button>
            )}
          </div>
          {!["confirmed", "out_for_delivery", "active", "under_inspection"].includes(status) && (
            <p className="text-sm text-neutral-500 mt-2">
              No actions available for status: {status.replace(/_/g, " ")}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close rental</DialogTitle>
            <DialogDescription>
              Select the outcome based on the return inspection report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Outcome</Label>
              <Select value={closeOutcome} onValueChange={setCloseOutcome}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clean">Clean — no issues</SelectItem>
                  <SelectItem value="penalty">Penalty — minor damage</SelectItem>
                  <SelectItem value="major_damage">Major damage</SelectItem>
                  <SelectItem value="loss">Loss — item not returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(closeOutcome === "penalty" || closeOutcome === "major_damage") && (
              <div>
                <Label>Penalty amount (SAR)</Label>
                <Input
                  type="number"
                  min="1"
                  value={penaltySar}
                  onChange={(e) => setPenaltySar(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. 500"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleClose}
              className={
                closeOutcome === "loss" || closeOutcome === "major_damage"
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "bg-amber-500 text-neutral-950 hover:bg-amber-400"
              }
            >
              Confirm close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
