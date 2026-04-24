import React from "react";
import { useLocale, type Locale } from "../lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  const toggle = () => {
    const next: Locale = locale === "en" ? "ar" : "en";
    setLocale(next);
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      title={locale === "en" ? "التبديل للعربية" : "Switch to English"}
    >
      {locale === "en" ? "العربية" : "English"}
    </button>
  );
}
