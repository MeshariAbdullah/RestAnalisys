import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paymentsApi, type Payment } from "@/lib/api";

function formatAmount(halalas: number): string {
  return (halalas / 100).toFixed(2) + " SAR";
}

function paymentStatusVariant(
  status: string
): "success" | "error" | "warning" | "secondary" {
  switch (status) {
    case "captured":
    case "completed":
      return "success";
    case "failed":
    case "refund_failed":
      return "error";
    case "pending":
    case "processing":
      return "warning";
    default:
      return "secondary";
  }
}

export default function PaymentHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["payments-mine"],
    queryFn: () => paymentsApi.mine(),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Payment History</h1>
      <p className="text-neutral-500 mb-8">
        View all your payments and refunds.
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No payments found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-neutral-50">
                    <th className="text-left py-3 px-4 font-medium text-neutral-500">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-500">Rental</th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-neutral-500">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-neutral-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p: Payment) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-neutral-500">
                        {p.rentalId ? `#${p.rentalId}` : "-"}
                      </td>
                      <td className="py-3 px-4 capitalize">
                        {p.type.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={paymentStatusVariant(p.status)}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatAmount(p.amountHalalas)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
