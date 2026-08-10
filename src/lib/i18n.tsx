import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ar";

const translations = {
  en: {
    // Navigation & Common
    appName: "JustTap",
    signIn: "Sign in / Log in",
    createCardFirst: "Create card first",
    myDashboard: "My dashboard",
    backToHome: "Back to Home",
    guestSandbox: "Guest Sandbox",
    signOut: "Sign out",
    adminPortal: "Admin portal",

    // Landing Page
    badgeText: "Multi-tenant · 100% white-label",
    heroTitle: "One tap and your contact is",
    heroTitleHighlight: "already saved",
    heroSubtitle:
      "Build your personalized digital business card right now, or log in to manage your account dashboard.",
    choiceCreateTitle: "✨ Create Card First",
    choiceCreateDesc: "Build & preview your card now, then sign up to publish.",
    choiceLoginTitle: "🔑 Log In / Sign Up",
    choiceLoginDesc: "Sign in to your account and go straight to dashboard.",
    feature1Title: "Live white-label editor",
    feature1Desc:
      "Colors, header cuts, logo badge — every change renders instantly in a mobile preview.",
    feature2Title: "Built for NFC",
    feature2Desc:
      "Each card maps to a fast public /c/slug page tuned for a 375–430px tap-and-go screen.",
    feature3Title: "Lead capture inbox",
    feature3Desc: "Visitors exchange their details in a bottom sheet; you export them as CSV.",
    feature4Title: "Scan analytics",
    feature4Desc: "Track page views versus contact downloads for every card you issue.",
    feature5Title: "QR fallback",
    feature5Desc: "Download a high-resolution PNG or SVG QR code pointing at the card.",
    feature6Title: "Bilingual EN / AR",
    feature6Desc: "Optional Arabic fields with a full right-to-left layout switch.",

    // Auth Page
    welcomeBack: "Welcome back",
    createAccount: "Create your account",
    signInDesc: "Sign in to manage your digital card.",
    signUpDesc: "Start your digital card in a minute.",
    draftNoticeTitle: "✨ Your customized card is ready!",
    draftNoticeDesc: "Sign in or create an account to publish it to your profile.",
    emailPlaceholder: "you@company.com",
    passwordPlaceholder: "Password (min 6 chars)",
    submitSignIn: "Sign in",
    submitSignUp: "Sign up",
    pleaseWait: "Please wait…",
    noAccountPrompt: "No account? Sign up",
    hasAccountPrompt: "Already have an account? Sign in",

    // Builder & Editor
    designCardTitle: "Design Your Digital Business Card",
    designCardDesc:
      "Customize your card colors, header style, social links & contact details below. You can publish and connect it to your profile in one tap!",
    signUpAndPublish: "Sign up & publish card",
    saveChanges: "Save changes",
    publishCard: "Publish card",
    previewCard: "Preview",
    jumpToPreview: "Jump to preview",
    autoSavedAt: "Auto-saved",
    restoredDraftMsg: "Restored your active draft",
    clearDraft: "Clear draft",

    // Editor Sections
    quickStyling: "Quick styling",
    accentColor: "Accent color",
    cardBackground: "Card background",
    headerPattern: "Header pattern",
    showLogoBadge: "Show circular floating logo badge",
    personalInfo: "Personal info",
    fullName: "Full name *",
    cardLink: "Nickname",
    jobTitle: "Job title",
    company: "Company",
    bio: "Bio",
    photosMedia: "Photos & media",
    profilePhoto: "Profile photo",
    logoBadge: "Logo badge (transparent PNG/SVG)",
    contactDetails: "Contact details",
    phoneNumber: "Phone number *",
    whatsappNumber: "WhatsApp number",
    whatsappMessage: "WhatsApp prefilled message",
    emailAddress: "Email address",
    socialLinks: "Social links",
    bilingualArabic: "Bilingual (Arabic)",
    enableArabicSwitch: "Enable EN / AR switcher on the card",
    arFullName: "الاسم بالعربية",
    arJobTitle: "المسمى الوظيفي",
    arBio: "نبذة",

    // Dashboard Tabs
    myCardTab: "My card",
    analyticsTab: "Analytics",
    leadsTab: "Leads",
    qrCodeTab: "QR code",
    welcomeTitle: "Welcome to JustTap",
    noCardDesc:
      "You don't have a digital business card created yet. Create your personalized profile to start sharing your contact info.",
    createMyCardBtn: "Create My Digital Card",
  },
  ar: {
    // Navigation & Common
    appName: "JustTap",
    signIn: "تسجيل الدخول / حساب جديد",
    createCardFirst: "إنشاء بطاقة أولاً",
    myDashboard: "لوحة التحكم",
    backToHome: "العودة للرئيسية",
    guestSandbox: "تجربة بدون حساب",
    signOut: "تسجيل الخروج",
    adminPortal: "لوحة الإدارة",

    // Landing Page
    badgeText: "منصة بطاقات عمل رقمية ذكية بالكامل",
    heroTitle: "بلمسة واحدة، معلوماتك تكون",
    heroTitleHighlight: "محفوظة فوراً",
    heroSubtitle:
      "صمّم بطاقة عملك الرقمية الذكية الآن، أو سجّل الدخول لإدارة بطاقتك وتتبع التفاعلات.",
    choiceCreateTitle: "✨ صمّم بطاقتك أولاً",
    choiceCreateDesc: "صمّم وعاين بطاقتك الآن مجاناً، ثم أنشئ حسابك لحفظها ونشرها.",
    choiceLoginTitle: "🔑 تسجيل الدخول",
    choiceLoginDesc: "سجّل الدخول إلى حسابك للانتقال مباشرة إلى لوحة التحكم.",
    feature1Title: "محرّر مباشر وشامل",
    feature1Desc: "تحكّم بالألوان، أشكال الهيدر، والشعارات مع معاينة حية ومباشرة.",
    feature2Title: "مصمّم لتقنية NFC",
    feature2Desc: "كل بطاقة تربط برابط سريع ومحسن لشاشات الجوال والتمرير السريع.",
    feature3Title: "صندوق استلام التفاعلات",
    feature3Desc: "يستطيع الزوار تبادل معلوماتهم معك وسحبها بملف CSV بسهولة.",
    feature4Title: "إحصائيات وزيارات",
    feature4Desc: "تتبع عدد مشاهدات البطاقات وعمليات تحميل ملف التواصل VCF.",
    feature5Title: "رمز QR احترافي",
    feature5Desc: "حمّل رمز QR عالي الدقة يوجه مباشرة لبطاقتك الشخصية.",
    feature6Title: "دعم كامل للغتين (عربي / إنجليزي)",
    feature6Desc: "إمكانية إدخال البيانات باللغتين العربية والإنجليزية مع تبديل الاتجاه (RTL).",

    // Auth Page
    welcomeBack: "أهلاً بك مجدداً",
    createAccount: "إنشاء حساب جديد",
    signInDesc: "سجّل الدخول لإدارة بطاقتك الرقمية.",
    signUpDesc: "ابدأ بطاقتك الرقمية في دقيقة واحدة.",
    draftNoticeTitle: "✨ تصميم بطاقتك جاهز!",
    draftNoticeDesc: "أنشئ حسابك أو سجّل الدخول لحفظ البطاقة وربطها بملفك الشخصي.",
    emailPlaceholder: "name@company.com",
    passwordPlaceholder: "كلمة المرور (6 خانات على الأقل)",
    submitSignIn: "تسجيل الدخول",
    submitSignUp: "إنشاء الحساب",
    pleaseWait: "جاري التحميل…",
    noAccountPrompt: "ليس لديك حساب؟ أنشئ حساباً",
    hasAccountPrompt: "لديك حساب بالفعل؟ سجّل الدخول",

    // Builder & Editor
    designCardTitle: "صمّم بطاقتك الرقمية الذكية",
    designCardDesc:
      "خصص ألوان البطاقة، نمط الهيدر، الروابط الاجتماعية ومعلومات الاتصال. يمكنك حفظها ونشرها بلمسة واحدة!",
    signUpAndPublish: "إنشاء حساب ونشر البطاقة",
    saveChanges: "حفظ التغييرات",
    publishCard: "نشر البطاقة",
    previewCard: "معاينة",
    jumpToPreview: "الانتقال للمعاينة",
    autoSavedAt: "تم الحفظ تلقائياً",
    restoredDraftMsg: "تم استعادة المسودة النشطة",
    clearDraft: "مسح المسودة",

    // Editor Sections
    quickStyling: "التصميم والألوان",
    accentColor: "اللون الرئيسي",
    cardBackground: "خلفية البطاقة",
    headerPattern: "شكل نمط الهيدر",
    showLogoBadge: "إظهار شعار الشركة الدائري",
    personalInfo: "البيانات الشخصية",
    fullName: "الاسم الكامل *",
    cardLink: "اللقب (رابط البطاقة)",
    jobTitle: "المسمى الوظيفي",
    company: "الشركة / الجهة",
    bio: "نبذة تعريفية",
    photosMedia: "الصور والوسائط",
    profilePhoto: "الصورة الشخصية",
    logoBadge: "شعار الشركة (PNG/SVG مفرغ)",
    contactDetails: "معلومات الاتصال",
    phoneNumber: "رقم الهاتف *",
    whatsappNumber: "رقم الواتساب",
    whatsappMessage: "رسالة الواتساب الجاهزة",
    emailAddress: "البريد الإلكتروني",
    socialLinks: "روابط التواصل الاجتماعي",
    bilingualArabic: "اللغة العربية (إضافي)",
    enableArabicSwitch: "تفعيل زر التبديل بين العربي والإنجليزي على البطاقة",
    arFullName: "الاسم بالعربية",
    arJobTitle: "المسمى الوظيفي بالعربية",
    arBio: "النبذة التعريفية بالعربية",

    // Dashboard Tabs
    myCardTab: "بطاقتي",
    analyticsTab: "الإحصائيات",
    leadsTab: "التفاعلات والعملاء",
    qrCodeTab: "رمز QR",
    welcomeTitle: "مرحباً بك في JustTap",
    noCardDesc: "لم تقم بإنشاء بطاقة عمل رقمية بعد. أنشئ ملفك الشخصي لتبدأ بمشاركة معلوماتك فوراً.",
    createMyCardBtn: "إنشاء بطاقتي الرقمية",
  },
};

type Translations = typeof translations.en;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: keyof Translations) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("justtap_app_lang") as Language;
        if (saved === "en" || saved === "ar") return saved;
      }
    } catch {
      /* ignore storage errors */
    }
    return "en";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("justtap_app_lang", newLang);
      }
    } catch {
      /* ignore storage errors */
    }
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  const t = (key: keyof Translations): string => {
    return translations[lang][key] || translations.en[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, dir }}>
      <div dir={dir} className={lang === "ar" ? "font-arabic" : ""}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within LanguageProvider");
  }
  return ctx;
}
