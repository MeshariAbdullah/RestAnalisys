import * as React from "react";

type ToastVariant = "default" | "destructive";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
}

type Action =
  | { type: "ADD"; toast: Toast }
  | { type: "DISMISS"; id: string };

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const TOAST_REMOVE_DELAY = 4000;

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state: ToastState, action: Action): ToastState {
  switch (action.type) {
    case "ADD":
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, 5) };
    case "DISMISS":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
  }
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
  const id = genId();
  dispatch({ type: "ADD", toast: { id, title, description, variant } });
  setTimeout(() => dispatch({ type: "DISMISS", id }), TOAST_REMOVE_DELAY);
  return id;
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return { ...state, toast, dismiss: (id: string) => dispatch({ type: "DISMISS", id }) };
}

export { useToast, toast };
