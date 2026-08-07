import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, ArrowLeft, Receipt, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paymentsApi, formatSar, type Payment } from "@/lib/api";
import { formatDate, humanizeStatus } from "@/lib/utils";

function paymentStatusColor(status: string) {
  switch (status) {
    case "captured": return "bg-green-100 text-green-800";
    case "pending": return "bg-amber-100 text-amber-800";
    case "refunded": return "bg-blue-100 text-blue-800";
    case "failed": return "bg-red-100 text-red-800";
    default: return "bg-neutral-200 text-neutral-700";
  }
}

function paymentTypeLabel(type: string) {
  switch (type) {
    case "rental_charge": return "Rental charge";
    case "penalty": return "Penalty";
    case "refund": return "Refund";
    default: return humanizeStatus(type);
  }
}

export default function MyPayments() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["my-payments"],
    queryFn: () => paymentsApi.mine(),
  });

  const total = payments?.reduce(
    (sum, p) => sum + (p.status === "captured" ? p.amountHalalas : 0),
    0
  ) ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Payments</h1>
      <p className="text-neutral-500 mb-6">
        Payment history and invoices for your rentals.
      </p>

      <Card className="mb-6">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Total paid</p>
            <p className="text-xl font-bold">{formatSar(total)}</p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-neutral-500">Loading payments…</p>
      ) : !payments || payments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-neutral-500">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p>No payments yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p: Payment) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Receipt className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{paymentTypeLabel(p.type)}</p>
                      {p.invoiceNumber && (
                        <p className="text-xs text-neutral-400 font-mono">
                          Invoice: {p.invoiceNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatSar(p.amountHalalas)}</p>
                    <Badge className={paymentStatusColor(p.status)}>
                      {humanizeStatus(p.status)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-neutral-500 mt-2">
                  <span>Gateway: {p.gateway}</span>
                  {p.gatewayTransactionId && (
                    <span className="font-mono">Ref: {p.gatewayTransactionId}</span>
                  )}
                  {p.capturedAt && <span>Captured: {formatDate(p.capturedAt)}</span>}
                  <span className="ml-auto">{formatDate(p.createdAt)}</span>
                </div>

                {p.invoiceQrBase64 && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs text-neutral-500">ZATCA e-invoice QR available</span>
                    <img
                      src={`data:image/png;base64,${p.invoiceQrBase64}`}
                      alt="ZATCA QR"
                      className="w-16 h-16 ml-auto border rounded"
                    />
                  </div>
                )}

                {p.rentalId && (
                  <div className="mt-2">
                    <Link href={`/my-rentals/${p.rentalId}`}>
                      <a className="text-xs text-amber-600 hover:underline">
                        View rental →
                      </a>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
