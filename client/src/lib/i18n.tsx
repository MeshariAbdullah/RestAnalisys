import React, { createContext, useContext, useState, useCallback } from "react";

export type Lang = "ar" | "en";

const translations = {
  // Navigation
  "nav.browse": { ar: "تصفح المجموعة", en: "Browse Catalog" },
  "nav.myRentals": { ar: "إيجاراتي", en: "My Rentals" },
  "nav.ownerDashboard": { ar: "لوحة المالك", en: "Owner Dashboard" },
  "nav.submitAsset": { ar: "تقديم قطعة", en: "Submit Asset" },
  "nav.payouts": { ar: "المدفوعات", en: "Payouts" },
  "nav.inspectorQueue": { ar: "قائمة الفحص", en: "Inspection Queue" },
  "nav.opsDashboard": { ar: "لوحة العمليات", en: "Ops Dashboard" },
  "nav.shipments": { ar: "الشحنات", en: "Shipments" },
  "nav.inventory": { ar: "المخزون", en: "Inventory" },
  "nav.alerts": { ar: "التنبيهات", en: "Alerts" },
  "nav.adminDashboard": { ar: "لوحة الإدارة", en: "Admin Dashboard" },
  "nav.assetApprovals": { ar: "موافقات الأصول", en: "Asset Approvals" },
  "nav.users": { ar: "المستخدمون", en: "Users" },
  "nav.disputes": { ar: "النزاعات", en: "Disputes" },
  "nav.sanadTracking": { ar: "تتبع السندات", en: "Sanad Tracking" },
  "nav.financialOverview": { ar: "النظرة المالية", en: "Financial Overview" },
  "nav.notifications": { ar: "الإشعارات", en: "Notifications" },

  // Roles
  "role.renter": { ar: "مستأجر", en: "Renter" },
  "role.owner": { ar: "مالك الأصول", en: "Asset Owner" },
  "role.inspector": { ar: "مفتش", en: "Inspector" },
  "role.operations": { ar: "العمليات", en: "Operations" },
  "role.admin": { ar: "مدير", en: "Admin" },
  "role.super_admin": { ar: "مدير أعلى", en: "Super Admin" },

  // Landing page
  "landing.tagline": { ar: "متوافق مع السعودية · نفاذ · نافث · زاتكا", en: "Saudi-compliant · Nafath · Nafith · ZATCA" },
  "landing.heroTitle1": { ar: "تأجير الفخامة،", en: "Luxury rentals," },
  "landing.heroTitle2": { ar: "مُدار بالكامل.", en: "fully managed." },
  "landing.heroDesc": {
    ar: "استأجر حقائب المصممين، الساعات والأزياء الراقية — مُقيّمة، مخزّنة، مؤمّنة، ومُسلّمة بواسطة فريق عملياتنا. المُلّاك يحققون دخلاً سلبياً، والمستأجرون يحصلون على فخامة موثّقة.",
    en: "Rent designer bags, watches and couture — evaluated, stored, insured, and delivered by our operations team. Owners earn passive income, renters get verified luxury.",
  },
  "landing.browseCta": { ar: "تصفح المجموعة", en: "Browse the collection" },
  "landing.submitCta": { ar: "قدّم قطعتك", en: "Submit your asset" },
  "landing.howTitle": { ar: "كيف يعمل", en: "How it works" },
  "landing.howDesc": {
    ar: "كل إيجار يتم بعقد بين المنصة والمستأجر. المُلّاك مضمون لهم إعادة أصولهم — أو قيمتها التقييمية الكاملة.",
    en: "Every rental is contracted between the platform and the renter. Owners are guaranteed their asset back — or its full evaluated value.",
  },
  "landing.step1Title": { ar: "١. المُلّاك يقدمون الأصول", en: "1. Owners submit assets" },
  "landing.step1Desc": {
    ar: "ارفع الصور والقيمة المُعلنة. خبراؤنا يوثّقون ويُقيّمون القطعة.",
    en: "Upload photos and a declared value. Our experts authenticate and evaluate the piece.",
  },
  "landing.step2Title": { ar: "٢. نخزّن ونؤمّن", en: "2. We store & insure" },
  "landing.step2Desc": {
    ar: "الأصول في خزائننا المراقبة. كل حركة مسجّلة ومؤمّنة.",
    en: "Assets live in our monitored vaults. Every movement is logged and insured.",
  },
  "landing.step3Title": { ar: "٣. المستأجرون يحجزون ويستلمون", en: "3. Renters book & receive" },
  "landing.step3Desc": {
    ar: "المستأجرون الموثّقون يوقعون اتفاقية مدعومة بسند، ونشحن القطعة مباشرة.",
    en: "Verified renters sign a Sanad-backed agreement and we ship the item directly.",
  },
  "landing.trustTitle": { ar: "مبنيّة على الثقة", en: "Built for trust" },
  "landing.trustDesc": {
    ar: "كل مستأجر موثّق عبر نفاذ. كل عقد قابل للتنفيذ عبر سند نافث. كل فاتورة متوافقة مع زاتكا.",
    en: "Every renter is verified via Nafath. Every contract is enforceable via Nafith Sanad. Every invoice is ZATCA-compliant.",
  },
  "landing.nafathTitle": { ar: "توثيق نفاذ", en: "Nafath verified" },
  "landing.nafathDesc": { ar: "فحص الهوية الوطنية السعودية عند التسجيل.", en: "Saudi national identity check at registration." },
  "landing.sanadTitle": { ar: "عقود سند", en: "Sanad contracts" },
  "landing.sanadDesc": { ar: "سندات لأمر إلكترونية عبر نافث وزارة العدل.", en: "Electronic promissory notes via MOJ Nafith." },
  "landing.inspectionTitle": { ar: "فحص خبراء", en: "Expert inspection" },
  "landing.inspectionDesc": { ar: "كل أصل يتم توثيقه وتقييمه عند الوصول.", en: "Every asset is authenticated & graded on arrival." },
  "landing.guaranteeTitle": { ar: "ضمان القيمة الكاملة", en: "Full value guarantee" },
  "landing.guaranteeDesc": { ar: "المُلّاك يحصلون على القيمة التقييمية عند الخسارة الكلية.", en: "Owners are paid evaluated value on total loss." },
  "landing.ownersTitle": { ar: "حوّل خزانتك إلى دخل", en: "Turn your closet into income" },
  "landing.ownersDesc": {
    ar: "حقائبك، ساعاتك وأزياؤك الراقية يمكن أن تحقق ١٥-٣٥٪ من قيمتها التقييمية سنوياً. نحن نتولى التنظيف، التخزين، الشحن، والحماية القانونية — أنت فقط تستلم المدفوعات الشهرية.",
    en: "Your handbags, watches and couture can earn 15–35% of their evaluated value each year. We handle the cleaning, storage, shipping, and legal protection — you just receive monthly payouts.",
  },
  "landing.ownerFeature1": { ar: "لا عمل في الإعلان — نحن نصوّر ونسعّر قطعتك", en: "No listing work — we photograph and price your piece" },
  "landing.ownerFeature2": { ar: "أنت توافق على كل تقييم قبل النشر", en: "You approve every valuation before going live" },
  "landing.ownerFeature3": { ar: "إعادة مضمونة أو دفع القيمة التقييمية الكاملة", en: "Guaranteed return or full evaluated value payout" },
  "landing.ownerFeature4": { ar: "اسحب أصلك في أي وقت بين الإيجارات", en: "Withdraw your asset at any time between rentals" },
  "landing.becomeOwner": { ar: "كن مالك أصول", en: "Become an asset owner" },
  "landing.examplePayout": { ar: "مثال على المدفوعات", en: "Example payout" },
  "landing.dailyRental": { ar: "الإيجار اليومي", en: "Daily rental" },
  "landing.occupancy": { ar: "نسبة الإشغال", en: "Occupancy" },
  "landing.yourShare": { ar: "حصتك (٨٠٪)", en: "Your share (80%)" },
  "landing.value": { ar: "القيمة", en: "Value" },
  "landing.signIn": { ar: "تسجيل الدخول", en: "Sign in" },
  "landing.createAccount": { ar: "إنشاء حساب", en: "Create account" },
  "landing.howLink": { ar: "كيف يعمل", en: "How it works" },
  "landing.trustLink": { ar: "الثقة والأمان", en: "Trust & safety" },
  "landing.ownersLink": { ar: "للمُلّاك", en: "For owners" },

  // Browse page
  "browse.title": { ar: "المجموعة", en: "The Collection" },
  "browse.subtitle": { ar: "موثّقة، مفحوصة وجاهزة للشحن.", en: "Verified, inspected and ready to ship." },
  "browse.searchPlaceholder": { ar: "ابحث بالعلامة التجارية، الموديل، العنوان…", en: "Search brand, model, title…" },
  "browse.all": { ar: "الكل", en: "All" },
  "browse.bags": { ar: "حقائب", en: "Bags" },
  "browse.watches": { ar: "ساعات", en: "Watches" },
  "browse.dresses": { ar: "فساتين", en: "Dresses" },
  "browse.jewelry": { ar: "مجوهرات", en: "Jewelry" },
  "browse.noResults": { ar: "لا توجد أصول تطابق فلاترك.", en: "No assets match your filters." },
  "browse.perDay": { ar: "/ يوم", en: "/ day" },
  "browse.valueLabel": { ar: "القيمة", en: "Value" },
  "browse.sortNewest": { ar: "الأحدث", en: "Newest" },
  "browse.sortPriceLow": { ar: "السعر: الأقل", en: "Price: Low" },
  "browse.sortPriceHigh": { ar: "السعر: الأعلى", en: "Price: High" },
  "browse.sortValue": { ar: "القيمة", en: "By Value" },
  "browse.minPrice": { ar: "أقل سعر يومي", en: "Min daily price" },
  "browse.maxPrice": { ar: "أعلى سعر يومي", en: "Max daily price" },
  "browse.clearFilters": { ar: "مسح الفلاتر", en: "Clear filters" },

  // Common
  "common.logout": { ar: "تسجيل الخروج", en: "Logout" },
  "common.guest": { ar: "زائر", en: "Guest" },
  "common.sar": { ar: "ر.س", en: "SAR" },
  "common.loading": { ar: "جاري التحميل...", en: "Loading..." },
  "common.noData": { ar: "لا توجد بيانات", en: "No data" },
  "common.markAllRead": { ar: "تعليم الكل كمقروء", en: "Mark all as read" },
  "common.noNotifications": { ar: "لا توجد إشعارات", en: "No notifications" },

  // Notifications
  "notifications.title": { ar: "الإشعارات", en: "Notifications" },
  "notifications.subtitle": { ar: "تابع أحدث تحديثات المنصة.", en: "Stay up to date with platform activity." },

  // Login
  "login.title": { ar: "تسجيل الدخول", en: "Sign in" },
  "login.subtitle": { ar: "الوصول إلى لوحة تحكم MLR", en: "Access your MLR dashboard" },
  "login.email": { ar: "البريد الإلكتروني", en: "Email" },
  "login.password": { ar: "كلمة المرور", en: "Password" },
  "login.submit": { ar: "تسجيل الدخول", en: "Sign in" },
  "login.loading": { ar: "جاري الدخول…", en: "Signing in…" },
  "login.demoTitle": { ar: "بيانات تجريبية:", en: "Demo credentials:" },
  "login.demoPassword": { ar: "كلمة المرور للجميع:", en: "Password for all:" },
  "login.noAccount": { ar: "جديد على MLR؟", en: "New to MLR?" },
  "login.createLink": { ar: "إنشاء حساب", en: "Create an account" },

  // Register
  "register.title": { ar: "إنشاء حسابك", en: "Create your account" },
  "register.subtitle": { ar: "انضم كمستأجر أو مالك أصول", en: "Join as a renter or an asset owner" },
  "register.renter": { ar: "استأجر قطع", en: "Rent items" },
  "register.owner": { ar: "أعرض أصولي", en: "List my assets" },
  "register.fullName": { ar: "الاسم الكامل", en: "Full name" },
  "register.email": { ar: "البريد الإلكتروني", en: "Email" },
  "register.password": { ar: "كلمة المرور", en: "Password" },
  "register.passwordHint": { ar: "٨ أحرف على الأقل، حروف كبيرة وصغيرة ورقم", en: "Min 8 chars, upper + lower + digit" },
  "register.submit": { ar: "إنشاء حساب", en: "Create account" },
  "register.loading": { ar: "جاري الإنشاء…", en: "Creating account…" },
  "register.terms": { ar: "بالتسجيل أنت توافق على شروط MLR. مطلوب توثيق هوية نفاذ قبل أول معاملة.", en: "By registering you agree to the MLR terms. Nafath identity verification is required before your first transaction." },
  "register.hasAccount": { ar: "لديك حساب؟", en: "Already registered?" },
  "register.signInLink": { ar: "تسجيل الدخول", en: "Sign in" },
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: "rtl" | "ltr";
}

const I18nContext = createContext<I18nContextType>({
  lang: "ar",
  setLang: () => {},
  t: (key) => key,
  dir: "rtl",
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("mlr_lang");
    return (stored === "en" || stored === "ar") ? stored : "ar";
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("mlr_lang", newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[key]?.[lang] ?? key,
    [lang]
  );

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
