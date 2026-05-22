import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className={className}
    >
      <Globe className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5" />
      {lang === "ar" ? "EN" : "عربي"}
    </Button>
  );
}
