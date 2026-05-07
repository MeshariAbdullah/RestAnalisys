import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-sm text-neutral-600"
      title={locale === "en" ? "التبديل إلى العربية" : "Switch to English"}
    >
      <Languages className="w-4 h-4" />
      <span className="font-medium">{locale === "en" ? "عربي" : "EN"}</span>
    </button>
  );
}
