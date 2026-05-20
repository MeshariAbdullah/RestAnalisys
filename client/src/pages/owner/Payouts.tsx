import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paymentsApi, formatSar } from "@/lib/api";

function payoutStatusBadge(status: string) {
  switch (status) {
    case "released":
    case "paid":
      return "bg-green-100 text-green-700 border-0";
    case "pending":
    case "processing":
      return "bg-amber-100 text-amber-800 border-0";
    case "failed":
    case "rejected":
      return "bg-red-100 text-red-700 border-0";
    default:
      return "bg-neutral-100 text-neutral-600 border-0";
  }
}

export default function Payouts() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-payouts"],
    queryFn: () => paymentsApi.myPayouts(),
  });

  const total = (data ?? []).reduce(
    (sum, p) => sum + Number(p.netHalalas ?? 0),
    0
  );

  const statusBreakdown = useMemo(() => {
    const paid = (data ?? [])
      .filter((p) => p.status === "released" || p.status === "paid")
      .reduce((s, p) => s + Number(p.netHalalas ?? 0), 0);
    const pending = (data ?? [])
      .filter((p) => p.status === "pending" || p.status === "processing")
      .reduce((s, p) => s + Number(p.netHalalas ?? 0), 0);
    const failed = (data ?? [])
      .filter((p) => p.status === "failed" || p.status === "rejected")
      .reduce((s, p) => s + Number(p.netHalalas ?? 0), 0);
    return { paid, pending, failed };
  }, [data]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Payouts</h1>
      <p className="text-neutral-500 mb-8">
        Funds released to your registered IBAN after rentals close successfully.
      </p>

      {/* Total earned summary */}
      <Card className="mb-6 bg-gradient-to-br from-amber-500/10 to-neutral-50">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 text-sm text-neutral-500 mb-2">
            <Wallet className="w-5 h-5 text-amber-500" />
            Total earned
          </div>
          <p className="text-4xl font-bold">{formatSar(total)}</p>
          <p className="text-sm text-neutral-500 mt-1">
            Across {data?.length ?? 0} payouts
          </p>

          {(data?.length ?? 0) > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-neutral-200/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-neutral-500">Paid</p>
                  <p className="font-semibold text-sm">
                    {formatSar(statusBreakdown.paid)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-xs text-neutral-500">Pending</p>
                  <p className="font-semibold text-sm">
                    {formatSar(statusBreakdown.pending)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <div>
                  <p className="text-xs text-neutral-500">Failed</p>
                  <p className="font-semibold text-sm">
                    {formatSar(statusBreakdown.failed)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-3">History</h2>
      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p className="text-neutral-500 font-medium">No payouts yet</p>
            <p className="text-sm text-neutral-400 mt-1">
              Payouts will appear here once your listed assets complete rental
              periods.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      p.status === "released" || p.status === "paid"
                        ? "bg-green-100"
                        : p.status === "failed" || p.status === "rejected"
                          ? "bg-red-100"
                          : "bg-amber-100"
                    }`}
                  >
                    <CircleDollarSign
                      className={`w-4 h-4 ${
                        p.status === "released" || p.status === "paid"
                          ? "text-green-600"
                          : p.status === "failed" || p.status === "rejected"
                            ? "text-red-600"
                            : "text-amber-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-neutral-500">
                      Payout #{p.id}
                    </p>
                    <p className="text-sm mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatSar(Number(p.netHalalas))}
                  </p>
                  <Badge className={payoutStatusBadge(p.status)}>
                    {p.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
