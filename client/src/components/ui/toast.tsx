import React, { createContext, useCallback, useContext, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- types ---------- */
type ToastVariant = "default" | "success" | "error";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;
}

/* ---------- context ---------- */
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 0;

/* ---------- provider ---------- */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (opts: {
      title: string;
      description?: string;
      variant?: ToastVariant;
    }) => {
      const id = nextId++;
      setToasts((prev) => [
        ...prev,
        { id, title: opts.title, description: opts.description, variant: opts.variant ?? "default" },
      ]);
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}

        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            open
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
            className={cn(
              "rounded-lg border px-4 py-3 shadow-lg flex items-start gap-3 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full",
              t.variant === "success" &&
                "border-green-300 bg-green-50 text-green-900",
              t.variant === "error" &&
                "border-red-300 bg-red-50 text-red-900",
              t.variant === "default" &&
                "border-neutral-200 bg-white text-neutral-900",
            )}
          >
            <div className="flex-1 min-w-0">
              <ToastPrimitive.Title className="text-sm font-semibold">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-sm mt-1 text-inherit opacity-80">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              aria-label="Close"
              className="shrink-0 rounded p-1 hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)] outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

/* ---------- hook ---------- */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
