import React from "react";
import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
      {message && <p className="text-sm text-neutral-500">{message}</p>}
    </div>
  );
}
