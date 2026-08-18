import React, { createContext, useCallback, useContext, useState } from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastVariant,
} from "./toast";

interface ToastItem {
  id: number;
  title?: string;
  description: string;
  variant?: ToastVariant;
}

interface ToasterContextValue {
  toast: (opts: Omit<ToastItem, "id">) => void;
}

const ToasterContext = createContext<ToasterContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToasterContext);
}

let nextId = 0;

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((opts: Omit<ToastItem, "id">) => {
    setToasts((prev) => [...prev, { ...opts, id: ++nextId }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToasterContext.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
          >
            <div className="grid gap-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              <ToastDescription>{t.description}</ToastDescription>
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToasterContext.Provider>
  );
}
