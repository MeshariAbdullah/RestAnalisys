import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Locale = "en" | "ar";

interface I18nContextType {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "nav.browse": "Browse Catalog",
    "nav.myRentals": "My Rentals",
    "nav.ownerDashboard": "Owner Dashboard",
    "nav.submitAsset": "Submit Asset",
    "nav.payouts": "Payouts",
    "nav.inspectionQueue": "Inspection Queue",
    "nav.opsDashboard": "Ops Dashboard",
    "nav.shipments": "Shipments",
    "nav.inventory": "Inventory",
    "nav.alerts": "Alerts",
    "nav.adminDashboard": "Admin Dashboard",
    "nav.assetApprovals": "Asset Approvals",
    "nav.users": "Users",
    "nav.disputes": "Disputes",
    "nav.sanadTracking": "Sanad Tracking",
    "nav.financialOverview": "Financial Overview",
    "common.login": "Login",
    "common.register": "Register",
    "common.logout": "Logout",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.submit": "Submit",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.view": "View",
    "common.loading": "Loading...",
    "common.noData": "No data available",
    "common.back": "Back",
    "common.next": "Next",
    "common.close": "Close",
    "role.renter": "Renter",
    "role.owner": "Asset Owner",
    "role.inspector": "Inspector",
    "role.operations": "Operations",
    "role.admin": "Admin",
    "role.super_admin": "Super Admin",
    "landing.title": "Managed Luxury Rental Platform",
    "landing.subtitle": "Rent authenticated luxury items with full legal protection",
    "landing.cta": "Get Started",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.loginTitle": "Welcome Back",
    "auth.registerTitle": "Create Account",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
    "rental.status": "Status",
    "rental.startDate": "Start Date",
    "rental.endDate": "End Date",
    "rental.totalPayable": "Total Payable",
    "rental.dailyPrice": "Daily Price",
    "rental.duration": "Duration",
    "rental.days": "days",
    "asset.category": "Category",
    "asset.brand": "Brand",
    "asset.model": "Model",
    "asset.value": "Value",
    "asset.status": "Status",
    "currency.sar": "SAR",
  },
  ar: {
    "nav.browse": "تصفح الكتالوج",
    "nav.myRentals": "إيجاراتي",
    "nav.ownerDashboard": "لوحة المالك",
    "nav.submitAsset": "إضافة أصل",
    "nav.payouts": "المدفوعات",
    "nav.inspectionQueue": "طابور الفحص",
    "nav.opsDashboard": "لوحة العمليات",
    "nav.shipments": "الشحنات",
    "nav.inventory": "المخزون",
    "nav.alerts": "التنبيهات",
    "nav.adminDashboard": "لوحة الإدارة",
    "nav.assetApprovals": "موافقات الأصول",
    "nav.users": "المستخدمون",
    "nav.disputes": "النزاعات",
    "nav.sanadTracking": "تتبع السند",
    "nav.financialOverview": "النظرة المالية",
    "common.login": "تسجيل الدخول",
    "common.register": "إنشاء حساب",
    "common.logout": "تسجيل الخروج",
    "common.search": "بحث",
    "common.filter": "تصفية",
    "common.submit": "إرسال",
    "common.cancel": "إلغاء",
    "common.confirm": "تأكيد",
    "common.save": "حفظ",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.view": "عرض",
    "common.loading": "جاري التحميل...",
    "common.noData": "لا توجد بيانات",
    "common.back": "رجوع",
    "common.next": "التالي",
    "common.close": "إغلاق",
    "role.renter": "مستأجر",
    "role.owner": "مالك الأصول",
    "role.inspector": "مفتش",
    "role.operations": "العمليات",
    "role.admin": "مدير",
    "role.super_admin": "مدير أعلى",
    "landing.title": "منصة إيجار الفخامة المُدارة",
    "landing.subtitle": "استأجر قطعاً فاخرة موثّقة بحماية قانونية كاملة",
    "landing.cta": "ابدأ الآن",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.fullName": "الاسم الكامل",
    "auth.loginTitle": "مرحباً بعودتك",
    "auth.registerTitle": "إنشاء حساب جديد",
    "auth.noAccount": "ليس لديك حساب؟",
    "auth.hasAccount": "لديك حساب بالفعل؟",
    "rental.status": "الحالة",
    "rental.startDate": "تاريخ البدء",
    "rental.endDate": "تاريخ الانتهاء",
    "rental.totalPayable": "إجمالي المستحق",
    "rental.dailyPrice": "السعر اليومي",
    "rental.duration": "المدة",
    "rental.days": "أيام",
    "asset.category": "الفئة",
    "asset.brand": "الماركة",
    "asset.model": "الموديل",
    "asset.value": "القيمة",
    "asset.status": "الحالة",
    "currency.sar": "ر.س",
  },
};

const I18nContext = createContext<I18nContextType | null>(null);

const LOCALE_KEY = "mlr_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(LOCALE_KEY);
    return (saved === "ar" || saved === "en") ? saved : "en";
  });

  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale, dir]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => translations[locale][key] ?? key,
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, dir, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
