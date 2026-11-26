import React, { useEffect } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const variantStyles = {
  default:
    "border-border bg-background text-foreground",
  success:
    "border-green-200 bg-green-50 text-green-900",
  destructive:
    "border-destructive/50 bg-destructive/10 text-destructive",
};

export function Toaster() {
  const { toasts, dismiss, subscribe } = useToast();

  useEffect(() => subscribe(), [subscribe]);

  return (
    <ToastPrimitive.Provider duration={4000}>
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          className={cn(
            "group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-md border p-4 shadow-lg transition-all",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
            variantStyles[t.variant ?? "default"]
          )}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
        >
          <div className="flex flex-col gap-1">
            <ToastPrimitive.Title className="text-sm font-semibold">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="text-sm opacity-90">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:opacity-70">
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2" />
    </ToastPrimitive.Provider>
  );
}
