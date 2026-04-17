import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { rentalsApi, paymentsApi, formatSar, type Rental } from "@/lib/api";
import {
  CreditCard,
  CheckCircle,
  Shield,
  Lock,
  Loader2,
  AlertTriangle,
  FileText,
  Receipt,
} from "lucide-react";

export default function Payment({ rentalId }: { rentalId: number }) {
  const [, navigate] = useLocation();
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<{ invoiceNumber: string } | null>(null);

  useEffect(() => {
    rentalsApi
      .get(rentalId)
      .then((data) => {
        setRental(data.rental);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [rentalId]);

  async function handlePay() {
    setProcessing(true);
    setError(null);
    try {
      const result = await paymentsApi.charge(rentalId);
      setInvoice(result.invoice);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? "Payment failed");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="bg-white rounded-xl border p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold">Payment Successful!</h2>
          <p className="text-neutral-500 text-sm">
            Your rental has been confirmed. The asset will be prepared for delivery.
          </p>
          {invoice && (
            <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
              <Receipt className="w-4 h-4" />
              Invoice: {invoice.invoiceNumber}
            </div>
          )}
          <div className="pt-4 space-y-2">
            <button
              onClick={() => navigate("/my-rentals")}
              className="w-full px-6 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
            >
              View My Rentals
            </button>
            <button
              onClick={() => navigate("/browse")}
              className="w-full px-6 py-2.5 border rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <p className="text-red-700 text-sm">{error ?? "Rental not found"}</p>
        </div>
      </div>
    );
  }

  if (rental.status !== "pending_payment") {
    return (
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <p className="text-amber-700 text-sm">
            This rental is not awaiting payment (status: {rental.status}).
          </p>
        </div>
        <button
          onClick={() => navigate("/my-rentals")}
          className="mt-4 px-6 py-2.5 border rounded-lg hover:bg-neutral-50 transition-colors text-sm"
        >
          Back to My Rentals
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 mt-8 space-y-6">
      <h1 className="text-2xl font-bold">Complete Payment</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold">Order Summary</h2>
        </div>
        <div className="text-sm text-neutral-600">
          <p className="font-medium text-neutral-900">Rental {rental.reference}</p>
          <p>
            {rental.durationDays} days &middot; {formatSar(rental.dailyPriceHalalas)}/day
          </p>
        </div>
        <div className="border-t pt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Subtotal</span>
            <span>{formatSar(rental.rentalSubtotalHalalas)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Platform Fee</span>
            <span>{formatSar(rental.platformFeeHalalas)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">VAT (15%)</span>
            <span>{formatSar(rental.vatHalalas)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t font-semibold text-base">
            <span>Total</span>
            <span className="text-amber-600">{formatSar(rental.totalPayableHalalas)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold">Payment Method</h2>
        </div>
        <div className="bg-neutral-50 rounded-lg p-4 border border-dashed border-neutral-300">
          <p className="text-sm text-neutral-500 text-center">
            Secure payment via HyperPay gateway
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-neutral-400">
            <Lock className="w-3 h-3" />
            256-bit SSL encrypted
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400 justify-center">
        <Shield className="w-3.5 h-3.5" />
        <span>ZATCA compliant e-invoicing &middot; 15% VAT included</span>
      </div>

      <button
        onClick={handlePay}
        disabled={processing}
        className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay {formatSar(rental.totalPayableHalalas)}
          </>
        )}
      </button>
    </div>
  );
}
