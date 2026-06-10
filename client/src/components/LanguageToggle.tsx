import React from "react";
import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";

export default function LanguageToggle({ compact }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-neutral-800 text-neutral-300 hover:text-white"
      title={locale === "ar" ? "Switch to English" : "التبديل للعربية"}
    >
      <Languages className="w-4 h-4" />
      {!compact && (
        <span>{locale === "ar" ? "EN" : "عربي"}</span>
      )}
    </button>
  );
}
