import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
}

let listeners: Array<(t: Toast) => void> = [];
let counter = 0;

export function toast(t: Omit<Toast, "id">) {
  const id = String(++counter);
  const full: Toast = { id, ...t };
  listeners.forEach((fn) => fn(full));
  return id;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addListener = useCallback((fn: (t: Toast) => void) => {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, setToasts, addListener, dismiss };
}
