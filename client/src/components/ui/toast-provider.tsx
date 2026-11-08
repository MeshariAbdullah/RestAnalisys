import React, { useEffect } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast, type Toast } from "@/lib/useToast";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, setToasts, addListener, dismiss } = useToast();

  useEffect(() => {
    return addListener((t: Toast) => {
      setToasts((prev) => [...prev, t]);
    });
  }, [addListener, setToasts]);

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
      {children}
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          className={cn(
            "bg-white border rounded-lg shadow-lg p-4 flex items-start gap-3 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full",
            t.variant === "error" && "border-red-300 bg-red-50",
            t.variant === "success" && "border-green-300 bg-green-50"
          )}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
        >
          <div className="flex-1 min-w-0">
            <ToastPrimitive.Title className="text-sm font-semibold">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="text-sm text-neutral-600 mt-1">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="p-1 rounded hover:bg-neutral-100">
            <X className="w-4 h-4 text-neutral-400" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed top-4 right-4 flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)] z-50" />
    </ToastPrimitive.Provider>
  );
}
