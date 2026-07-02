import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  FileSignature,
  CreditCard,
  Package,
  Shield,
  UserCheck,
  ClipboardCheck,
  Truck,
  AlertTriangle,
  Gavel,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api";

const ACTION_META: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  "auth.register": { icon: UserCheck, label: "Account created", color: "text-blue-500" },
  "auth.nafath.verified": { icon: Shield, label: "Identity verified via Nafath", color: "text-green-500" },
  "rental.create": { icon: FileSignature, label: "Rental created", color: "text-blue-500" },
  "rental.cancel": { icon: AlertTriangle, label: "Rental cancelled", color: "text-neutral-500" },
  "rental.fulfill": { icon: Truck, label: "Rental in fulfillment", color: "text-blue-500" },
  "rental.delivered": { icon: Package, label: "Item delivered", color: "text-green-500" },
  "rental.returned": { icon: Package, label: "Item returned", color: "text-amber-500" },
  "rental.close_clean": { icon: Package, label: "Rental closed (clean)", color: "text-green-600" },
  "rental.close_penalty": { icon: AlertTriangle, label: "Rental closed with penalty", color: "text-orange-500" },
  "rental.close_enforcement": { icon: Gavel, label: "Rental sent to enforcement", color: "text-red-500" },
  "asset.submit": { icon: ClipboardCheck, label: "Asset submitted", color: "text-blue-500" },
  "asset.approve": { icon: ClipboardCheck, label: "Asset approved", color: "text-green-500" },
  "asset.reject": { icon: AlertTriangle, label: "Asset rejected", color: "text-red-500" },
  "asset.publish": { icon: Package, label: "Asset published", color: "text-green-500" },
  "payment.charge": { icon: CreditCard, label: "Payment captured", color: "text-green-500" },
  "payment.refund": { icon: CreditCard, label: "Payment refunded", color: "text-amber-500" },
  "legal.sign": { icon: FileSignature, label: "Contract signed", color: "text-green-500" },
  "inspection.intake": { icon: ClipboardCheck, label: "Intake inspection completed", color: "text-blue-500" },
  "inspection.return": { icon: ClipboardCheck, label: "Return inspection completed", color: "text-amber-500" },
  "user.block": { icon: AlertTriangle, label: "User blocked", color: "text-red-500" },
  "user.unblock": { icon: UserCheck, label: "User unblocked", color: "text-green-500" },
  "dispute.open": { icon: Gavel, label: "Dispute opened", color: "text-amber-500" },
  "dispute.resolve": { icon: Gavel, label: "Dispute resolved", color: "text-green-500" },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { icon: Bell, label: action.replace(/\./g, " "), color: "text-neutral-500" };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Notifications() {
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => authApi.notifications(),
    refetchInterval: 30000,
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Notifications</h1>
      <p className="text-neutral-500 mb-8">Recent activity on your account</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-neutral-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No activity yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((event) => {
            const meta = getActionMeta(event.action);
            const Icon = meta.icon;
            return (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-white hover:bg-neutral-50 transition-colors"
              >
                <div className={`mt-0.5 ${meta.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      {event.entityType}
                      {event.entityId ? ` #${event.entityId}` : ""}
                    </Badge>
                    {event.actorRole && (
                      <span className="text-[11px] text-neutral-400 capitalize">
                        by {event.actorRole.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                  {timeAgo(event.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
