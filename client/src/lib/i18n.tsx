import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

interface I18nContextType {
  lang: Language;
  dir: "ltr" | "rtl";
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
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
    "nav.notifications": "Notifications",
    "common.signIn": "Sign in",
    "common.createAccount": "Create account",
    "common.logout": "Logout",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.submit": "Submit",
    "common.approve": "Approve",
    "common.reject": "Reject",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.noResults": "No results found",
    "common.viewAll": "View all",
    "common.status": "Status",
    "common.actions": "Actions",
    "common.details": "Details",
    "common.back": "Back",
    "common.sar": "SAR",
    "role.renter": "Renter",
    "role.owner": "Asset Owner",
    "role.inspector": "Inspector",
    "role.operations": "Operations",
    "role.admin": "Admin",
    "role.super_admin": "Super Admin",
    "landing.hero": "Luxury rentals, fully managed.",
    "landing.heroSub": "Rent designer bags, watches and couture — evaluated, stored, insured, and delivered by our operations team.",
    "landing.browseBtn": "Browse the collection",
    "landing.submitBtn": "Submit your asset",
    "landing.howTitle": "How it works",
    "landing.trustTitle": "Built for trust",
    "landing.ownersTitle": "Turn your closet into income",
    "browse.title": "Browse Luxury Catalog",
    "browse.searchPlaceholder": "Search by brand, title, or category...",
    "browse.allCategories": "All Categories",
    "browse.priceRange": "Price Range",
    "browse.sortBy": "Sort by",
    "browse.sortNewest": "Newest First",
    "browse.sortPriceLow": "Price: Low to High",
    "browse.sortPriceHigh": "Price: High to Low",
    "browse.sortBrand": "Brand A-Z",
    "browse.perDay": "per day",
    "browse.viewDetails": "View Details",
    "browse.noListings": "No luxury items available right now.",
    "rental.status": "Rental Status",
    "rental.startDate": "Start Date",
    "rental.endDate": "End Date",
    "rental.totalPayable": "Total Payable",
    "rental.legalCommitment": "Legal Commitment",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.loginTitle": "Sign in to MLR",
    "auth.registerTitle": "Create your account",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
  },
  ar: {
    "nav.browse": "تصفح الكتالوج",
    "nav.myRentals": "إيجاراتي",
    "nav.ownerDashboard": "لوحة تحكم المالك",
    "nav.submitAsset": "إضافة أصل",
    "nav.payouts": "المدفوعات",
    "nav.inspectionQueue": "قائمة الفحص",
    "nav.opsDashboard": "لوحة العمليات",
    "nav.shipments": "الشحنات",
    "nav.inventory": "المخزون",
    "nav.alerts": "التنبيهات",
    "nav.adminDashboard": "لوحة الإدارة",
    "nav.assetApprovals": "موافقات الأصول",
    "nav.users": "المستخدمون",
    "nav.disputes": "النزاعات",
    "nav.sanadTracking": "تتبع السندات",
    "nav.financialOverview": "النظرة المالية",
    "nav.notifications": "الإشعارات",
    "common.signIn": "تسجيل الدخول",
    "common.createAccount": "إنشاء حساب",
    "common.logout": "تسجيل الخروج",
    "common.loading": "جاري التحميل...",
    "common.error": "خطأ",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.submit": "إرسال",
    "common.approve": "موافقة",
    "common.reject": "رفض",
    "common.search": "بحث",
    "common.filter": "تصفية",
    "common.noResults": "لا توجد نتائج",
    "common.viewAll": "عرض الكل",
    "common.status": "الحالة",
    "common.actions": "الإجراءات",
    "common.details": "التفاصيل",
    "common.back": "رجوع",
    "common.sar": "ريال",
    "role.renter": "مستأجر",
    "role.owner": "مالك الأصل",
    "role.inspector": "فاحص",
    "role.operations": "العمليات",
    "role.admin": "مدير",
    "role.super_admin": "مدير أعلى",
    "landing.hero": "إيجارات فاخرة، مُدارة بالكامل.",
    "landing.heroSub": "استأجر حقائب وساعات وأزياء المصممين — مُقيّمة ومخزّنة ومؤمّنة ومُوصَلة من فريق العمليات لدينا.",
    "landing.browseBtn": "تصفح المجموعة",
    "landing.submitBtn": "أضف أصلك",
    "landing.howTitle": "كيف يعمل",
    "landing.trustTitle": "مبني على الثقة",
    "landing.ownersTitle": "حوّل خزانتك إلى دخل",
    "browse.title": "تصفح كتالوج الفخامة",
    "browse.searchPlaceholder": "ابحث بالعلامة التجارية أو العنوان أو الفئة...",
    "browse.allCategories": "جميع الفئات",
    "browse.priceRange": "نطاق السعر",
    "browse.sortBy": "ترتيب حسب",
    "browse.sortNewest": "الأحدث أولاً",
    "browse.sortPriceLow": "السعر: من الأقل للأعلى",
    "browse.sortPriceHigh": "السعر: من الأعلى للأقل",
    "browse.sortBrand": "العلامة التجارية أ-ي",
    "browse.perDay": "في اليوم",
    "browse.viewDetails": "عرض التفاصيل",
    "browse.noListings": "لا توجد منتجات فاخرة متاحة حالياً.",
    "rental.status": "حالة الإيجار",
    "rental.startDate": "تاريخ البدء",
    "rental.endDate": "تاريخ الانتهاء",
    "rental.totalPayable": "إجمالي المستحق",
    "rental.legalCommitment": "الالتزام القانوني",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.fullName": "الاسم الكامل",
    "auth.loginTitle": "تسجيل الدخول إلى MLR",
    "auth.registerTitle": "إنشاء حسابك",
    "auth.noAccount": "ليس لديك حساب؟",
    "auth.hasAccount": "لديك حساب بالفعل؟",
  },
};

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  dir: "ltr",
  setLang: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("mlr_lang") as Language;
    return saved === "ar" ? "ar" : "en";
  });

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    localStorage.setItem("mlr_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const t = (key: string): string => {
    return translations[lang][key] ?? translations.en[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, dir, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors"
    >
      {lang === "en" ? "العربية" : "English"}
    </button>
  );
}
