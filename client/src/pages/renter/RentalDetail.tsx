import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  FileText,
  Shield,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import { rentalsApi, disputesApi, formatSar } from "@/lib/api";
import { getStatusLabel } from "@/lib/utils";

export default function RentalDetail({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCancel, setShowCancel] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeCategory, setDisputeCategory] = useState<string>("service");
  const [disputeSummary, setDisputeSummary] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => rentalsApi.get(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => rentalsApi.cancel(id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      queryClient.invalidateQueries({ queryKey: ["rentals-mine"] });
      toast({ description: "Rental cancelled", variant: "success" });
      setShowCancel(false);
    },
    onError: (e: Error) => toast({ description: e.message, variant: "destructive" }),
  });

  const disputeMutation = useMutation({
    mutationFn: () =>
      disputesApi.open({
        rentalId: id,
        category: disputeCategory as "damage" | "loss" | "fraud" | "service" | "billing",
        summary: disputeSummary,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental", id] });
      toast({ description: "Dispute opened successfully", variant: "success" });
      setShowDispute(false);
      setDisputeSummary("");
    },
    onError: (e: Error) => toast({ description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="h-48 bg-neutral-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center text-neutral-500">
        Rental not found.
      </div>
    );
  }

  const { rental, legal, sanad, payments } = data;
  const canCancel = ["pending_risk_review", "pending_legal_signing", "pending_payment"].includes(
    rental.status
  );
  const canDispute = ["active", "under_inspection", "closed", "closed_with_penalty"].includes(
    rental.status
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/my-rentals">
        <a className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to My Rentals
        </a>
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">{rental.reference}</h1>
          <Badge className="mt-2">{getStatusLabel(rental.status)}</Badge>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-500">Total payable</p>
          <p className="text-2xl font-bold">{formatSar(rental.totalPayableHalalas)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" /> Rental Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Period" value={`${rental.startDate} → ${rental.endDate}`} />
            <Row label="Duration" value={`${rental.durationDays} days`} />
            <Row label="Daily rate" value={formatSar(rental.dailyPriceHalalas)} />
            <Row label="Subtotal" value={formatSar(rental.rentalSubtotalHalalas)} />
            <Row label="Platform fee" value={formatSar(rental.platformFeeHalalas)} />
            <Row label="VAT (15%)" value={formatSar(rental.vatHalalas)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" /> Legal & Risk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Trust score" value={`${rental.trustScoreAtBooking ?? "—"}`} />
            <Row label="Commitment" value={`${rental.legalCommitmentPct}% — ${formatSar(rental.legalCommitmentHalalas)}`} />
            {legal && (
              <>
                <Row label="Contract status" value={getStatusLabel(legal.status)} />
                {legal.signedAt && <Row label="Signed at" value={new Date(legal.signedAt).toLocaleDateString()} />}
              </>
            )}
            {sanad && (
              <>
                <Row label="Sanad status" value={getStatusLabel(sanad.status)} />
                {sanad.nafithReference && <Row label="Sanad ref" value={sanad.nafithReference} />}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {payments.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between items-center py-2 text-sm">
                  <div>
                    <span className="capitalize">{p.type}</span>
                    <Badge className="ml-2" variant={p.status === "captured" ? "success" : "secondary"}>
                      {p.status}
                    </Badge>
                  </div>
                  <span className="font-medium">{formatSar(p.amountHalalas)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap">
        {canCancel && (
          <Button variant="destructive" onClick={() => setShowCancel(true)}>
            Cancel Rental
          </Button>
        )}
        {canDispute && (
          <Button variant="outline" onClick={() => setShowDispute(true)}>
            <AlertTriangle className="w-4 h-4 mr-1" /> Open Dispute
          </Button>
        )}
        {legal && rental.status === "pending_legal_signing" && (
          <Link href={`/legal/${legal.id}`}>
            <Button>Sign Contract</Button>
          </Link>
        )}
      </div>

      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel rental</DialogTitle>
            <DialogDescription>
              This will cancel the rental and release the reserved asset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why are you cancelling?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Keep Rental
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason || cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDispute} onOpenChange={setShowDispute}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a dispute</DialogTitle>
            <DialogDescription>
              Describe the issue with this rental. Our team will investigate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category</Label>
              <Select value={disputeCategory} onValueChange={setDisputeCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="fraud">Fraud</SelectItem>
                  <SelectItem value="service">Service Issue</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={disputeSummary}
                onChange={(e) => setDisputeSummary(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDispute(false)}>
              Cancel
            </Button>
            <Button
              disabled={!disputeSummary || disputeMutation.isPending}
              onClick={() => disputeMutation.mutate()}
            >
              {disputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
