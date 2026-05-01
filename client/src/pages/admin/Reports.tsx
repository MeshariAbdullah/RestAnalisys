import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, BarChart3, Users, AlertTriangle, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reportsApi, formatSar } from "@/lib/api";

function DateRangeSelector({ from, to, onChange }: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="text-neutral-500">From</label>
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="border rounded px-2 py-1"
      />
      <label className="text-neutral-500">To</label>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="border rounded px-2 py-1"
      />
    </div>
  );
}

export default function Reports() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  const financialQuery = useQuery({
    queryKey: ["report-financial", from, to],
    queryFn: () => reportsApi.financial(from, to),
  });

  const assetsQuery = useQuery({
    queryKey: ["report-assets"],
    queryFn: () => reportsApi.assets(),
  });

  const usersQuery = useQuery({
    queryKey: ["report-users"],
    queryFn: () => reportsApi.users(),
  });

  const disputesQuery = useQuery({
    queryKey: ["report-disputes"],
    queryFn: () => reportsApi.disputes(),
  });

  const fin = financialQuery.data;
  const assetData = assetsQuery.data;
  const userData = usersQuery.data;
  const disputeData = disputesQuery.data;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Reports</h1>
          <p className="text-neutral-500">Comprehensive platform analytics and exports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => reportsApi.exportRentals(from, to)}>
            <Download className="w-4 h-4 mr-1" /> Export Rentals CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => reportsApi.exportPayments(from, to)}>
            <Download className="w-4 h-4 mr-1" /> Export Payments CSV
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <DateRangeSelector from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      {/* Financial Summary */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" /> Financial Summary
      </h2>
      {fin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-neutral-500 mb-1">Total Rentals</p>
              <p className="text-2xl font-bold">{fin.rental.totalRentals}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-neutral-50">
            <CardContent className="p-5">
              <p className="text-xs text-neutral-500 mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-green-700">{formatSar(fin.rental.totalCollectedHalalas)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-neutral-500 mb-1">Platform Fees</p>
              <p className="text-2xl font-bold text-amber-600">{formatSar(fin.rental.platformFeesHalalas)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-neutral-500 mb-1">VAT Collected</p>
              <p className="text-2xl font-bold">{formatSar(fin.rental.vatHalalas)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {fin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">Payment Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Captured</span>
                  <Badge variant="default">{fin.payments.captured}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Failed</span>
                  <Badge variant="destructive">{fin.payments.failed}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Refunded</span>
                  <Badge variant="secondary">{fin.payments.refunded}</Badge>
                </div>
                <hr />
                <div className="flex justify-between font-medium">
                  <span>Net Captured</span>
                  <span>{formatSar(fin.payments.totalCapturedHalalas - fin.payments.totalRefundedHalalas)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">Owner Payouts</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Payouts</span>
                  <span>{fin.payouts.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid</span>
                  <span className="text-green-600">{formatSar(fin.payouts.paidHalalas)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending</span>
                  <span className="text-amber-600">{formatSar(fin.payouts.pendingHalalas)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-medium">
                  <span>Commission Earned</span>
                  <span>{formatSar(fin.payouts.commissionHalalas)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {fin && fin.statusBreakdown.length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3">Rental Status Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {fin.statusBreakdown.map((s) => (
                <div key={s.status} className="flex justify-between border rounded p-2">
                  <span className="capitalize">{s.status.replace(/_/g, " ")}</span>
                  <Badge variant="outline">{s.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asset Report */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Package className="w-5 h-5" /> Asset Utilization
      </h2>
      {assetData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">By Category</h3>
              <div className="space-y-2 text-sm">
                {assetData.byCategory.map((c) => (
                  <div key={c.category} className="flex justify-between">
                    <span className="capitalize">{c.category}</span>
                    <span>{c.total} items ({formatSar(c.totalValueHalalas)})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">Top Performing Assets</h3>
              <div className="space-y-2 text-sm">
                {assetData.topAssets.length === 0 ? (
                  <p className="text-neutral-500">No rental data yet.</p>
                ) : (
                  assetData.topAssets.map((a) => (
                    <div key={a.assetId} className="flex justify-between">
                      <span>Asset #{a.assetId}</span>
                      <span>{a.rentalCount} rentals ({formatSar(a.totalRevenueHalalas)})</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Report */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Users className="w-5 h-5" /> User Analytics
      </h2>
      {userData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">Users by Role</h3>
              <div className="space-y-2 text-sm">
                {userData.byRole.map((r) => (
                  <div key={r.role} className="flex justify-between">
                    <span className="capitalize">{r.role.replace(/_/g, " ")}</span>
                    <span>
                      {r.total} total, {r.nafathVerified} verified
                      {r.blocked > 0 && <Badge variant="destructive" className="ml-2">{r.blocked} blocked</Badge>}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">Renter Risk Distribution</h3>
              <div className="space-y-2 text-sm">
                {userData.renterRisk.map((r) => (
                  <div key={r.riskCategory} className="flex justify-between">
                    <Badge variant={
                      r.riskCategory === "low" ? "default"
                      : r.riskCategory === "medium" ? "secondary"
                      : "destructive"
                    }>{r.riskCategory}</Badge>
                    <span>{r.count} users (avg score: {r.avgTrustScore})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dispute Report */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" /> Dispute Analytics
      </h2>
      {disputeData && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-sm text-neutral-500">
                Average resolution time: <span className="font-semibold text-neutral-900">{disputeData.avgResolutionDays} days</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {disputeData.byCategory.length === 0 ? (
                <p className="text-neutral-500">No disputes recorded.</p>
              ) : (
                disputeData.byCategory.map((c) => (
                  <div key={c.category} className="flex items-center justify-between border rounded p-3">
                    <span className="capitalize font-medium">{c.category}</span>
                    <div className="flex gap-4 text-xs">
                      <span>Total: {c.total}</span>
                      <Badge variant="default">{c.resolved} resolved</Badge>
                      <Badge variant="destructive">{c.open} open</Badge>
                      {c.totalResolutionAmountHalalas > 0 && (
                        <span className="text-amber-600">
                          {formatSar(c.totalResolutionAmountHalalas)} paid
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
