import React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { useToast } from "./use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open
          onOpenChange={(open) => { if (!open) dismiss(t.id); }}
          className={cn(
            "group pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
            t.variant === "destructive"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-neutral-200 bg-white text-neutral-900"
          )}
        >
          <div className="flex-1">
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.description && (
              <p className="text-sm opacity-90">{t.description}</p>
            )}
          </div>
          <ToastPrimitive.Close
            className="rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 focus:opacity-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2" />
    </ToastPrimitive.Provider>
  );
}
