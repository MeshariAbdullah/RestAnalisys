import { useToast } from "../hooks/useToast";
import { X } from "lucide-react";

const variantStyles: Record<string, string> = {
  default:
    "bg-neutral-900 border-neutral-700 text-white",
  destructive:
    "bg-red-950 border-red-800 text-red-100",
  success:
    "bg-emerald-950 border-emerald-800 text-emerald-100",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  const visible = toasts.slice(-3);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 w-80">
      {visible.map((t) => (
        <div
          key={t.id}
          className={`
            ${variantStyles[t.variant || "default"]}
            border rounded-lg shadow-lg p-4 pr-10
            animate-in slide-in-from-right-full duration-300
            relative
          `}
        >
          <button
            onClick={() => dismiss(t.id)}
            className="absolute top-3 right-3 p-0.5 rounded hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="font-bold text-sm">{t.title}</p>
          {t.description && (
            <p className="text-sm mt-1 opacity-80">{t.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
