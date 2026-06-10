import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type Locale = "ar" | "en";

const LANG_KEY = "mlr_lang";

const translations = {
  ar: {
    // Navigation
    "nav.browse": "تصفح المجموعة",
    "nav.myRentals": "إيجاراتي",
    "nav.ownerDashboard": "لوحة المالك",
    "nav.submitAsset": "تقديم أصل",
    "nav.payouts": "المدفوعات",
    "nav.inspectionQueue": "طابور الفحص",
    "nav.opsDashboard": "لوحة العمليات",
    "nav.shipments": "الشحنات",
    "nav.inventory": "المخزون",
    "nav.alerts": "التنبيهات",
    "nav.adminDashboard": "لوحة الإدارة",
    "nav.assetApprovals": "موافقات الأصول",
    "nav.users": "المستخدمين",
    "nav.disputes": "النزاعات",
    "nav.sanadTracking": "تتبع السندات",
    "nav.financialOverview": "نظرة مالية",
    "nav.profile": "الملف الشخصي",
    "nav.logout": "تسجيل خروج",

    // Roles
    "role.renter": "مستأجر",
    "role.owner": "مالك أصول",
    "role.inspector": "فاحص",
    "role.operations": "عمليات",
    "role.admin": "مدير",
    "role.super_admin": "مدير عام",

    // Landing
    "landing.badge": "متوافق مع الأنظمة السعودية · نفاذ · نافذ · زاتكا",
    "landing.heroTitle1": "تأجير الفاخر،",
    "landing.heroTitle2": "مُدار بالكامل.",
    "landing.heroDesc": "استأجر حقائب المصممين والساعات والأزياء الراقية — مقيّمة ومخزنة ومؤمنة ومسلّمة بواسطة فريق عملياتنا. المالكون يكسبون دخلاً سلبياً، والمستأجرون يحصلون على فخامة موثقة.",
    "landing.browseBtn": "تصفح المجموعة",
    "landing.submitBtn": "قدم أصولك",
    "landing.howItWorks": "كيف يعمل",
    "landing.howDesc": "كل عقد إيجار يكون بين المنصة والمستأجر. المالكون مضمونون لاستعادة أصولهم — أو قيمتها الكاملة المقيّمة.",
    "landing.step1Title": "١. المالكون يقدمون الأصول",
    "landing.step1Desc": "ارفع الصور والقيمة المصرّحة. خبراؤنا يتحققون من الأصالة ويقيّمون القطعة.",
    "landing.step2Title": "٢. نخزن ونؤمن",
    "landing.step2Desc": "الأصول تُحفظ في خزائننا المراقبة. كل حركة مسجلة ومؤمنة.",
    "landing.step3Title": "٣. المستأجرون يحجزون ويستلمون",
    "landing.step3Desc": "المستأجرون الموثقون يوقعون اتفاقية مدعومة بسند ونشحن القطعة مباشرة.",
    "landing.trustTitle": "مبني على الثقة",
    "landing.trustDesc": "كل مستأجر موثق عبر نفاذ. كل عقد قابل للتنفيذ عبر سند نافذ. كل فاتورة متوافقة مع زاتكا.",
    "landing.nafath": "موثق بنفاذ",
    "landing.nafathDesc": "التحقق من الهوية الوطنية السعودية عند التسجيل.",
    "landing.sanad": "عقود سندات",
    "landing.sanadDesc": "سندات لأمر إلكترونية عبر نافذ بوزارة العدل.",
    "landing.inspection": "فحص خبراء",
    "landing.inspectionDesc": "كل أصل يتم التحقق من أصالته وتقييمه عند الاستلام.",
    "landing.guarantee": "ضمان القيمة الكاملة",
    "landing.guaranteeDesc": "المالكون يحصلون على القيمة المقيّمة عند الخسارة الكاملة.",
    "landing.ownersTitle": "حوّل خزانتك إلى دخل",
    "landing.ownersDesc": "حقائبك وساعاتك وأزياؤك الراقية يمكن أن تكسب ١٥-٣٥٪ من قيمتها المقيّمة سنوياً. نحن نتولى التنظيف والتخزين والشحن والحماية القانونية — أنت فقط تستلم الأرباح الشهرية.",
    "landing.ownerBenefit1": "لا عمل للإدراج — نحن نصور ونسعر قطعتك",
    "landing.ownerBenefit2": "توافق على كل تقييم قبل البدء",
    "landing.ownerBenefit3": "ضمان الإرجاع أو دفع القيمة المقيّمة الكاملة",
    "landing.ownerBenefit4": "اسحب أصلك في أي وقت بين الإيجارات",
    "landing.becomeOwner": "كن مالك أصول",
    "landing.examplePayout": "مثال على الأرباح",
    "landing.dailyRental": "الإيجار اليومي",
    "landing.occupancy": "نسبة الإشغال",
    "landing.yourShare": "حصتك (٨٠٪)",
    "landing.value": "القيمة",
    "landing.footer": "© {year} منصة MLR لتأجير الفاخر المُدار",
    "landing.footerSub": "تعمل تحت سجل تجاري سعودي · رقم ضريبي لدى زاتكا",

    // Auth
    "auth.signIn": "تسجيل الدخول",
    "auth.createAccount": "إنشاء حساب",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.fullName": "الاسم الكامل",
    "auth.login": "دخول",
    "auth.register": "تسجيل",
    "auth.noAccount": "ليس لديك حساب؟",
    "auth.haveAccount": "لديك حساب بالفعل؟",
    "auth.registerHere": "سجل هنا",
    "auth.loginHere": "سجل دخول",
    "auth.demoCredentials": "بيانات تجريبية",
    "auth.roleRenter": "مستأجر",
    "auth.roleOwner": "مالك أصول",
    "auth.selectRole": "اختر نوع الحساب",
    "auth.passwordHint": "٨ أحرف على الأقل مع رقم ورمز خاص",
    "auth.termsNote": "بالتسجيل، أنت توافق على شروط الخدمة. سيتم التحقق من هويتك عبر نفاذ.",
    "auth.welcomeBack": "أهلاً بعودتك",
    "auth.welcomeBackDesc": "سجّل الدخول لمتابعة إدارة أصولك الفاخرة",
    "auth.joinMLR": "انضم إلى MLR",
    "auth.joinDesc": "أنشئ حسابك للبدء في التأجير أو تقديم أصولك",

    // Profile
    "profile.title": "الملف الشخصي",
    "profile.personalInfo": "المعلومات الشخصية",
    "profile.security": "الأمان",
    "profile.preferences": "التفضيلات",
    "profile.phone": "رقم الجوال",
    "profile.nationalId": "رقم الهوية الوطنية",
    "profile.nafathStatus": "حالة نفاذ",
    "profile.verified": "موثق",
    "profile.unverified": "غير موثق",
    "profile.kycStatus": "حالة التحقق",
    "profile.trustScore": "نقاط الثقة",
    "profile.riskCategory": "فئة المخاطر",
    "profile.changePassword": "تغيير كلمة المرور",
    "profile.currentPassword": "كلمة المرور الحالية",
    "profile.newPassword": "كلمة المرور الجديدة",
    "profile.confirmPassword": "تأكيد كلمة المرور",
    "profile.language": "اللغة",
    "profile.arabic": "العربية",
    "profile.english": "English",
    "profile.save": "حفظ التغييرات",
    "profile.verifyNafath": "توثيق بنفاذ",
    "profile.memberSince": "عضو منذ",

    // Common
    "common.loading": "جاري التحميل...",
    "common.error": "حدث خطأ",
    "common.retry": "إعادة المحاولة",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.delete": "حذف",
    "common.edit": "تعديل",
    "common.view": "عرض",
    "common.search": "بحث...",
    "common.noResults": "لا توجد نتائج",
    "common.sar": "ر.س",
    "common.perYear": "سنوياً",
    "common.howItWorks": "كيف يعمل",
    "common.trustSafety": "الثقة والأمان",
    "common.forOwners": "للمالكين",

    // Dashboard
    "dashboard.welcome": "مرحباً، {name}",
    "dashboard.activeAssets": "الأصول النشطة",
    "dashboard.portfolioValue": "قيمة المحفظة",
    "dashboard.lifetimePayouts": "إجمالي المدفوعات",
    "dashboard.submitNew": "تقديم أصل جديد",
    "dashboard.viewPayouts": "عرض المدفوعات",

    // Browse
    "browse.title": "تصفح المجموعة",
    "browse.allCategories": "جميع الفئات",
    "browse.bags": "حقائب",
    "browse.watches": "ساعات",
    "browse.dresses": "فساتين",
    "browse.jewelry": "مجوهرات",
    "browse.dailyRent": "الإيجار اليومي",
    "browse.value": "القيمة",
    "browse.viewDetails": "عرض التفاصيل",

    // Notifications
    "toast.success": "تم بنجاح",
    "toast.error": "خطأ",
    "toast.loginSuccess": "تم تسجيل الدخول بنجاح",
    "toast.registerSuccess": "تم إنشاء الحساب بنجاح",
    "toast.assetSubmitted": "تم تقديم الأصل بنجاح",
    "toast.profileUpdated": "تم تحديث الملف الشخصي",
    "toast.logoutSuccess": "تم تسجيل الخروج",
  },
  en: {
    // Navigation
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
    "nav.profile": "Profile",
    "nav.logout": "Logout",

    // Roles
    "role.renter": "Renter",
    "role.owner": "Asset Owner",
    "role.inspector": "Inspector",
    "role.operations": "Operations",
    "role.admin": "Admin",
    "role.super_admin": "Super Admin",

    // Landing
    "landing.badge": "Saudi-compliant · Nafath · Nafith · ZATCA",
    "landing.heroTitle1": "Luxury rentals,",
    "landing.heroTitle2": "fully managed.",
    "landing.heroDesc": "Rent designer bags, watches and couture — evaluated, stored, insured, and delivered by our operations team. Owners earn passive income, renters get verified luxury.",
    "landing.browseBtn": "Browse the collection",
    "landing.submitBtn": "Submit your asset",
    "landing.howItWorks": "How it works",
    "landing.howDesc": "Every rental is contracted between the platform and the renter. Owners are guaranteed their asset back — or its full evaluated value.",
    "landing.step1Title": "1. Owners submit assets",
    "landing.step1Desc": "Upload photos and a declared value. Our experts authenticate and evaluate the piece.",
    "landing.step2Title": "2. We store & insure",
    "landing.step2Desc": "Assets live in our monitored vaults. Every movement is logged and insured.",
    "landing.step3Title": "3. Renters book & receive",
    "landing.step3Desc": "Verified renters sign a Sanad-backed agreement and we ship the item directly.",
    "landing.trustTitle": "Built for trust",
    "landing.trustDesc": "Every renter is verified via Nafath. Every contract is enforceable via Nafith Sanad. Every invoice is ZATCA-compliant.",
    "landing.nafath": "Nafath verified",
    "landing.nafathDesc": "Saudi national identity check at registration.",
    "landing.sanad": "Sanad contracts",
    "landing.sanadDesc": "Electronic promissory notes via MOJ Nafith.",
    "landing.inspection": "Expert inspection",
    "landing.inspectionDesc": "Every asset is authenticated & graded on arrival.",
    "landing.guarantee": "Full value guarantee",
    "landing.guaranteeDesc": "Owners are paid evaluated value on total loss.",
    "landing.ownersTitle": "Turn your closet into income",
    "landing.ownersDesc": "Your handbags, watches and couture can earn 15–35% of their evaluated value each year. We handle the cleaning, storage, shipping, and legal protection — you just receive monthly payouts.",
    "landing.ownerBenefit1": "No listing work — we photograph and price your piece",
    "landing.ownerBenefit2": "You approve every valuation before going live",
    "landing.ownerBenefit3": "Guaranteed return or full evaluated value payout",
    "landing.ownerBenefit4": "Withdraw your asset at any time between rentals",
    "landing.becomeOwner": "Become an asset owner",
    "landing.examplePayout": "Example payout",
    "landing.dailyRental": "Daily rental",
    "landing.occupancy": "Occupancy",
    "landing.yourShare": "Your share (80%)",
    "landing.value": "value",
    "landing.footer": "© {year} MLR Managed Luxury Rental Platform",
    "landing.footerSub": "Operating under Saudi commercial registration · ZATCA tax ID on file",

    // Auth
    "auth.signIn": "Sign in",
    "auth.createAccount": "Create account",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full name",
    "auth.login": "Sign in",
    "auth.register": "Register",
    "auth.noAccount": "Don't have an account?",
    "auth.haveAccount": "Already have an account?",
    "auth.registerHere": "Register here",
    "auth.loginHere": "Sign in",
    "auth.demoCredentials": "Demo credentials",
    "auth.roleRenter": "Renter",
    "auth.roleOwner": "Asset Owner",
    "auth.selectRole": "Select account type",
    "auth.passwordHint": "At least 8 characters with a number and special character",
    "auth.termsNote": "By registering, you agree to our terms of service. Your identity will be verified via Nafath.",
    "auth.welcomeBack": "Welcome back",
    "auth.welcomeBackDesc": "Sign in to continue managing your luxury assets",
    "auth.joinMLR": "Join MLR",
    "auth.joinDesc": "Create your account to start renting or listing your assets",

    // Profile
    "profile.title": "Profile",
    "profile.personalInfo": "Personal Information",
    "profile.security": "Security",
    "profile.preferences": "Preferences",
    "profile.phone": "Phone number",
    "profile.nationalId": "National ID",
    "profile.nafathStatus": "Nafath status",
    "profile.verified": "Verified",
    "profile.unverified": "Unverified",
    "profile.kycStatus": "KYC status",
    "profile.trustScore": "Trust score",
    "profile.riskCategory": "Risk category",
    "profile.changePassword": "Change password",
    "profile.currentPassword": "Current password",
    "profile.newPassword": "New password",
    "profile.confirmPassword": "Confirm password",
    "profile.language": "Language",
    "profile.arabic": "العربية",
    "profile.english": "English",
    "profile.save": "Save changes",
    "profile.verifyNafath": "Verify with Nafath",
    "profile.memberSince": "Member since",

    // Common
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.retry": "Retry",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.view": "View",
    "common.search": "Search...",
    "common.noResults": "No results",
    "common.sar": "SAR",
    "common.perYear": "/yr",
    "common.howItWorks": "How it works",
    "common.trustSafety": "Trust & safety",
    "common.forOwners": "For owners",

    // Dashboard
    "dashboard.welcome": "Welcome, {name}",
    "dashboard.activeAssets": "Active assets",
    "dashboard.portfolioValue": "Portfolio value",
    "dashboard.lifetimePayouts": "Lifetime payouts",
    "dashboard.submitNew": "Submit new asset",
    "dashboard.viewPayouts": "View payouts",

    // Browse
    "browse.title": "Browse Collection",
    "browse.allCategories": "All Categories",
    "browse.bags": "Bags",
    "browse.watches": "Watches",
    "browse.dresses": "Dresses",
    "browse.jewelry": "Jewelry",
    "browse.dailyRent": "Daily rent",
    "browse.value": "Value",
    "browse.viewDetails": "View details",

    // Notifications
    "toast.success": "Success",
    "toast.error": "Error",
    "toast.loginSuccess": "Logged in successfully",
    "toast.registerSuccess": "Account created successfully",
    "toast.assetSubmitted": "Asset submitted successfully",
    "toast.profileUpdated": "Profile updated",
    "toast.logoutSuccess": "Logged out",
  },
} as const;

type TranslationKey = keyof typeof translations.ar;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  dir: "rtl" | "ltr";
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(LANG_KEY);
    return (stored === "en" || stored === "ar") ? stored : "ar";
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LANG_KEY, newLocale);
  }, []);

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string>): string => {
      const dict = translations[locale] as Record<string, string>;
      const fallback = translations.ar as Record<string, string>;
      let text: string = dict[key] ?? fallback[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, v);
        });
      }
      return text;
    },
    [locale]
  );

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
