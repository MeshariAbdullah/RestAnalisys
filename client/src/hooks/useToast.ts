import { useState, useCallback, useEffect, useRef } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

type ToastInput = Omit<Toast, "id">;

let globalToasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener([...globalToasts]);
  }
}

function addToast(input: ToastInput): string {
  const id = Math.random().toString(36).substring(2, 9);
  const toast: Toast = { id, ...input };
  globalToasts = [...globalToasts, toast];
  emitChange();
  return id;
}

function removeToast(id: string) {
  globalToasts = globalToasts.filter((t) => t.id !== id);
  emitChange();
}

export function toast(input: ToastInput): string {
  return addToast(input);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(globalToasts);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  // Set up auto-dismiss timers for new toasts
  useEffect(() => {
    const timers = timersRef.current;
    for (const t of toasts) {
      if (!timers.has(t.id)) {
        const timer = setTimeout(() => {
          removeToast(t.id);
          timers.delete(t.id);
        }, 4000);
        timers.set(t.id, timer);
      }
    }

    // Clean up timers for toasts that no longer exist
    const currentIds = new Set(toasts.map((t) => t.id));
    for (const [id, timer] of timers.entries()) {
      if (!currentIds.has(id)) {
        clearTimeout(timer);
        timers.delete(id);
      }
    }
  }, [toasts]);

  // Clear all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);

  return { toasts, toast: addToast, dismiss };
}
