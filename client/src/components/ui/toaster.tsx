import React from "react";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

function variantClasses(variant?: string): string {
  if (variant === "destructive")
    return "bg-red-600 text-white border-red-700";
  if (variant === "success")
    return "bg-green-600 text-white border-green-700";
  return "bg-white text-neutral-900 border-neutral-200";
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg border px-4 py-3 shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-2 ${variantClasses(
            t.variant
          )}`}
        >
          <div className="flex-1 min-w-0">
            {t.title && <p className="font-semibold text-sm">{t.title}</p>}
            {t.description && (
              <p className="text-sm opacity-90 mt-0.5">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
