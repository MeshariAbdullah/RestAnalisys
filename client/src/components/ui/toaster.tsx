import React from "react";
import { CheckCircle, AlertTriangle, X, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const variantStyles: Record<string, string> = {
  default: "bg-white border-neutral-200 text-neutral-900",
  success: "bg-green-50 border-green-200 text-green-900",
  destructive: "bg-red-50 border-red-200 text-red-900",
};

const variantIcons: Record<string, typeof Info> = {
  default: Info,
  success: CheckCircle,
  destructive: AlertTriangle,
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const variant = t.variant ?? "default";
        const Icon = variantIcons[variant] ?? Info;
        return (
          <div
            key={t.id}
            className={cn(
              "border rounded-lg shadow-lg p-4 flex gap-3 items-start animate-in slide-in-from-right-5 fade-in-0 duration-200",
              variantStyles[variant]
            )}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {t.title && <p className="font-semibold text-sm">{t.title}</p>}
              {t.description && (
                <p className="text-sm opacity-80 mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-0.5 rounded hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
