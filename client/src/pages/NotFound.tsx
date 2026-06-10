import React from "react";
import { Link } from "wouter";
import { Diamond, Home, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { locale, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const text = locale === "ar" ? {
    title: "الصفحة غير موجودة",
    desc: "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    home: "الصفحة الرئيسية",
    browse: "تصفح المجموعة",
  } : {
    title: "Page not found",
    desc: "Sorry, the page you're looking for doesn't exist or has been moved.",
    home: "Go home",
    browse: "Browse collection",
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4" dir={dir}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Diamond className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-6xl font-bold text-amber-400 mb-4">404</h1>
        <h2 className="text-xl font-semibold mb-2">{text.title}</h2>
        <p className="text-neutral-400 mb-8">{text.desc}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
              <Home className="w-4 h-4 me-2" />
              {text.home}
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" className="border-neutral-800 bg-transparent text-white hover:bg-neutral-900">
              {text.browse}
              <Arrow className="w-4 h-4 ms-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
