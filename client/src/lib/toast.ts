import { useEffect, useState } from "react";

export type ToastVariant = "default" | "destructive" | "success";

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 5_000;

type Listener = (toasts: ToastData[]) => void;

let toasts: ToastData[] = [];
const listeners: Listener[] = [];
const timers = new Map<string, ReturnType<typeof setTimeout>>();

let idCounter = 0;

function notify() {
  for (const listener of listeners) {
    listener([...toasts]);
  }
}

function dismiss(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

function toast({
  title,
  description,
  variant = "default",
}: {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}) {
  const id = String(++idCounter);

  const newToast: ToastData = { id, title, description, variant };

  toasts = [newToast, ...toasts].slice(0, MAX_TOASTS);
  notify();

  const timer = setTimeout(() => {
    dismiss(id);
  }, AUTO_DISMISS_MS);
  timers.set(id, timer);

  return id;
}

function useToast() {
  const [current, setCurrent] = useState<ToastData[]>([...toasts]);

  useEffect(() => {
    listeners.push(setCurrent);
    return () => {
      const idx = listeners.indexOf(setCurrent);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  return { toasts: current, dismiss };
}

export { toast, useToast, dismiss };
