import React from "react";
import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
      title={locale === "en" ? "التبديل إلى العربية" : "Switch to English"}
    >
      <Languages className="w-4 h-4" />
      <span>{locale === "en" ? "عربي" : "EN"}</span>
    </button>
  );
}
