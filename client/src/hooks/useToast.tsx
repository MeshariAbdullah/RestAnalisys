import * as React from "react";

type ToastVariant = "default" | "destructive" | "success";

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
}

type ToastAction =
  | { type: "ADD"; toast: ToastItem }
  | { type: "DISMISS"; id: string };

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD":
      return { toasts: [action.toast, ...state.toasts].slice(0, 5) };
    case "DISMISS":
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

const ToastContext = React.createContext<{
  toasts: ToastItem[];
  toast: (opts: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
} | null>(null);

export function ToastContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, { toasts: [] });

  const toast = React.useCallback((opts: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    dispatch({ type: "ADD", toast: { id, ...opts } });
    setTimeout(() => dispatch({ type: "DISMISS", id }), 5000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    dispatch({ type: "DISMISS", id });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts: state.toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastContextProvider");
  return ctx;
}
