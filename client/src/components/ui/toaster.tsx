import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES: Record<string, string> = {
  default: "bg-white border-neutral-200 text-neutral-900",
  success: "bg-green-50 border-green-200 text-green-900",
  destructive: "bg-red-50 border-red-200 text-red-900",
};

export function Toaster() {
  const { toasts, setToasts, addListener, dismiss } = useToast();

  useEffect(() => {
    return addListener((t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => dismiss(t.id), 4000);
    });
  }, [addListener, setToasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "border rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200",
            VARIANT_CLASSES[t.variant ?? "default"]
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && (
              <p className="text-xs mt-0.5 opacity-80">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
