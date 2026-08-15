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
    myCardTab: "Cards",
    cardsTab: "Cards",
    analyticsTab: "Analytics",
    leadsTab: "Connections",
    qrCodeTab: "QR & Export",
    proTab: "Pro Features",
    welcomeTitle: "Welcome to JustTap",
    noCardDesc:
      "You don't have a digital business card created yet. Create your personalized profile to start sharing your contact info.",
    createMyCardBtn: "Create My Digital Card",

    // Analytics Tab
    analyticsTitle: "Analytics",
    analyticsSubtitle: "Understand how people interact with your card.",
    selectCardAria: "Select card for analytics",
    selectCardConnectionsAria: "Select card for connections",
    analyticsDateRangeAria: "Analytics date range",
    range7d: "7D",
    range30d: "30D",
    range90d: "90D",
    rangeAll: "All",
    loadingAnalytics: "Loading analytics…",
    analyticsErrorTitle: "Analytics couldn't be loaded.",
    analyticsErrorDesc: "Check your network connection and try again.",
    tryAgain: "Try again",
    analyticsProTitle: "Analytics is a Pro feature",
    analyticsProDesc:
      "Upgrade your card to Pro to unlock real-time profile views, contact saves, connection trends, and traffic source insights.",
    profileViews: "Profile Views",
    contactSaves: "Contact Saves",
    connections: "Connections",
    conversionRate: "Conversion Rate",
    noActivityTitle: "No activity in this range",
    noActivityDesc:
      "Activity appears here after people view your public card or exchange information.",
    profileActivity: "Profile Activity",
    viewsLegend: "Views",
    savesLegend: "Saves",
    connectionsLegend: "Connections",
    profileActivityAria: "Profile Views, Contact Saves, and Connections over time",
    viewTrendDataTable: "View trend data table ↓",
    utcPeriod: "UTC Period",
    trafficSources: "Traffic Sources",
    trafficSourcesSubtitle: "Entry channels to your card",
    noTrafficSourcesTitle: "No traffic source data yet",
    noTrafficSourcesDesc:
      "Source data will appear when visitors enter through a Link, Profile QR, or JustTap Card.",
    sourceLink: "Link",
    sourceProfileQr: "Profile QR",
    sourceJustTapCard: "JustTap Card",
    topActions: "Top Actions",
    topActionsSubtitle: "High-intent actions taken by visitors",
    noTopActionsTitle: "No tracked actions in this range.",
    noTopActionsDesc: "Actions like saving contacts and connecting will appear here.",
    actionVcard: "Contact Saves",
    actionConnection: "Connections",
    actionPhone: "Call",
    actionEmail: "Email",
    actionWhatsapp: "WhatsApp",
    actionSocial: "Social Link",
    actionWebsite: "Website",
    actionShare: "Share",
    actionBooking: "Booking",
    actionCustomCta: "Custom Link",
    actionPdf: "PDF Download",
    actionVideo: "Video Play",
    actionWallet: "Wallet Pass",
    peakActivity: "Peak Activity",
    peakActivitySubtitle: "Highest profile view day in this period",
    noPeakActivityTitle: "No peak activity yet",
    noPeakActivityDesc:
      "Peak activity will appear after your profile receives views in this period.",
    recentContacts: "Recent Contacts",
    recentContactsSubtitle: "Latest people who exchanged details through your card",
    viewAll: "View all",
    loadingRecentContacts: "Loading recent contacts…",
    noContactsYet: "No contacts yet",
    noContactsYetDesc: "When people exchange info, they will appear here.",

    // Connections Tab
    connectionsTitle: "Connections",
    connectionsSubtitle: "People who exchanged information through your card.",
    exportCsv: "Export CSV",
    csvProNotice: "CSV export is available on Pro",
    searchConnectionsPlaceholder: "Search connections...",
    clearSearch: "Clear search",
    filterConnectionsAria: "Filter connections by status",
    statusAll: "All",
    statusNew: "New",
    statusFollowUp: "Follow Up",
    statusContacted: "Contacted",
    statusDone: "Done",
    loadingConnections: "Loading Connections…",
    connectionsErrorTitle: "Connections couldn't be loaded.",
    noConnectionsOverallTitle: "No connections yet",
    noConnectionsOverallDesc:
      "When someone exchanges their information through your JustTap card, they’ll appear here.",
    noFilteredConnectionsTitle: "No connections match your filters",
    noFilteredConnectionsDesc: "Try adjusting your search query or status filter.",
    clearFilters: "Clear filters",
    connectedOn: "Connected on",
    callAction: "Call",
    emailAction: "Email",
    whatsappAction: "WhatsApp",
    viewDetails: "View details",
    visitorNote: "Visitor note",
    visitorNoteDesc: "Shared by this person when they connected.",
    privateTags: "Private tags",
    addTagPlaceholder: "Add tag (e.g. event, priority)…",
    add: "Add",
    followUpStatus: "Follow-up status",
    privateNote: "Private note",
    onlyYouCanSeeThis: "Only you can see this",
    privateNotePlaceholder: "Add a private follow-up note…",
    saving: "Saving…",
    deleteConnection: "Delete connection",
    deleteConnectionDialogTitle: "Delete",
    deleteConnectionDialogDesc:
      "This removes this Connection from your account. This action cannot be undone.",
    cancel: "Cancel",
    delete: "Delete",
    deleting: "Deleting…",
    proFollowUpFeaturesTitle: "Pro Follow-up Features",
    proFollowUpFeaturesDesc:
      "Private notes, custom tags, and pipeline follow-up statuses are available on Pro.",
    justNow: "Just now",
    yesterday: "Yesterday",
    close: "Close",
    removeTagAria: "Remove tag",
    exportedCsvToast: "Connections exported to CSV.",
    savedFollowUpToast: "Follow-up details saved.",
    deleteFailedToast: "We couldn't delete this Connection. Please try again.",
    saveFailedToast: "We couldn't save these follow-up details. Please try again.",
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
    myCardTab: "البطاقات",
    cardsTab: "البطاقات",
    analyticsTab: "الإحصائيات",
    leadsTab: "جهات الاتصال",
    qrCodeTab: "رمز QR والتصدير",
    proTab: "ميزات Pro",
    welcomeTitle: "مرحباً بك في JustTap",
    noCardDesc: "لم تقم بإنشاء بطاقة عمل رقمية بعد. أنشئ ملفك الشخصي لتبدأ بمشاركة معلوماتك فوراً.",
    createMyCardBtn: "إنشاء بطاقتي الرقمية",

    // Analytics Tab
    analyticsTitle: "الإحصائيات",
    analyticsSubtitle: "تعرّف على كيفية تفاعل الأشخاص مع بطاقتك.",
    selectCardAria: "اختر بطاقة لعرض الإحصائيات",
    selectCardConnectionsAria: "اختر بطاقة لعرض جهات الاتصال",
    analyticsDateRangeAria: "الفترة الزمنية للإحصائيات",
    range7d: "7D",
    range30d: "30D",
    range90d: "90D",
    rangeAll: "الكل",
    loadingAnalytics: "جاري تحميل الإحصائيات…",
    analyticsErrorTitle: "تعذّر تحميل الإحصائيات.",
    analyticsErrorDesc: "تحقق من اتصالك بالإنترنت ثم حاول مجدداً.",
    tryAgain: "إعادة المحاولة",
    analyticsProTitle: "الإحصائيات ميزة خاصة بحسابات Pro",
    analyticsProDesc:
      "قم بترقية بطاقتك إلى Pro لمتابعة مشاهدات الملف، حفظ جهات الاتصال، وتتبع مصادر الزيارات في الوقت الفعلي.",
    profileViews: "مشاهدات الملف",
    contactSaves: "حفظ جهة الاتصال",
    connections: "جهات الاتصال",
    conversionRate: "معدل التحويل",
    noActivityTitle: "لا يوجد نشاط في هذه الفترة",
    noActivityDesc: "سيظهر النشاط هنا بمجرد زيارة بطاقتك أو تبادل المعلومات معك.",
    profileActivity: "نشاط الملف الشخصي",
    viewsLegend: "المشاهدات",
    savesLegend: "الحفظ",
    connectionsLegend: "جهات الاتصال",
    profileActivityAria: "مشاهدات الملف وحفظ جهات الاتصال والتواصل عبر الوقت",
    viewTrendDataTable: "عرض جدول بيانات النشاط ↓",
    utcPeriod: "التاريخ (UTC)",
    trafficSources: "مصادر الزيارات",
    trafficSourcesSubtitle: "قنوات الوصول إلى بطاقتك",
    noTrafficSourcesTitle: "لا توجد بيانات لمصادر الزيارات بعد",
    noTrafficSourcesDesc:
      "ستظهر البيانات عندما يدخل الزوار عبر الرابط، رمز QR، أو بطاقة JustTap.",
    sourceLink: "الرابط",
    sourceProfileQr: "رمز QR للملف",
    sourceJustTapCard: "بطاقة JustTap",
    topActions: "أبرز الإجراءات",
    topActionsSubtitle: "الإجراءات الأعلى تفاعلاً من الزوار",
    noTopActionsTitle: "لا توجد إجراءات مسجلة في هذه الفترة.",
    noTopActionsDesc: "ستظهر هنا الإجراءات مثل حفظ جهة الاتصال والتواصل.",
    actionVcard: "حفظ جهة الاتصال",
    actionConnection: "جهات الاتصال",
    actionPhone: "اتصال هاتفي",
    actionEmail: "بريد إلكتروني",
    actionWhatsapp: "واتساب",
    actionSocial: "رابط تواصل",
    actionWebsite: "موقع إلكتروني",
    actionShare: "مشاركة",
    actionBooking: "حجز موعد",
    actionCustomCta: "رابط مخصص",
    actionPdf: "تحميل PDF",
    actionVideo: "تشغيل فيديو",
    actionWallet: "بطاقة المحفظة",
    peakActivity: "ذروة النشاط",
    peakActivitySubtitle: "اليوم الأكثر تفاعلاً في هذه الفترة",
    noPeakActivityTitle: "لا يوجد نشاط مسجل بعد",
    noPeakActivityDesc: "ستظهر ذروة النشاط عندما يتلقى ملفك مشاهدات خلال هذه الفترة.",
    recentContacts: "أحدث جهات الاتصال",
    recentContactsSubtitle: "آخر الأشخاص الذين تبادلوا معلوماتهم عبر بطاقتك",
    viewAll: "عرض الكل",
    loadingRecentContacts: "جاري تحميل أحدث جهات الاتصال…",
    noContactsYet: "لا توجد جهات اتصال بعد",
    noContactsYetDesc: "عندما يتبادل الأشخاص معلوماتهم معك، ستظهر هنا.",

    // Connections Tab
    connectionsTitle: "جهات الاتصال",
    connectionsSubtitle: "الأشخاص الذين تبادلوا بياناتهم عبر بطاقتك.",
    exportCsv: "تصدير CSV",
    csvProNotice: "تصدير CSV متاح في باقة Pro",
    searchConnectionsPlaceholder: "بحث في جهات الاتصال...",
    clearSearch: "مسح البحث",
    filterConnectionsAria: "فلترة جهات الاتصال حسب الحالة",
    statusAll: "الكل",
    statusNew: "جديد",
    statusFollowUp: "متابعة",
    statusContacted: "تم التواصل",
    statusDone: "مكتمل",
    loadingConnections: "جاري تحميل جهات الاتصال…",
    connectionsErrorTitle: "تعذّر تحميل جهات الاتصال.",
    noConnectionsOverallTitle: "لا توجد جهات اتصال بعد",
    noConnectionsOverallDesc:
      "عندما يتبادل شخص ما معلوماته عبر بطاقتك، ستظهر بياناته هنا.",
    noFilteredConnectionsTitle: "لا توجد نتائج مطابقة لخيارات البحث",
    noFilteredConnectionsDesc: "جرب تعديل كلمة البحث أو فلتر الحالة.",
    clearFilters: "مسح الفلاتر",
    connectedOn: "تاريخ التواصل",
    callAction: "اتصال",
    emailAction: "بريد",
    whatsappAction: "واتساب",
    viewDetails: "عرض التفاصيل",
    visitorNote: "ملاحظة الزائر",
    visitorNoteDesc: "تمت مشاركتها من هذا الشخص عند التواصل.",
    privateTags: "وسوم خاصة",
    addTagPlaceholder: "إضافة وسم (مثل: مؤتمر، أولوية)…",
    add: "إضافة",
    followUpStatus: "حالة المتابعة",
    privateNote: "ملاحظة خاصة",
    onlyYouCanSeeThis: "أنت فقط من يرى هذا",
    privateNotePlaceholder: "أضف ملاحظة متابعة خاصة…",
    saving: "جاري الحفظ…",
    deleteConnection: "حذف جهة الاتصال",
    deleteConnectionDialogTitle: "حذف",
    deleteConnectionDialogDesc:
      "سيؤدي هذا إلى حذف جهة الاتصال نهائياً من حسابك. لا يمكن التراجع عن هذا الإجراء.",
    cancel: "إلغاء",
    delete: "حذف",
    deleting: "جاري الحذف…",
    proFollowUpFeaturesTitle: "ميزات المتابعة المتقدمة (Pro)",
    proFollowUpFeaturesDesc:
      "الملاحظات الخاصة والوسوم وحالات المتابعة متاحة حصرياً لمشتركي Pro.",
    justNow: "الآن",
    yesterday: "أمس",
    close: "إغلاق",
    removeTagAria: "حذف الوسم",
    exportedCsvToast: "تم تصدير جهات الاتصال كملف CSV بنجاح.",
    savedFollowUpToast: "تم حفظ تفاصيل المتابعة.",
    deleteFailedToast: "تعذّر حذف جهة الاتصال. يرجى المحاولة مجدداً.",
    saveFailedToast: "تعذّر حفظ تفاصيل المتابعة. يرجى المحاولة مجدداً.",
  },
};

export type Translations = typeof translations.en;

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

export function formatLocalizedRelativeTime(dateString: string, lang: Language = "en"): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (lang === "ar") {
    if (diffMinutes < 1) return "الآن";
    if (diffMinutes < 60) return `منذ ${diffMinutes} د`;
    if (diffHours < 24) return `منذ ${diffHours} س`;
    if (diffDays === 1) return "أمس";
    if (diffDays < 7) return `منذ ${diffDays} ي`;
    return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
  }

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatLocalizedPeakDate(
  periodStr: string,
  lang: Language = "en",
): { formattedDate: string; dayOfWeek: string } {
  try {
    const parts = periodStr.split("-").map(Number);
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      if (year && month && day) {
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        const locale = lang === "ar" ? "ar-EG" : "en-US";
        const formattedDate = utcDate.toLocaleDateString(locale, {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        });
        const dayOfWeek = utcDate.toLocaleDateString(locale, {
          weekday: "long",
          timeZone: "UTC",
        });
        return { formattedDate, dayOfWeek };
      }
    }
  } catch {
    /* fallback */
  }
  return { formattedDate: periodStr, dayOfWeek: "" };
}
