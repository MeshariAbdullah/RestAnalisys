import React, { createContext, useContext, useState, useCallback } from "react";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => removeToast(id), toast.duration ?? 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

const variantStyles: Record<string, string> = {
  default: "bg-white border-neutral-200",
  success: "bg-emerald-50 border-emerald-300",
  error: "bg-red-50 border-red-300",
  warning: "bg-amber-50 border-amber-300",
};

const variantDot: Record<string, string> = {
  default: "bg-neutral-400",
  success: "bg-emerald-500",
  error: "bg-red-500",
  warning: "bg-amber-500",
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full rtl:right-auto rtl:left-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border shadow-lg p-4 animate-in slide-in-from-bottom-2 fade-in ${variantStyles[toast.variant ?? "default"]}`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${variantDot[toast.variant ?? "default"]}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-xs text-neutral-600 mt-0.5">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-400 hover:text-neutral-600 text-lg leading-none shrink-0"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
