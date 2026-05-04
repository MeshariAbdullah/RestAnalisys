import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paymentsApi, formatSar } from "@/lib/api";

function statusBadge(status: string) {
  if (status === "paid" || status === "released")
    return "bg-green-100 text-green-700";
  if (status === "processing") return "bg-blue-100 text-blue-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-800";
}

export default function Payouts() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-payouts"],
    queryFn: () => paymentsApi.myPayouts(),
  });

  const stats = useMemo(() => {
    if (!data) return { total: 0, paid: 0, pending: 0, count: 0 };
    const total = data.reduce((sum, p) => sum + Number(p.netHalalas ?? 0), 0);
    const paid = data
      .filter((p) => p.status === "paid" || p.status === "released")
      .reduce((sum, p) => sum + Number(p.netHalalas ?? 0), 0);
    const pending = total - paid;
    return { total, paid, pending, count: data.length };
  }, [data]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Payouts</h1>
      <p className="text-neutral-500 mb-8">
        Funds released to your registered IBAN after rentals close successfully.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-500/10 to-neutral-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Wallet className="w-4 h-4 text-amber-500" />
              Total earnings
            </div>
            <p className="text-3xl font-bold">{formatSar(stats.total)}</p>
            <p className="text-sm text-neutral-500 mt-1">
              {stats.count} payouts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Paid out
            </div>
            <p className="text-3xl font-bold text-green-600">
              {formatSar(stats.paid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pending
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {formatSar(stats.pending)}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">History</h2>
      {isLoading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-500">
            No payouts released yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="text-left p-4 font-medium">Payout</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-neutral-50">
                    <td className="p-4 font-mono text-xs">#{p.id}</td>
                    <td className="p-4 text-neutral-600">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-bold">
                      {formatSar(Number(p.netHalalas))}
                    </td>
                    <td className="p-4">
                      <Badge className={`border-0 ${statusBadge(p.status)}`}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
