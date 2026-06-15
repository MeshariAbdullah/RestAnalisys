import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { exportApi, formatSar } from "@/lib/api";
import { Download, FileSpreadsheet, TrendingUp, Calendar } from "lucide-react";

export default function ExportReports() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["financial-summary", from, to],
    queryFn: () => exportApi.financialSummary(from, to),
  });

  async function downloadCsv(type: "rentals" | "payments" | "payouts") {
    const token = localStorage.getItem("auth_token");
    const apiBase = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api`
      : "/api";
    const qs = new URLSearchParams({ format: "csv" });
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);

    const res = await fetch(`${apiBase}/export/${type}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Export failed");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rev = summary?.revenue as Record<string, number> | undefined;
  const pay = summary?.payouts as Record<string, number> | undefined;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Reports & Export</h1>
        </div>

        {/* Date range picker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" />
              Report Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div>
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        {isLoading ? (
          <p className="text-neutral-500">Loading...</p>
        ) : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4" />
                  Revenue Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Total Rentals</span>
                  <Badge>{String(rev?.total_rentals ?? 0)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Rental Revenue</span>
                  <span className="font-medium">{formatSar(Number(rev?.total_rental_revenue ?? 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Platform Fees</span>
                  <span className="font-medium">{formatSar(Number(rev?.total_platform_fees ?? 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">VAT Collected</span>
                  <span className="font-medium">{formatSar(Number(rev?.total_vat ?? 0))}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Total Collected</span>
                  <span className="font-bold text-green-700">{formatSar(Number(rev?.total_collected ?? 0))}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Badge variant="outline">Clean: {String(rev?.closed_clean ?? 0)}</Badge>
                  <Badge variant="outline">Penalty: {String(rev?.closed_penalty ?? 0)}</Badge>
                  <Badge variant="outline">Cancelled: {String(rev?.cancelled ?? 0)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payouts Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Total Payouts</span>
                  <Badge>{String(pay?.total_payouts ?? 0)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Gross Amount</span>
                  <span className="font-medium">{formatSar(Number(pay?.total_gross ?? 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Commission Earned</span>
                  <span className="font-medium text-amber-700">{formatSar(Number(pay?.total_commission ?? 0))}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Net Paid to Owners</span>
                  <span className="font-bold">{formatSar(Number(pay?.total_net_paid ?? 0))}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Export Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="w-4 h-4" />
              Export Data (CSV)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => downloadCsv("rentals")}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Rentals
            </Button>
            <Button variant="outline" onClick={() => downloadCsv("payments")}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Payments
            </Button>
            <Button variant="outline" onClick={() => downloadCsv("payouts")}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Payouts
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
