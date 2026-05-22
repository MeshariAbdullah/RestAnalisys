import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Lang = "en" | "ar";
export type Dir = "ltr" | "rtl";

const STORAGE_KEY = "mlr_lang";

const translations = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.browse": "Browse",
    "nav.myRentals": "My Rentals",
    "nav.myAssets": "My Assets",
    "nav.submitAsset": "Submit Asset",
    "nav.payouts": "Payouts",
    "nav.inspections": "Inspections",
    "nav.shipments": "Shipments",
    "nav.inventory": "Inventory",
    "nav.alerts": "Alerts",
    "nav.approvals": "Approvals",
    "nav.users": "Users",
    "nav.disputes": "Disputes",
    "nav.finance": "Finance",
    "nav.sanadTracking": "Sanad Tracking",
    "nav.notifications": "Notifications",
    "nav.profile": "Profile",
    "nav.logout": "Logout",
    "nav.login": "Login",
    "nav.register": "Register",
    "nav.browseCatalog": "Browse Catalog",
    "nav.ownerDashboard": "Owner Dashboard",
    "nav.inspectionQueue": "Inspection Queue",
    "nav.opsDashboard": "Ops Dashboard",
    "nav.adminDashboard": "Admin Dashboard",
    "nav.assetApprovals": "Asset Approvals",
    "nav.financialOverview": "Financial Overview",

    // Common
    "common.search": "Search",
    "common.filter": "Filter",
    "common.all": "All",
    "common.loading": "Loading",
    "common.noResults": "No results",
    "common.submit": "Submit",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.view": "View",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.status": "Status",
    "common.date": "Date",
    "common.amount": "Amount",
    "common.actions": "Actions",

    // Asset categories
    "category.handbag": "Handbag",
    "category.watch": "Watch",
    "category.dress": "Dress",
    "category.jewelry": "Jewelry",
    "category.accessory": "Accessory",
    "category.other": "Other",

    // Asset statuses
    "assetStatus.pendingApproval": "Pending Approval",
    "assetStatus.listed": "Listed",
    "assetStatus.rentedOut": "Rented Out",
    "assetStatus.inInspection": "In Inspection",
    "assetStatus.inStorage": "In Storage",
    "assetStatus.returnedToOwner": "Returned to Owner",
    "assetStatus.suspended": "Suspended",

    // Rental statuses
    "rentalStatus.pendingLegalSigning": "Pending Legal Signing",
    "rentalStatus.pendingPayment": "Pending Payment",
    "rentalStatus.confirmed": "Confirmed",
    "rentalStatus.active": "Active",
    "rentalStatus.closed": "Closed",
    "rentalStatus.cancelled": "Cancelled",
    "rentalStatus.disputed": "Disputed",
    "rentalStatus.overdueReturn": "Overdue Return",

    // Money
    "money.sar": "SAR",
    "money.perDay": "per day",
    "money.total": "Total",
    "money.subtotal": "Subtotal",
    "money.vat": "VAT",
    "money.platformFee": "Platform Fee",

    // Landing page
    "landing.badge": "Saudi-compliant · Nafath · Nafith · ZATCA",
    "landing.heroTitle": "Luxury rentals,",
    "landing.heroTitleHighlight": "fully managed.",
    "landing.heroSubtitle": "Rent designer bags, watches and couture — evaluated, stored, insured, and delivered by our operations team. Owners earn passive income, renters get verified luxury.",
    "landing.ctaBrowse": "Browse the collection",
    "landing.ctaSubmit": "Submit your asset",
    "landing.howItWorks": "How it works",
    "landing.howItWorksSubtitle": "Every rental is contracted between the platform and the renter. Owners are guaranteed their asset back — or its full evaluated value.",
    "landing.step1Title": "1. Owners submit assets",
    "landing.step1Desc": "Upload photos and a declared value. Our experts authenticate and evaluate the piece.",
    "landing.step2Title": "2. We store & insure",
    "landing.step2Desc": "Assets live in our monitored vaults. Every movement is logged and insured.",
    "landing.step3Title": "3. Renters book & receive",
    "landing.step3Desc": "Verified renters sign a Sanad-backed agreement and we ship the item directly.",
    "landing.trustTitle": "Built for trust",
    "landing.trustSubtitle": "Every renter is verified via Nafath. Every contract is enforceable via Nafith Sanad. Every invoice is ZATCA-compliant.",
    "landing.trust1Title": "Nafath verified",
    "landing.trust1Desc": "Saudi national identity check at registration.",
    "landing.trust2Title": "Sanad contracts",
    "landing.trust2Desc": "Electronic promissory notes via MOJ Nafith.",
    "landing.trust3Title": "Expert inspection",
    "landing.trust3Desc": "Every asset is authenticated & graded on arrival.",
    "landing.trust4Title": "Full value guarantee",
    "landing.trust4Desc": "Owners are paid evaluated value on total loss.",
    "landing.ownersTitle": "Turn your closet into income",
    "landing.ownersSubtitle": "Your handbags, watches and couture can earn 15–35% of their evaluated value each year. We handle the cleaning, storage, shipping, and legal protection — you just receive monthly payouts.",
    "landing.ownerBenefit1": "No listing work — we photograph and price your piece",
    "landing.ownerBenefit2": "You approve every valuation before going live",
    "landing.ownerBenefit3": "Guaranteed return or full evaluated value payout",
    "landing.ownerBenefit4": "Withdraw your asset at any time between rentals",
    "landing.becomeOwner": "Become an asset owner",
    "landing.examplePayout": "Example payout",
    "landing.dailyRental": "Daily rental",
    "landing.occupancy": "Occupancy",
    "landing.yourShare": "Your share (80%)",
    "landing.navHow": "How it works",
    "landing.navTrust": "Trust & safety",
    "landing.navOwners": "For owners",
    "landing.footer": "MLR Managed Luxury Rental Platform",
    "landing.footerSub": "Operating under Saudi commercial registration · ZATCA tax ID on file",

    // Auth
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full Name",
    "auth.signIn": "Sign In",
    "auth.signUp": "Sign Up",
    "auth.rememberMe": "Remember me",
    "auth.createAccount": "Create account",

    // Roles
    "role.renter": "Renter",
    "role.owner": "Asset Owner",
    "role.inspector": "Inspector",
    "role.operations": "Operations",
    "role.admin": "Admin",
    "role.superAdmin": "Super Admin",
  },
  ar: {
    // Navigation
    "nav.dashboard": "لوحة التحكم",
    "nav.browse": "تصفح",
    "nav.myRentals": "إيجاراتي",
    "nav.myAssets": "أصولي",
    "nav.submitAsset": "إضافة أصل",
    "nav.payouts": "المدفوعات",
    "nav.inspections": "الفحوصات",
    "nav.shipments": "الشحنات",
    "nav.inventory": "المخزون",
    "nav.alerts": "التنبيهات",
    "nav.approvals": "الموافقات",
    "nav.users": "المستخدمون",
    "nav.disputes": "النزاعات",
    "nav.finance": "المالية",
    "nav.sanadTracking": "تتبع السند",
    "nav.notifications": "الإشعارات",
    "nav.profile": "الملف الشخصي",
    "nav.logout": "تسجيل الخروج",
    "nav.login": "تسجيل الدخول",
    "nav.register": "إنشاء حساب",
    "nav.browseCatalog": "تصفح المعروضات",
    "nav.ownerDashboard": "لوحة تحكم المالك",
    "nav.inspectionQueue": "قائمة الفحص",
    "nav.opsDashboard": "لوحة العمليات",
    "nav.adminDashboard": "لوحة الإدارة",
    "nav.assetApprovals": "موافقات الأصول",
    "nav.financialOverview": "النظرة المالية",

    // Common
    "common.search": "بحث",
    "common.filter": "تصفية",
    "common.all": "الكل",
    "common.loading": "جاري التحميل",
    "common.noResults": "لا توجد نتائج",
    "common.submit": "إرسال",
    "common.cancel": "إلغاء",
    "common.save": "حفظ",
    "common.confirm": "تأكيد",
    "common.back": "رجوع",
    "common.view": "عرض",
    "common.edit": "تعديل",
    "common.delete": "حذف",
    "common.status": "الحالة",
    "common.date": "التاريخ",
    "common.amount": "المبلغ",
    "common.actions": "الإجراءات",

    // Asset categories
    "category.handbag": "حقيبة يد",
    "category.watch": "ساعة",
    "category.dress": "فستان",
    "category.jewelry": "مجوهرات",
    "category.accessory": "إكسسوار",
    "category.other": "أخرى",

    // Asset statuses
    "assetStatus.pendingApproval": "بانتظار الموافقة",
    "assetStatus.listed": "معروض",
    "assetStatus.rentedOut": "مؤجر",
    "assetStatus.inInspection": "قيد الفحص",
    "assetStatus.inStorage": "في المستودع",
    "assetStatus.returnedToOwner": "أُعيد للمالك",
    "assetStatus.suspended": "معلّق",

    // Rental statuses
    "rentalStatus.pendingLegalSigning": "بانتظار التوقيع القانوني",
    "rentalStatus.pendingPayment": "بانتظار الدفع",
    "rentalStatus.confirmed": "مؤكد",
    "rentalStatus.active": "نشط",
    "rentalStatus.closed": "مغلق",
    "rentalStatus.cancelled": "ملغي",
    "rentalStatus.disputed": "متنازع عليه",
    "rentalStatus.overdueReturn": "متأخر الإرجاع",

    // Money
    "money.sar": "ر.س",
    "money.perDay": "في اليوم",
    "money.total": "الإجمالي",
    "money.subtotal": "المجموع الفرعي",
    "money.vat": "ضريبة القيمة المضافة",
    "money.platformFee": "رسوم المنصة",

    // Landing page
    "landing.badge": "متوافق مع الأنظمة السعودية · نفاذ · نافذ · زاتكا",
    "landing.heroTitle": "تأجير الفاخر،",
    "landing.heroTitleHighlight": "بإدارة كاملة.",
    "landing.heroSubtitle": "استأجر حقائب المصممين والساعات والأزياء الراقية — يتم تقييمها وتخزينها وتأمينها وتوصيلها بواسطة فريق العمليات لدينا. يحقق الملاك دخلاً سلبياً، والمستأجرون يحصلون على فخامة موثقة.",
    "landing.ctaBrowse": "تصفح المجموعة",
    "landing.ctaSubmit": "أضف أصلك",
    "landing.howItWorks": "كيف تعمل المنصة",
    "landing.howItWorksSubtitle": "كل عقد إيجار يتم بين المنصة والمستأجر. يُضمن للمالك استرداد أصله — أو قيمته التقييمية الكاملة.",
    "landing.step1Title": "١. الملاك يضيفون أصولهم",
    "landing.step1Desc": "ارفع الصور والقيمة المُعلنة. خبراؤنا يوثقون ويقيّمون القطعة.",
    "landing.step2Title": "٢. نحن نخزّن ونؤمّن",
    "landing.step2Desc": "الأصول تُحفظ في خزائننا المراقبة. كل حركة مسجلة ومؤمنة.",
    "landing.step3Title": "٣. المستأجرون يحجزون ويستلمون",
    "landing.step3Desc": "المستأجرون الموثقون يوقعون اتفاقية مدعومة بالسند ونشحن القطعة مباشرة.",
    "landing.trustTitle": "مبنية على الثقة",
    "landing.trustSubtitle": "كل مستأجر موثق عبر نفاذ. كل عقد قابل للتنفيذ عبر سند نافذ. كل فاتورة متوافقة مع زاتكا.",
    "landing.trust1Title": "توثيق نفاذ",
    "landing.trust1Desc": "التحقق من الهوية الوطنية عند التسجيل.",
    "landing.trust2Title": "عقود السند",
    "landing.trust2Desc": "سندات لأمر إلكترونية عبر نافذ وزارة العدل.",
    "landing.trust3Title": "فحص الخبراء",
    "landing.trust3Desc": "كل أصل يتم توثيقه وتصنيفه عند الاستلام.",
    "landing.trust4Title": "ضمان القيمة الكاملة",
    "landing.trust4Desc": "يُدفع للمالك القيمة التقييمية في حال الخسارة الكلية.",
    "landing.ownersTitle": "حوّل خزانتك إلى مصدر دخل",
    "landing.ownersSubtitle": "حقائبك وساعاتك وأزياؤك الراقية يمكن أن تحقق ١٥-٣٥٪ من قيمتها التقييمية سنوياً. نتولى التنظيف والتخزين والشحن والحماية القانونية — وأنت تستلم الأرباح شهرياً.",
    "landing.ownerBenefit1": "لا عمل في العرض — نحن نصوّر ونسعّر قطعتك",
    "landing.ownerBenefit2": "توافق على كل تقييم قبل النشر",
    "landing.ownerBenefit3": "ضمان الإرجاع أو دفع القيمة التقييمية الكاملة",
    "landing.ownerBenefit4": "اسحب أصلك في أي وقت بين الإيجارات",
    "landing.becomeOwner": "كن مالك أصول",
    "landing.examplePayout": "مثال على الأرباح",
    "landing.dailyRental": "الإيجار اليومي",
    "landing.occupancy": "نسبة الإشغال",
    "landing.yourShare": "حصتك (٨٠٪)",
    "landing.navHow": "كيف تعمل",
    "landing.navTrust": "الثقة والأمان",
    "landing.navOwners": "للملاك",
    "landing.footer": "منصة MLR لتأجير الفاخر المُدار",
    "landing.footerSub": "تعمل تحت سجل تجاري سعودي · رقم ضريبي مسجل في زاتكا",

    // Auth
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.fullName": "الاسم الكامل",
    "auth.signIn": "تسجيل الدخول",
    "auth.signUp": "إنشاء حساب",
    "auth.rememberMe": "تذكرني",
    "auth.createAccount": "إنشاء حساب",

    // Roles
    "role.renter": "مستأجر",
    "role.owner": "مالك أصول",
    "role.inspector": "فاحص",
    "role.operations": "عمليات",
    "role.admin": "مدير",
    "role.superAdmin": "مدير أعلى",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: Dir;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "ar";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ar") return stored;
  return "ar";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  }, []);

  const dir: Dir = lang === "ar" ? "rtl" : "ltr";

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[lang][key] ?? key;
    },
    [lang]
  );

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  const value: LanguageContextValue = { lang, setLang, t, dir };

  return React.createElement(LanguageContext.Provider, { value }, children);
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export { translations };
export type { TranslationKey };
