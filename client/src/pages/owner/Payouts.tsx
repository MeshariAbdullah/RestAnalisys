import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paymentsApi, formatSar } from "@/lib/api";

export default function Payouts() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-payouts"],
    queryFn: () => paymentsApi.myPayouts(),
  });

  const total = (data ?? []).reduce(
    (sum, p) => sum + Number(p.netHalalas ?? 0),
    0
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Payouts</h1>
      <p className="text-neutral-500 mb-8">
        Funds released to your registered IBAN after rentals close successfully.
      </p>

      <Card className="mb-6 bg-gradient-to-br from-amber-500/10 to-neutral-50">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 text-sm text-neutral-500 mb-2">
            <Wallet className="w-5 h-5 text-amber-500" />
            Lifetime earnings
          </div>
          <p className="text-4xl font-bold">{formatSar(total)}</p>
          <p className="text-sm text-neutral-500 mt-1">
            Across {data?.length ?? 0} payouts
          </p>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-3">History</h2>
      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-500">
            No payouts released yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-neutral-500">
                    Payout #{p.id}
                  </p>
                  <p className="text-sm mt-0.5">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatSar(Number(p.netHalalas))}
                  </p>
                  <Badge
                    className={
                      p.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
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
