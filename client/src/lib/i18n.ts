import { useState, useCallback } from "react";

export type Locale = "en" | "ar";

const LOCALE_KEY = "mlr_locale";

export function getSavedLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved === "ar" || saved === "en") return saved;
  return "en";
}

export function saveLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale);
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
}

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.browse": "Browse Collection",
    "nav.myRentals": "My Rentals",
    "nav.dashboard": "Dashboard",
    "nav.submitAsset": "Submit Asset",
    "nav.myAssets": "My Assets",
    "nav.payouts": "Payouts",
    "nav.inspections": "Inspections",
    "nav.shipments": "Shipments",
    "nav.inventory": "Inventory",
    "nav.alerts": "Alerts",
    "nav.approvals": "Approvals",
    "nav.users": "Users",
    "nav.disputes": "Disputes",
    "nav.finance": "Finance",
    "nav.sanad": "Sanad Tracking",
    "nav.login": "Login",
    "nav.register": "Register",
    "nav.logout": "Logout",

    // Landing
    "landing.hero.title": "Luxury, Managed & Guaranteed",
    "landing.hero.subtitle": "Rent authentic luxury items — handbags, watches, couture — with full legal protection backed by Saudi law",
    "landing.hero.cta": "Browse Collection",
    "landing.hero.ownerCta": "List Your Items",
    "landing.howItWorks": "How It Works",
    "landing.step1.title": "Browse & Select",
    "landing.step1.desc": "Browse our curated collection of authenticated luxury items",
    "landing.step2.title": "Sign & Pay",
    "landing.step2.desc": "Sign your legal commitment and complete payment securely",
    "landing.step3.title": "Enjoy & Return",
    "landing.step3.desc": "Receive your item, enjoy it, and return it on time",
    "landing.trust.title": "Your Trust, Our Priority",
    "landing.trust.auth": "Authenticated Items",
    "landing.trust.insured": "Fully Insured",
    "landing.trust.legal": "Legal Protection",
    "landing.trust.nafath": "Nafath Verified",

    // Auth
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.phone": "Phone Number",
    "auth.login": "Sign In",
    "auth.register": "Create Account",
    "auth.loginTitle": "Welcome Back",
    "auth.registerTitle": "Join MLR Platform",
    "auth.role": "I want to",
    "auth.roleRenter": "Rent luxury items",
    "auth.roleOwner": "List my items for rent",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
    "auth.nafathVerify": "Verify with Nafath",
    "auth.nationalId": "National ID / Iqama",

    // Assets
    "assets.title": "Luxury Collection",
    "assets.search": "Search items...",
    "assets.filter.category": "Category",
    "assets.filter.brand": "Brand",
    "assets.filter.priceRange": "Price Range",
    "assets.filter.sortBy": "Sort By",
    "assets.sort.newest": "Newest",
    "assets.sort.priceAsc": "Price: Low to High",
    "assets.sort.priceDesc": "Price: High to Low",
    "assets.sort.valueAsc": "Value: Low to High",
    "assets.sort.valueDesc": "Value: High to Low",
    "assets.categories.handbag": "Handbag",
    "assets.categories.watch": "Watch",
    "assets.categories.dress": "Dress",
    "assets.categories.jewelry": "Jewelry",
    "assets.categories.accessory": "Accessory",
    "assets.categories.other": "Other",
    "assets.perDay": "/day",
    "assets.evaluatedValue": "Evaluated Value",
    "assets.dailyPrice": "Daily Price",
    "assets.status": "Status",
    "assets.submit": "Submit Asset",
    "assets.noResults": "No items found",
    "assets.loadMore": "Load More",

    // Rentals
    "rental.create": "Rent This Item",
    "rental.startDate": "Start Date",
    "rental.endDate": "End Date",
    "rental.duration": "Duration",
    "rental.days": "days",
    "rental.subtotal": "Subtotal",
    "rental.platformFee": "Platform Fee",
    "rental.vat": "VAT (15%)",
    "rental.total": "Total",
    "rental.commitment": "Legal Commitment",
    "rental.reference": "Reference",
    "rental.status": "Status",
    "rental.statuses.pending_risk_review": "Risk Review",
    "rental.statuses.pending_legal_signing": "Pending Signing",
    "rental.statuses.pending_payment": "Pending Payment",
    "rental.statuses.confirmed": "Confirmed",
    "rental.statuses.out_for_delivery": "Out for Delivery",
    "rental.statuses.active": "Active",
    "rental.statuses.return_in_transit": "Return in Transit",
    "rental.statuses.under_inspection": "Under Inspection",
    "rental.statuses.closed": "Closed",
    "rental.statuses.closed_with_penalty": "Closed (Penalty)",
    "rental.statuses.in_dispute": "In Dispute",
    "rental.statuses.enforcement": "Enforcement",
    "rental.statuses.cancelled": "Cancelled",

    // Legal
    "legal.title": "Legal Commitment",
    "legal.signButton": "Sign Commitment",
    "legal.accept": "I accept all terms and conditions",
    "legal.commitmentAmount": "Commitment Amount",
    "legal.sanadNote": "A Nafith promissory note (Sanad) will be issued",

    // Admin
    "admin.dashboard": "Admin Dashboard",
    "admin.totalUsers": "Total Users",
    "admin.listedAssets": "Listed Assets",
    "admin.activeRentals": "Active Rentals",
    "admin.monthlyRentals": "Monthly Rentals",
    "admin.revenue": "Revenue",
    "admin.openDisputes": "Open Disputes",
    "admin.activeSanads": "Active Sanads",

    // Common
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.retry": "Retry",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.view": "View",
    "common.close": "Close",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.yes": "Yes",
    "common.no": "No",
    "common.sar": "SAR",
    "common.noData": "No data available",
  },

  ar: {
    // Navigation
    "nav.home": "الرئيسية",
    "nav.browse": "تصفح المجموعة",
    "nav.myRentals": "إيجاراتي",
    "nav.dashboard": "لوحة التحكم",
    "nav.submitAsset": "إضافة أصل",
    "nav.myAssets": "أصولي",
    "nav.payouts": "المدفوعات",
    "nav.inspections": "الفحوصات",
    "nav.shipments": "الشحنات",
    "nav.inventory": "المخزون",
    "nav.alerts": "التنبيهات",
    "nav.approvals": "الموافقات",
    "nav.users": "المستخدمين",
    "nav.disputes": "النزاعات",
    "nav.finance": "المالية",
    "nav.sanad": "تتبع السندات",
    "nav.login": "تسجيل الدخول",
    "nav.register": "إنشاء حساب",
    "nav.logout": "تسجيل الخروج",

    // Landing
    "landing.hero.title": "فخامة مُدارة ومضمونة",
    "landing.hero.subtitle": "استأجر أصولاً فاخرة أصلية — حقائب، ساعات، أزياء راقية — بحماية قانونية كاملة مدعومة بالنظام السعودي",
    "landing.hero.cta": "تصفح المجموعة",
    "landing.hero.ownerCta": "أدرج أغراضك",
    "landing.howItWorks": "كيف يعمل",
    "landing.step1.title": "تصفح واختر",
    "landing.step1.desc": "تصفح مجموعتنا المنتقاة من القطع الفاخرة الموثقة",
    "landing.step2.title": "وقّع وادفع",
    "landing.step2.desc": "وقّع التعهد القانوني وأكمل الدفع بأمان",
    "landing.step3.title": "استمتع وأعد",
    "landing.step3.desc": "استلم القطعة، استمتع بها، وأعدها في الموعد",
    "landing.trust.title": "ثقتك أولويتنا",
    "landing.trust.auth": "قطع موثقة",
    "landing.trust.insured": "تأمين شامل",
    "landing.trust.legal": "حماية قانونية",
    "landing.trust.nafath": "توثيق نفاذ",

    // Auth
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.fullName": "الاسم الكامل",
    "auth.phone": "رقم الهاتف",
    "auth.login": "تسجيل الدخول",
    "auth.register": "إنشاء حساب",
    "auth.loginTitle": "مرحباً بعودتك",
    "auth.registerTitle": "انضم لمنصة MLR",
    "auth.role": "أريد أن",
    "auth.roleRenter": "أستأجر أغراضاً فاخرة",
    "auth.roleOwner": "أدرج أغراضي للإيجار",
    "auth.noAccount": "ليس لديك حساب؟",
    "auth.hasAccount": "لديك حساب بالفعل؟",
    "auth.nafathVerify": "التحقق عبر نفاذ",
    "auth.nationalId": "رقم الهوية / الإقامة",

    // Assets
    "assets.title": "المجموعة الفاخرة",
    "assets.search": "ابحث عن قطع...",
    "assets.filter.category": "الفئة",
    "assets.filter.brand": "العلامة التجارية",
    "assets.filter.priceRange": "نطاق السعر",
    "assets.filter.sortBy": "ترتيب حسب",
    "assets.sort.newest": "الأحدث",
    "assets.sort.priceAsc": "السعر: من الأقل للأعلى",
    "assets.sort.priceDesc": "السعر: من الأعلى للأقل",
    "assets.sort.valueAsc": "القيمة: من الأقل للأعلى",
    "assets.sort.valueDesc": "القيمة: من الأعلى للأقل",
    "assets.categories.handbag": "حقيبة يد",
    "assets.categories.watch": "ساعة",
    "assets.categories.dress": "فستان",
    "assets.categories.jewelry": "مجوهرات",
    "assets.categories.accessory": "إكسسوار",
    "assets.categories.other": "أخرى",
    "assets.perDay": "/يوم",
    "assets.evaluatedValue": "القيمة المُقدَّرة",
    "assets.dailyPrice": "السعر اليومي",
    "assets.status": "الحالة",
    "assets.submit": "إضافة أصل",
    "assets.noResults": "لم يتم العثور على نتائج",
    "assets.loadMore": "تحميل المزيد",

    // Rentals
    "rental.create": "استأجر هذا الأصل",
    "rental.startDate": "تاريخ البداية",
    "rental.endDate": "تاريخ النهاية",
    "rental.duration": "المدة",
    "rental.days": "أيام",
    "rental.subtotal": "المجموع الفرعي",
    "rental.platformFee": "رسوم المنصة",
    "rental.vat": "ضريبة القيمة المضافة (15%)",
    "rental.total": "الإجمالي",
    "rental.commitment": "التعهد القانوني",
    "rental.reference": "المرجع",
    "rental.status": "الحالة",
    "rental.statuses.pending_risk_review": "مراجعة المخاطر",
    "rental.statuses.pending_legal_signing": "بانتظار التوقيع",
    "rental.statuses.pending_payment": "بانتظار الدفع",
    "rental.statuses.confirmed": "مؤكد",
    "rental.statuses.out_for_delivery": "قيد التوصيل",
    "rental.statuses.active": "نشط",
    "rental.statuses.return_in_transit": "قيد الإرجاع",
    "rental.statuses.under_inspection": "تحت الفحص",
    "rental.statuses.closed": "مغلق",
    "rental.statuses.closed_with_penalty": "مغلق (مع غرامة)",
    "rental.statuses.in_dispute": "في نزاع",
    "rental.statuses.enforcement": "تنفيذ",
    "rental.statuses.cancelled": "ملغى",

    // Legal
    "legal.title": "التعهد القانوني",
    "legal.signButton": "توقيع التعهد",
    "legal.accept": "أوافق على جميع الشروط والأحكام",
    "legal.commitmentAmount": "مبلغ التعهد",
    "legal.sanadNote": "سيتم إصدار سند لأمر عبر نافذ",

    // Admin
    "admin.dashboard": "لوحة تحكم المدير",
    "admin.totalUsers": "إجمالي المستخدمين",
    "admin.listedAssets": "الأصول المدرجة",
    "admin.activeRentals": "الإيجارات النشطة",
    "admin.monthlyRentals": "الإيجارات الشهرية",
    "admin.revenue": "الإيرادات",
    "admin.openDisputes": "النزاعات المفتوحة",
    "admin.activeSanads": "السندات النشطة",

    // Common
    "common.loading": "جاري التحميل...",
    "common.error": "حدث خطأ",
    "common.retry": "إعادة المحاولة",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.view": "عرض",
    "common.close": "إغلاق",
    "common.confirm": "تأكيد",
    "common.back": "رجوع",
    "common.next": "التالي",
    "common.yes": "نعم",
    "common.no": "لا",
    "common.sar": "ر.س",
    "common.noData": "لا توجد بيانات",
  },
};

let currentLocale: Locale = getSavedLocale();

export function t(key: string): string {
  return translations[currentLocale][key] ?? translations.en[key] ?? key;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  saveLocale(locale);
}

export function getLocale(): Locale {
  return currentLocale;
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale);

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const translate = useCallback(
    (key: string): string => {
      return translations[locale][key] ?? translations.en[key] ?? key;
    },
    [locale]
  );

  return { locale, setLocale: changeLocale, t: translate, isRtl: locale === "ar" };
}

export function formatSarLocalized(halalas: number | null | undefined, locale: Locale = currentLocale): string {
  const value = (halalas ?? 0) / 100;
  if (locale === "ar") {
    return `${value.toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.س`;
  }
  return `${value.toLocaleString("en-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} SAR`;
}

// Initialize document direction on load
if (typeof document !== "undefined") {
  const locale = getSavedLocale();
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
}
