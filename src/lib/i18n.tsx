import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ar";

const translations = {
  en: {
    // Navigation & Common
    appName: "JustTap",
    signIn: "Sign In",
    createCardFirst: "Create card first",
    myDashboard: "My Dashboard",
    backToHome: "Back to Home",
    guestSandbox: "Guest Sandbox",
    signOut: "Sign Out",
    adminPortal: "Admin Portal",
    goHome: "Go home",
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    saveChanges: "Save Changes",
    saved: "Saved",
    saving: "Saving…",
    tryAgain: "Try again",
    pleaseWait: "Please wait…",
    delete: "Delete",
    deleting: "Deleting…",
    add: "Add",
    viewAll: "View all",
    justNow: "Just now",
    yesterday: "Yesterday",

    // Landing Page
    landingNavSignIn: "Sign In",
    landingNavClientPortal: "Client Portal",
    landingHeroBadge: "Multi-Tenant NFC & Digital Business Card SaaS",
    landingHeroH1: "One Tap to Share Your Entire Professional Identity",
    landingHeroDesc:
      "Optimized for physical NFC business cards and digital sharing. Stream dynamic vCards, Apple Wallet passes, collect visitor leads, and track analytics seamlessly.",
    landingCtaCreate: "Create Your Card Free",
    landingCtaSandbox: "Instant Guest Sandbox",
    landingFeaturesTitle: "Everything You Need in One Tap",
    landingFeaturesSubtitle: "Built for physical NFC cards, QR codes, and digital networking",
    landingCard1Title: "Dynamic vCard & Apple Wallet",
    landingCard1Desc:
      "Instant contact downloading via dynamic .vcf generation and signed Apple Wallet .pkpass passes.",
    landingCard2Title: "Bilingual Arabic & English",
    landingCard2Desc:
      "Native RTL layout support and custom Arabic translations for full name, job title, and bio fields.",
    landingCard3Title: "Offline QR & Lockscreen Wallpaper",
    landingCard3Desc:
      "Generate offline scannable QR codes and custom 1080x1920px smartphone lockscreen wallpapers.",
    landingFooterRights: "JustTap. All rights reserved.",

    // Auth Page
    authTitleSignIn: "Welcome Back",
    authTitleSignUp: "Create JustTap Account",
    authDescSignIn: "Sign in to access your card editor, leads, and analytics",
    authDescSignUp: "Start building your physical NFC and digital business card profile",
    authFullNameLabel: "Full Name",
    authFullNamePlaceholder: "Hashim Alnimari",
    authEmailLabel: "Email Address",
    authEmailPlaceholder: "you@example.com",
    authPasswordLabel: "Password",
    authPasswordPlaceholder: "••••••••",
    authSubmitProcessing: "Processing...",
    authSubmitSignUp: "Create Free Account",
    authSubmitSignIn: "Sign In",
    authToggleToSignIn: "Already have an account? Sign in",
    authToggleToSignUp: "Don't have an account? Sign up free",
    authSuccessCreated: "Account created! Redirecting...",
    authSuccessSignIn: "Sign in successful! Redirecting...",

    // Builder & Editor
    designCardTitle: "Design Your Digital Business Card",
    designCardDesc:
      "Customize your card colors, header style, social links & contact details below. You can publish and connect it to your profile in one tap!",
    signUpAndPublish: "Sign up & publish card",
    publishCard: "Publish card",
    previewCard: "Preview",
    jumpToPreview: "Jump to preview",
    autoSavedAt: "Auto-saved",
    restoredDraftMsg: "Restored your active draft",
    clearDraft: "Clear draft",
    backToCards: "Back to Cards",
    draftSavedLocally: "Draft saved locally",
    unsavedChanges: "Unsaved Changes",
    disablePublicProfile: "Disable Public Profile",
    enablePublicProfile: "Enable Public Profile",
    publishChanges: "Publish Changes",
    loadedDraftStorage: "Loaded your working draft from browser storage.",
    modeClassicV2: "Classic V2",
    modeCustomCreator: "Custom Creator",
    customCreatorEngine: "Custom Creator Engine",
    proOnlyBadge: "PRO ONLY",
    presetPalettes: "Preset Palettes",
    headerDividerPattern: "Header Divider Pattern",
    surfaceFinish: "Surface Finish",
    fiveColorControls: "Five Color Controls",
    colorBg: "1. Background",
    colorSurface: "2. Surface",
    colorPrimaryAccent: "3. Primary Accent",
    colorChampagneAccent: "4. Champagne Accent",
    colorText: "5. Text Color",
    cornerStyle: "Corner Style",
    cardFont: "Card Font",
    disablePublicModalTitle: "Disable Public Profile?",
    enablePublicModalTitle: "Enable Public Profile?",
    disablePublicModalDesc:
      "This will turn your public profile into an inactive page. Note: Your physical permanent token (/t/:token) identity will remain completely safe and protected.",
    enablePublicModalDesc: "This will reactivate your public profile URL.",
    whatsappHint: "Auto-formats local numbers (e.g. 0501234567 -> 966501234567)",

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
    createMyCardBtn: "Create My First Card",
    myCardsTitle: "My Digital Cards",
    myCardsSubtitle: "Manage all digital business cards owned by your account",
    createNewCard: "Create New Card",
    editCard: "Edit Card",
    tagLinkedBadge: "NFC Tag Linked",
    tagInactiveBadge: "Tag Inactive",
    digitalOnlyBadge: "Digital Only",
    viewPublicCardTitle: "View Public Card",
    specialFeaturesEditor: "Special Features Editor",
    reloadComponent: "Reload Component",
    selectCardToViewAnalytics: "Select a card to view analytics.",
    selectCardToViewQr: "Select a card to view QR features.",
    selectCardToViewConnections: "Select a card to view Connections.",
    specialFeaturesTitle: "Special Features & Integrations",
    cardPublishedToast: "Your digital card has been published!",

    // QR Tab
    qrHubTitle: "QR Code & Export Hub",
    qrHubSubtitle: "Export high-res QR codes, offline vCards, wallpapers, and Apple Wallet passes.",
    upgradeToPro: "Upgrade to PRO",
    qrDynamicProfile: "Dynamic Profile",
    qrOfflineVCard: "Offline vCard",
    qrPermanentTag: "Permanent Tag QR",
    qrDescDynamic: "Links to your live public profile. Requires internet.",
    qrDescPermanent: "Encodes permanent tag identity. Protected from slug changes.",
    qrDescOffline:
      "Encodes raw vCard contact text directly. Phone cameras save contact info with no internet needed.",
    generatingQr: "Generating QR...",
    standardPng: "Standard PNG",
    highRes2000px: "2000px High-Res",
    appleWalletPassBtn: "Apple Wallet Pass (.pkpass)",
    appleWalletDigitalBtn: "Digital Card — Apple Wallet (.pkpass)",
    appleWalletContactBtn: "Contact Card — Apple Wallet (.pkpass)",
    signedBadge: "SIGNED",
    wallpaperGenTitle: "Lockscreen Wallpaper Generator",
    wallpaperGenDesc:
      "Generates a 1080x1920px smartphone wallpaper featuring your name, title, contact info, and embedded offline vCard QR code.",
    wallpaperGenBtnPro: "Generate 1080x1920 Wallpaper (PRO)",
    wallpaperGenBtn: "Generate & Download 1080x1920 Wallpaper",
    upgradeModalTitle: "Upgrade to JustTap PRO",
    upgradeModalDesc:
      "Unlock high-res 2000px PNG downloads, custom lockscreen wallpaper generation, and remove watermark branding!",
    upgradeFeature1: "High-Res 2000px PNG QR Code Downloads",
    upgradeFeature2: "Smart Lockscreen Wallpaper (1080x1920px)",
    upgradeFeature3: 'Remove "Powered by JustTap" watermark',
    upgradeNowBtn: "Upgrade to PRO Now",
    maybeLater: "Maybe Later",

    // Pro Features Tab
    proBlocksBadge: "Special Features & Pro Blocks",
    proBlocksTitle: "Elevate Your Profile with Interactive Blocks",
    proBlocksDesc:
      "Add video intros, PDF menus/brochures, live Calendly booking, custom CTAs & Apple Wallet passes.",
    proStatusActive: "Pro Status: Active",
    freePlanNotice:
      "You are currently on the Free Plan. You can customize these special features below and preview them in the live simulator, but upgrade to Pro ($9.99/mo) to make them live for public visitors.",
    videoIntroTitle: "Video Intro Embed",
    videoIntroDesc: "Embed a YouTube, Loom, or Vimeo video directly onto your digital card.",
    videoIntroPlaceholder:
      "https://www.youtube.com/watch?v=... or YouTube Shorts / Loom / Vimeo link",
    videoIntroSupportHint:
      "Supports YouTube Shorts, YouTube Watch, Loom, Vimeo, and Google Drive video URLs.",
    pdfDocTitle: "PDF & Document Attachment",
    pdfDocDesc: "Attach a downloadable food menu, company brochure, catalog, or CV.",
    pdfBtnLabel: "Button Display Label",
    pdfBtnPlaceholder: "e.g. Download Product Catalog (PDF)",
    pdfUploadLabel: "Upload PDF or Paste PDF URL",
    uploadBtn: "Upload",
    bookingTitle: "Live Appointment Booking",
    bookingDesc:
      "Link your Calendly, SavvyCal, or TidyCal URL so visitors can book meetings instantly.",
    bookingPlaceholder: "https://calendly.com/your-name/30min",
    customCtaTitle: "Custom Call-To-Action (CTA) Button",
    customCtaDesc:
      'Add a high-priority action button (e.g. "Pay via Stripe", "View Portfolio", "Get Directions").',
    customCtaButtonTitle: "Button Title",
    customCtaButtonPlaceholder: "e.g. Book Consultation",
    customCtaDestinationLabel: "Destination Link",
    emailAlertsTitle: "Instant Email Lead Alerts (Main Feature)",
    emailAlertsDesc:
      "Receive an automatic email notification the moment a visitor scans your card & submits their contact info.",
    emailAlertsToggle: "Email Alerts",
    emailAlertsDestLabel: "Destination Email Address for Lead Notifications",
    sendTestEmailBtn: "Send Test Email Alert",
    sendingTestEmail: "Sending...",
    leadsInboxHint: "Leads are also saved permanently in your Connections tab for CSV export.",
    webhookTitle: "Advanced HTTP Webhook (Zapier / Make.com)",
    webhookOptional: "Optional",
    webhookDesc: "Forward raw JSON lead payloads to external automation systems or custom APIs.",
    enableWebhookToggle: "Enable Webhook",
    webhookUrlLabel: "Webhook Catch Endpoint URL",
    testWebhookBtn: "Test Webhook",
    removeBrandingTitle: "Remove Branding Badge",
    removeBrandingDesc: 'Hide "Powered by JustTap" footer watermark.',
    saveProFeaturesBtn: "Save & Publish Special Features",
    proFeaturesActiveOnAccount: "Pro features active on your account",
    customizeSpecialFeatures: "Customize special features & publish",

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
    followUpStatus: "Follow-up status",
    privateNote: "Private note",
    onlyYouCanSeeThis: "Only you can see this",
    privateNotePlaceholder: "Add a private follow-up note…",
    deleteConnection: "Delete connection",
    deleteConnectionDialogTitle: "Delete",
    deleteConnectionDialogDesc:
      "This removes this Connection from your account. This action cannot be undone.",
    proFollowUpFeaturesTitle: "Pro Follow-up Features",
    proFollowUpFeaturesDesc:
      "Private notes, custom tags, and pipeline follow-up statuses are available on Pro.",
    removeTagAria: "Remove tag",
    exportedCsvToast: "Connections exported to CSV.",
    savedFollowUpToast: "Follow-up details saved.",
    deleteFailedToast: "We couldn't delete this Connection. Please try again.",
    saveFailedToast: "We couldn't save these follow-up details. Please try again.",

    // Dropzone & Status Pages
    dropzoneReplace: "Click or drop to replace",
    dropzoneUpload: "Drag & drop or click to upload",
    cardNotExistTitle: "This card doesn't exist",
    cardNotExistDesc: "The link or NFC tag may have been deactivated.",
    cardServiceErrorTitle: "Card service unavailable",
    cardServiceErrorDesc: "We couldn't load this card right now. Please try again shortly.",
    pageNotFound: "Page not found",
    pageNotFoundDesc: "The page you're looking for doesn't exist or has been moved.",
    pageDidntLoad: "This page didn't load",
    pageDidntLoadDesc: "Something went wrong on our end. You can try refreshing or head back home.",
  },
  ar: {
    // Navigation & Common
    appName: "JustTap",
    signIn: "تسجيل الدخول",
    createCardFirst: "إنشاء بطاقة أولاً",
    myDashboard: "لوحة التحكم",
    backToHome: "العودة للرئيسية",
    guestSandbox: "تجربة بدون حساب",
    signOut: "تسجيل الخروج",
    adminPortal: "لوحة الإدارة",
    goHome: "العودة للرئيسية",
    close: "إغلاق",
    cancel: "إلغاء",
    confirm: "تأكيد",
    saveChanges: "حفظ التغييرات",
    saved: "تم الحفظ",
    saving: "جاري الحفظ…",
    tryAgain: "إعادة المحاولة",
    pleaseWait: "جاري التحميل…",
    delete: "حذف",
    deleting: "جاري الحذف…",
    add: "إضافة",
    viewAll: "عرض الكل",
    justNow: "الآن",
    yesterday: "أمس",

    // Landing Page
    landingNavSignIn: "تسجيل الدخول",
    landingNavClientPortal: "بوابة العميل",
    landingHeroBadge: "منصة بطاقات الأعمال الرقمية وNFC الذكية",
    landingHeroH1: "لمسة واحدة لمشاركة هويتك المهنية بالكامل",
    landingHeroDesc:
      "مهيأة للبطاقات الذكية NFC والمشاركة الرقمية. تدعم ملفات vCard، بطاقات Apple Wallet، جمع بيانات الزوار وتتبع الإحصائيات بسلاسة.",
    landingCtaCreate: "أنشئ بطاقتك مجاناً",
    landingCtaSandbox: "تجربة مجانية فورية",
    landingFeaturesTitle: "كل ما تحتاجه في لمسة واحدة",
    landingFeaturesSubtitle: "مصممة للبطاقات الذكية NFC ورموز QR والتواصل المهني",
    landingCard1Title: "ملف vCard تفاعلي وبطاقة Apple Wallet",
    landingCard1Desc:
      "تحميل فوري لبيانات الاتصال عبر ملفات .vcf وبطاقات Apple Wallet بصيغة .pkpass المعتمدة.",
    landingCard2Title: "ثنائية اللغة (عربي وإنجليزي)",
    landingCard2Desc: "دعم كامل لاتجاه RTL واللغة العربية للاسم، المسمى الوظيفي والنبذة التعريفية.",
    landingCard3Title: "رمز QR دون إنترنت وخلفية قفل الشاشة",
    landingCard3Desc:
      "توليد رموز QR قابلة للمسح دون اتصال وخلفيات مخصصة لشاشة القفل بدقة 1080×1920 بكسل.",
    landingFooterRights: "JustTap. جميع الحقوق محفوظة.",

    // Auth Page
    authTitleSignIn: "أهلاً بك مجدداً",
    authTitleSignUp: "إنشاء حساب في JustTap",
    authDescSignIn: "سجّل الدخول للوصول إلى محرر البطاقة، جهات الاتصال والإحصائيات",
    authDescSignUp: "ابدأ في تصميم وإدارة بطاقتك الرقمية وبطاقة NFC الذكية",
    authFullNameLabel: "الاسم الكامل",
    authFullNamePlaceholder: "هاشم النمري",
    authEmailLabel: "البريد الإلكتروني",
    authEmailPlaceholder: "name@example.com",
    authPasswordLabel: "كلمة المرور",
    authPasswordPlaceholder: "••••••••",
    authSubmitProcessing: "جاري المعالجة...",
    authSubmitSignUp: "إنشاء حساب مجاني",
    authSubmitSignIn: "تسجيل الدخول",
    authToggleToSignIn: "لديك حساب بالفعل؟ سجّل الدخول",
    authToggleToSignUp: "ليس لديك حساب؟ أنشئ حساباً مجاناً",
    authSuccessCreated: "تم إنشاء الحساب! جاري التحويل...",
    authSuccessSignIn: "تم تسجيل الدخول بنجاح! جاري التحويل...",

    // Builder & Editor
    designCardTitle: "صمّم بطاقتك الرقمية الذكية",
    designCardDesc:
      "خصص ألوان البطاقة، نمط الهيدر، الروابط الاجتماعية ومعلومات الاتصال. يمكنك حفظها ونشرها بلمسة واحدة!",
    signUpAndPublish: "إنشاء حساب ونشر البطاقة",
    publishCard: "نشر البطاقة",
    previewCard: "معاينة",
    jumpToPreview: "الانتقال للمعاينة",
    autoSavedAt: "تم الحفظ تلقائياً",
    restoredDraftMsg: "تم استعادة المسودة النشطة",
    clearDraft: "مسح المسودة",
    backToCards: "العودة للبطاقات",
    draftSavedLocally: "تم حفظ المسودة محلياً",
    unsavedChanges: "تعديلات غير محفوظة",
    disablePublicProfile: "تعطيل الملف العام",
    enablePublicProfile: "تفعيل الملف العام",
    publishChanges: "نشر التغييرات",
    loadedDraftStorage: "تم تحميل مسودة العمل من ذاكرة المتصفح.",
    modeClassicV2: "كلاسيك V2",
    modeCustomCreator: "المصمم المخصص",
    customCreatorEngine: "محرك التصميم المخصص",
    proOnlyBadge: "حصري لـ PRO",
    presetPalettes: "لوحات ألوان جاهزة",
    headerDividerPattern: "نمط فاصل الهيدر",
    surfaceFinish: "مظهر السطح والخلفية",
    fiveColorControls: "التحكم في الألوان الخمسة",
    colorBg: "1. الخلفية",
    colorSurface: "2. سطح البطاقة",
    colorPrimaryAccent: "3. اللون الرئيسي",
    colorChampagneAccent: "4. اللون الثانوي (شمباني)",
    colorText: "5. لون النص",
    cornerStyle: "انحناء الزوايا",
    cardFont: "خط البطاقة",
    disablePublicModalTitle: "هل تريد تعطيل الملف العام؟",
    enablePublicModalTitle: "هل تريد تفعيل الملف العام؟",
    disablePublicModalDesc:
      "سيؤدي هذا إلى جعل ملفك العام صفحة غير مفعلة. ملاحظة: رمز البطاقة الفعلي (/t/:token) سيبقى محمياً وآمناً بالكامل.",
    enablePublicModalDesc: "سيؤدي هذا إلى إعادة تفعيل رابط ملفك العام.",
    whatsappHint: "تنسيق تلقائي للأرقام المحلية (مثل 0501234567 إلى 966501234567)",

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
    myCardsTitle: "بطاقاتي الرقمية",
    myCardsSubtitle: "إدارة جميع بطاقات العمل الرقمية في حسابك",
    createNewCard: "إنشاء بطاقة جديدة",
    editCard: "تعديل البطاقة",
    tagLinkedBadge: "بطاقة NFC مربوطة",
    tagInactiveBadge: "البطاقة غير مفعلة",
    digitalOnlyBadge: "رقمية فقط",
    viewPublicCardTitle: "عرض البطاقة العامة",
    specialFeaturesEditor: "محرر الميزات الخاصة",
    reloadComponent: "إعادة تحميل المكون",
    selectCardToViewAnalytics: "اختر بطاقة لعرض الإحصائيات.",
    selectCardToViewQr: "اختر بطاقة لعرض ميزات QR.",
    selectCardToViewConnections: "اختر بطاقة لعرض جهات الاتصال.",
    specialFeaturesTitle: "الميزات الخاصة والتكاملات",
    cardPublishedToast: "تم نشر بطاقتك الرقمية بنجاح!",

    // QR Tab
    qrHubTitle: "مركز رمز QR والتصدير",
    qrHubSubtitle:
      "تصدير رموز QR عالية الدقة، بطاقات vCard دون إنترنت، خلفيات شاشة، وبطاقات Apple Wallet.",
    upgradeToPro: "الترقية إلى PRO",
    qrDynamicProfile: "الملف التفاعلي",
    qrOfflineVCard: "بطاقة vCard دون إنترنت",
    qrPermanentTag: "رمز البطاقة الدائم",
    qrDescDynamic: "يوجه لملفك العام المباشر. يتطلب اتصالاً بالإنترنت.",
    qrDescPermanent: "مشفر برمز البطاقة الدائم. محمي ضد تغيير الرابط.",
    qrDescOffline:
      "يحتوي على بيانات جهة الاتصال مباشرة. تحفظ كاميرا الهاتف معلوماتك دون الحاجة لإنترنت.",
    generatingQr: "جاري توليد رمز QR...",
    standardPng: "صورة PNG قياسية",
    highRes2000px: "عالي الدقة (2000 بكسل)",
    appleWalletPassBtn: "بطاقة محفظة Apple Wallet (.pkpass)",
    appleWalletDigitalBtn: "البطاقة الرقمية — Apple Wallet (.pkpass)",
    appleWalletContactBtn: "بطاقة جهة الاتصال — Apple Wallet (.pkpass)",
    signedBadge: "معتمد",
    wallpaperGenTitle: "توليد خلفية شاشة القفل",
    wallpaperGenDesc:
      "توليد خلفية هاتف ذكي بدقة 1080×1920 بكسل تتضمن اسمك، مسماك، معلوماتك، ورمز QR يعمل دون اتصال.",
    wallpaperGenBtnPro: "توليد خلفية 1080×1920 (PRO)",
    wallpaperGenBtn: "توليد وتحميل خلفية 1080×1920",
    upgradeModalTitle: "الترقية إلى JustTap PRO",
    upgradeModalDesc:
      "احصل على تحميلات QR بدقة 2000 بكسل، توليد خلفيات شاشة القفل، وإزالة العلامة المائية!",
    upgradeFeature1: "تحميل رمز QR عالي الدقة 2000 بكسل",
    upgradeFeature2: "خلفية قفل الشاشة الذكية (1080×1920 بكسل)",
    upgradeFeature3: 'إزالة علامة "Powered by JustTap"',
    upgradeNowBtn: "الترقية إلى PRO الآن",
    maybeLater: "ربما لاحقاً",

    // Pro Features Tab
    proBlocksBadge: "الميزات المتقدمة وتكاملات Pro",
    proBlocksTitle: "ارتقِ بملفك الشخصي بمكونات تفاعلية",
    proBlocksDesc:
      "أضف مقاطع فيديو، ملفات PDF وقوائم طعام، حجز مواعيد Calendly، وأزرار إجراءات مخصصة.",
    proStatusActive: "حالة الاشتراك: نشط (Pro)",
    freePlanNotice:
      "أنت حالياً على الباقة المجانية. يمكنك تخصيص هذه الميزات ومعاينتها في المحاكي، لكن تتطلب باقة Pro لتفعيلها للزوار.",
    videoIntroTitle: "تضمين فيديو تعريفي",
    videoIntroDesc: "تضمين فيديو من YouTube أو Loom أو Vimeo مباشرة على بطاقتك الرقمية.",
    videoIntroPlaceholder: "رابط YouTube أو YouTube Shorts أو Loom أو Vimeo",
    videoIntroSupportHint: "يدعم روابط YouTube Shorts وLoom وVimeo وGoogle Drive.",
    pdfDocTitle: "إرفاق ملف أو مستند PDF",
    pdfDocDesc: "أرفق قائمة طعام، بروفايل الشركة، كتالوج المنتجات، أو السيرة الذاتية.",
    pdfBtnLabel: "نص زر التحميل",
    pdfBtnPlaceholder: "مثال: تحميل كتالوج المنتجات (PDF)",
    pdfUploadLabel: "رفع ملف PDF أو لصق الرابط",
    uploadBtn: "رفع ملف",
    bookingTitle: "حجز المواعيد المباشر",
    bookingDesc:
      "اربط حسابك في Calendly أو SavvyCal أو TidyCal لتمكين الزوار من حجز المواعيد فوراً.",
    bookingPlaceholder: "https://calendly.com/your-name/30min",
    customCtaTitle: "زر إجراء مخصص (CTA)",
    customCtaDesc:
      'أضف زر إجراء رئيسي (مثل "الدفع الإلكتروني"، "معرض الأعمال"، "الموقع على الخريطة").',
    customCtaButtonTitle: "عنوان الزر",
    customCtaButtonPlaceholder: "مثال: استشارة مجانية",
    customCtaDestinationLabel: "رابط التوجيه",
    emailAlertsTitle: "تنبيهات البريد الفورية للتواصل (الميزة الرئيسية)",
    emailAlertsDesc:
      "استلم إشعاراً بريدياً فورياً بمجرد أن يمسح الزائر بطاقتك ويرسل معلومات التواصل.",
    emailAlertsToggle: "تنبيهات البريد",
    emailAlertsDestLabel: "البريد الإلكتروني المستلم لإشعارات التواصل",
    sendTestEmailBtn: "إرسال بريد تجريبي",
    sendingTestEmail: "جاري الإرسال...",
    leadsInboxHint: "يتم حفظ جهات الاتصال أيضاً بشكل دائم في تبويب جهات الاتصال لتصديرها CSV.",
    webhookTitle: "ربط Webhook متقدم (Zapier / Make)",
    webhookOptional: "اختياري",
    webhookDesc: "إعادة توجيه بيانات التواصل بصيغة JSON إلى منصات الأتمتة الخارجية أو الـ API.",
    enableWebhookToggle: "تفعيل Webhook",
    webhookUrlLabel: "رابط استقبال Webhook",
    testWebhookBtn: "اختبار الربط",
    removeBrandingTitle: "إزالة شعار المنصة",
    removeBrandingDesc: 'إخفاء العلامة المائية "Powered by JustTap" في أسفل البطاقة.',
    saveProFeaturesBtn: "حفظ ونشر الميزات الخاصة",
    proFeaturesActiveOnAccount: "ميزات Pro مفعلة في حسابك",
    customizeSpecialFeatures: "تخصيص الميزات الخاصة ونشرها",

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
    noTrafficSourcesDesc: "ستظهر البيانات عندما يدخل الزوار عبر الرابط، رمز QR، أو بطاقة JustTap.",
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
    noConnectionsOverallDesc: "عندما يتبادل شخص ما معلوماته عبر بطاقتك، ستظهر بياناته هنا.",
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
    followUpStatus: "حالة المتابعة",
    privateNote: "ملاحظة خاصة",
    onlyYouCanSeeThis: "أنت فقط من يرى هذا",
    privateNotePlaceholder: "أضف ملاحظة متابعة خاصة…",
    deleteConnection: "حذف جهة الاتصال",
    deleteConnectionDialogTitle: "حذف",
    deleteConnectionDialogDesc:
      "سيؤدي هذا إلى حذف جهة الاتصال نهائياً من حسابك. لا يمكن التراجع عن هذا الإجراء.",
    proFollowUpFeaturesTitle: "ميزات المتابعة المتقدمة (Pro)",
    proFollowUpFeaturesDesc: "الملاحظات الخاصة والوسوم وحالات المتابعة متاحة حصرياً لمشتركي Pro.",
    removeTagAria: "حذف الوسم",
    exportedCsvToast: "تم تصدير جهات الاتصال كملف CSV بنجاح.",
    savedFollowUpToast: "تم حفظ تفاصيل المتابعة.",
    deleteFailedToast: "تعذّر حذف جهة الاتصال. يرجى المحاولة مجدداً.",
    saveFailedToast: "تعذّر حفظ تفاصيل المتابعة. يرجى المحاولة مجدداً.",

    // Dropzone & Status Pages
    dropzoneReplace: "اضغط أو اسحب للإفلات والاستبدال",
    dropzoneUpload: "اسحب وأفلت أو اضغط للرفع",
    cardNotExistTitle: "هذه البطاقة غير موجودة",
    cardNotExistDesc: "قد يكون الرابط أو بطاقة NFC ملغاة أو معطلة.",
    cardServiceErrorTitle: "خدمة البطاقة غير متوفرة حالياً",
    cardServiceErrorDesc: "تعذر تحميل البطاقة في الوقت الحالي. يرجى المحاولة بعد قليل.",
    pageNotFound: "الصفحة غير موجودة",
    pageNotFoundDesc: "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    pageDidntLoad: "تعذر تحميل هذه الصفحة",
    pageDidntLoadDesc: "حدث خطأ غير متوقع. يمكنك إعادة التحديث أو العودة للرئيسية.",
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
