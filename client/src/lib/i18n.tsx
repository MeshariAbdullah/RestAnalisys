import React, { createContext, useContext, useState, useEffect } from "react";

export type Locale = "en" | "ar";

const STORAGE_KEY = "mlr_locale";

const translations: Record<string, Record<Locale, string>> = {
  "nav.browse": { en: "Browse Catalog", ar: "تصفح الكتالوج" },
  "nav.myRentals": { en: "My Rentals", ar: "إيجاراتي" },
  "nav.ownerDashboard": { en: "Owner Dashboard", ar: "لوحة المالك" },
  "nav.submitAsset": { en: "Submit Asset", ar: "تقديم أصل" },
  "nav.payouts": { en: "Payouts", ar: "المدفوعات" },
  "nav.inspectionQueue": { en: "Inspection Queue", ar: "قائمة الفحص" },
  "nav.opsDashboard": { en: "Ops Dashboard", ar: "لوحة العمليات" },
  "nav.shipments": { en: "Shipments", ar: "الشحنات" },
  "nav.inventory": { en: "Inventory", ar: "المخزون" },
  "nav.alerts": { en: "Alerts", ar: "التنبيهات" },
  "nav.adminDashboard": { en: "Admin Dashboard", ar: "لوحة الإدارة" },
  "nav.assetApprovals": { en: "Asset Approvals", ar: "موافقات الأصول" },
  "nav.users": { en: "Users", ar: "المستخدمون" },
  "nav.disputes": { en: "Disputes", ar: "النزاعات" },
  "nav.sanadTracking": { en: "Sanad Tracking", ar: "تتبع السند" },
  "nav.finance": { en: "Financial Overview", ar: "النظرة المالية" },
  "common.login": { en: "Login", ar: "تسجيل الدخول" },
  "common.register": { en: "Register", ar: "تسجيل" },
  "common.logout": { en: "Logout", ar: "تسجيل الخروج" },
  "common.notifications": { en: "Notifications", ar: "الإشعارات" },
  "common.markAllRead": { en: "Mark all read", ar: "تحديد الكل كمقروء" },
  "common.noNotifications": { en: "No notifications yet", ar: "لا توجد إشعارات بعد" },
  "common.search": { en: "Search", ar: "بحث" },
  "common.filter": { en: "Filter", ar: "تصفية" },
  "common.save": { en: "Save", ar: "حفظ" },
  "common.cancel": { en: "Cancel", ar: "إلغاء" },
  "common.confirm": { en: "Confirm", ar: "تأكيد" },
  "common.loading": { en: "Loading...", ar: "جاري التحميل..." },
  "common.error": { en: "An error occurred", ar: "حدث خطأ" },
  "role.renter": { en: "Renter", ar: "مستأجر" },
  "role.owner": { en: "Asset Owner", ar: "مالك الأصل" },
  "role.inspector": { en: "Inspector", ar: "فاحص" },
  "role.operations": { en: "Operations", ar: "العمليات" },
  "role.admin": { en: "Admin", ar: "مدير" },
  "role.super_admin": { en: "Super Admin", ar: "مدير عام" },
  "landing.hero": { en: "Luxury at your doorstep", ar: "الفخامة على عتبة بابك" },
  "landing.subtitle": {
    en: "Rent authenticated luxury handbags, watches & couture — fully insured, legally protected.",
    ar: "استأجر حقائب وساعات وأزياء فاخرة موثقة — مؤمنة بالكامل ومحمية قانونياً.",
  },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  dir: "ltr",
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === "ar" ? "ar" : "en") as Locale;
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string): string => {
    return translations[key]?.[locale] ?? key;
  };

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
