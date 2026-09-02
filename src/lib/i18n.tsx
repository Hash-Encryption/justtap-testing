import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ar";

export const translations = {
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
    changesNotPublished: "Changes not published",
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
      "This will turn your public profile into an inactive page. Note: Your physical JustTap card identity will remain completely safe and protected.",
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
    bilingualSectionHeading: "Arabic Version",
    bilingualSectionDesc: "Add the Arabic version of your card information.",
    secondaryFullName: "Arabic Name",
    secondaryJobTitle: "Arabic Job Title",
    secondaryBio: "Arabic Bio",
    placeholderFullNameEn: "Hashim Alnimari",
    placeholderJobTitleEn: "Product Designer",
    placeholderBioEn: "Brief bio about yourself…",
    placeholderFullNameAr: "هاشم النمري",
    placeholderJobTitleAr: "مصمم منتجات",
    placeholderBioAr: "نبذة تعريفية عنك…",
    fullNameRequired: "Full name is required.",
    cardLinkFormatNotice: "URL preview:",
    arFullName: "الاسم بالعربية",
    arJobTitle: "المسمى الوظيفي",
    arBio: "نبذة",

    // Editor UX Polish
    editorStatusLiveCard: "Live card",
    editorStatusSavedDraft: "Draft saved locally · Not published",
    editorStatusProPreview: "Pro Preview · Not published",
    editorStatusPreviewOnly: "Preview only · Not live",
    editorStatusReadyToPublish: "Ready to publish",
    editorStatusPublishing: "Publishing…",
    editorStatusPublished: "Published",
    appliedToPreview: "Applied to preview",
    selected: "Selected",
    undo: "Undo",
    redo: "Redo",
    sectionNavProfile: "Profile",
    sectionNavStyle: "Style",
    sectionNavColors: "Colors",
    sectionNavContact: "Contact",
    sectionNavBilingual: "Bilingual",
    proPreviewNotLiveDesc: "Pro Preview · These changes aren't live yet",
    collapseSection: "Collapse section",
    expandSection: "Expand section",

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
    specialFeaturesTitle: "Make Your Card Do More",
    cardPublishedToast: "Your digital card has been published!",

    // QR Tab
    qrHubTitle: "QR Code & Export Hub",
    qrHubSubtitle: "Export high-res QR codes, offline vCards, wallpapers, and Apple Wallet passes.",
    upgradeToPro: "Upgrade to PRO",
    qrJustTapCard: "JustTap Card",
    qrOfflineVCard: "Offline Contact",
    qrCardType: "JustTap Card",
    qrContactType: "Offline Contact",
    qrDynamicProfile: "JustTap Card",
    qrPermanentTag: "JustTap Card",
    qrDescCard: "Opens your live JustTap digital business card profile.",
    qrDescDynamic: "Opens your live JustTap digital business card profile.",
    qrDescPermanent: "Opens your live JustTap digital business card profile.",
    qrDescOffline: "Saves your contact details directly to a phone with no internet required.",
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

    // Phase 2 Pro Preview & Upgrades
    proMarker: "PRO",
    proPreviewBadge: "PRO PREVIEW",
    proActiveBadge: "PRO ACTIVE",
    proPreviewOnlyYou: "Your custom design is visible only to you.",
    proPreviewTrialHint: "Start a free 7-day trial to publish this design.",
    upgradeToPublish: "Upgrade to Publish",
    proPreviewSubtitle: "You're previewing a Pro design",
    proTrialBadgePrefix: "Pro Trial",
    dayRemaining: "day remaining",
    daysRemaining: "days remaining",
    signInToStartTrial: "Please sign in to start your free trial.",
    trialAlreadyUsedError: "You've already used your free trial. Upgrade to Pro to continue.",
    trialActiveSuccess: "Your 7-day Pro trial is active!",
    upgradeDialogTitlePublish: "Your design is ready",
    upgradeDialogTitleCreator: "Unlock Pro Custom Creator",
    upgradeDialogTitleProSave: "Save & Publish Special Features",
    upgradeDialogTitleDefault: "Start Your Free Trial",
    upgradeDialogDescPublish:
      "Start your 7-day JustTap Pro trial to publish this design and unlock all Pro features.",
    upgradeDialogDescCreator:
      "Start a free 7-day trial to publish your custom palettes, bespoke fonts, and premium finishes live to the world.",
    upgradeDialogDescProSave:
      "You're previewing Pro blocks. Start your 7-day trial to activate video intros, PDF menus, and live appointment booking on your public card.",
    upgradeDialogDescDefault:
      "Unlock video embeds, PDF downloads, Calendly appointment booking, Apple Wallet passes, and custom branding for your digital card.",
    designSummaryTitle: "Design Summary",
    fiveColorPalette: "5-Color Palette",
    fontLabel: "Font",
    finishLabel: "Finish",
    upgradeFeatureCustomCreator: "Full Custom Creator Engine & Bespoke Palettes",
    upgradeFeatureVideo: "Embedded YouTube, Loom & Vimeo Video Intros",
    upgradeFeaturePdfCalendly: "PDF Document Uploads & Live Calendly Booking",
    upgradeFeatureRemoveBranding: 'Remove "Powered by JustTap" Branding',
    start7DayTrialBtn: "Start 7-Day Free Trial",
    startingTrialBtn: "Starting trial…",
    keepEditing: "Keep Editing",
    continueDesigning: "Continue Designing",
    continueReviewing: "Continue Reviewing",
    upgradeToSaveFollowUp: "Upgrade to Save Follow-up",
    upgradeDialogTitleConnectionsSave: "Upgrade to Save Follow-up",
    upgradeDialogDescConnectionsSave:
      "Start your 7-day JustTap Pro trial to save private notes, custom tags, and follow-up pipeline statuses.",
    upgradeDialogTitleConnectionsExport: "Upgrade to Export Connections",
    upgradeDialogDescConnectionsExport:
      "Start your 7-day JustTap Pro trial to export your full connections contact list to CSV.",
    continuePreviewing: "Continue Previewing",
    upgradeToExport: "Upgrade to Export",
    upgradeDialogTitleExport: "Upgrade to Export",
    upgradeDialogDescExport:
      "Start your 7-day JustTap Pro trial to export high-resolution QR codes, custom wallpapers, and Apple Wallet passes while keeping your preview.",
    upgradeToAddWallet: "Upgrade to Add to Wallet",
    upgradeDialogTitleWallet: "Upgrade to Add to Wallet",
    upgradeDialogDescWallet:
      "Start the 7-day JustTap Pro trial to create your real Wallet pass while keeping the Wallet preview you are viewing.",
    walletPassPreviewTitle: "Apple Wallet Pass Preview",
    walletPassPreviewDesc: "Preview how your digital business card appears in Apple Wallet.",
    walletPassDigitalType: "Digital Card",
    walletPassContactType: "Contact Card",
    walletPassDownloadBtn: "Download Wallet Pass (.pkpass)",
    unlockAnalytics: "Unlock Your Analytics",
    upgradeDialogTitleAnalytics: "Unlock Your Analytics",
    upgradeDialogDescAnalytics:
      "Start the 7-day Pro trial to replace this sample preview with your real profile activity, traffic sources, actions, and conversion insights.",
    analyticsPreviewBadge: "PRO PREVIEW · SAMPLE DATA",
    analyticsPreviewDesc:
      "Explore how Pro Analytics works. These example metrics are not your real analytics.",

    // Pro Features Tab
    proBlocksBadge: "Make Your Card Do More",
    proBlocksTitle: "Make Your Card Do More",
    proBlocksDesc:
      "Add useful tools that help people watch, download, book, connect, and take action directly from your card.",
    proStatusActive: "Pro Status: Active",
    proActiveDesc: "These features can be published on your live card.",
    freePlanNotice:
      "You are previewing Pro features. You can customize them below and preview them in the simulator, but start a free 7-day trial to publish them to your live card.",
    videoIntroTitle: "Add a Video Introduction",
    videoIntroDesc:
      "Let visitors watch a short introduction, product demo, or welcome video directly from your card.",
    videoIntroPlaceholder: "https://www.youtube.com/watch?v=... or Loom / Vimeo link",
    videoIntroSupportHint:
      "Supports YouTube Shorts, YouTube Watch, Loom, Vimeo, and Google Drive video URLs.",
    videoValidLink: "Valid video link detected",
    videoUnsupportedFormat:
      "Unsupported video URL format. Please paste a valid YouTube, Loom, Vimeo, or Google Drive link.",
    videoPreviewExampleTitle: "Your introduction video",
    videoPreviewExampleBadge: "Live Video Preview",
    livePreviewBadge: "Live preview",
    exampleBadge: "Example",
    pdfDocTitle: "Share a PDF or Brochure",
    pdfDocDesc:
      "Attach a menu, brochure, catalog, portfolio, CV, or other PDF for visitors to download.",
    pdfBtnLabel: "Button Display Label",
    pdfBtnPlaceholder: "e.g. Company Brochure",
    pdfUploadLabel: "Upload PDF or Paste PDF URL",
    pdfUploadPlaceholder: "https://.../brochure.pdf",
    uploadBtn: "Upload",
    uploading: "Uploading…",
    pdfOpenAction: "Open PDF →",
    pdfDefaultLabel: "Company Brochure",
    pdfDocumentBadge: "PDF document",
    bookingTitle: "Let People Book You",
    bookingDesc:
      "Add your booking link so visitors can schedule a meeting without searching for it.",
    bookingPlaceholder: "https://calendly.com/your-name/30min",
    bookingHelperHint: "Works with Calendly, SavvyCal, TidyCal, and other scheduling tools.",
    bookingActionLabel: "Book a Meeting",
    bookingChooseTime: "Choose a time →",
    bookingLinkExample: "Your booking link",
    customCtaTitle: "Add a Main Action",
    customCtaDesc:
      "Give visitors one clear next step, such as viewing your portfolio, getting directions, making a payment, or visiting a website.",
    customCtaButtonTitle: "Button Title",
    customCtaButtonPlaceholder: "e.g. View Portfolio",
    customCtaDestinationLabel: "Destination Link",
    customCtaDestinationPlaceholder: "https://...",
    customCtaDefaultLabel: "View Portfolio",
    customCtaDefaultAction: "View Portfolio →",
    actionButtonBadge: "Action button",
    emailAlertsTitle: "New Connection Alerts",
    emailAlertsDesc:
      "Receive an email when someone shares their details with you through your card.",
    emailAlertsToggle: "Connection Alerts",
    emailAlertsDestLabel: "Notification Email",
    emailAlertsDestPlaceholder: "e.g. you@company.com",
    sendTestEmailBtn: "Send test email",
    sendingTestEmail: "Sending...",
    testEmailSentSuccess: "Test email sent to",
    testEmailEnterEmailFirst: "Please enter a Notification Email address first.",
    testEmailProRequired:
      "New connection alerts require JustTap Pro. Upgrade to enable live email delivery.",
    testEmailFailed: "Failed to send test email notification.",
    connectionAlertMockTitle: "New connection",
    connectionAlertMockBody: "Sarah shared her contact details",
    connectionAlertMockTime: "Just now",
    connectionAlertMockBadge: "Sample Alert",
    leadsInboxHint: "New connections are also saved securely in your Connections tab.",
    advancedIntegrationsTitle: "Advanced Integrations",
    webhookOptional: "Optional",
    advancedIntegrationsDesc: "Send new connection data to automation tools or your own system.",
    advancedIntegrationsToggle: "Configure Webhook",
    enableWebhookToggle: "Enable Webhook",
    webhookUrlLabel: "Webhook URL",
    webhookUrlPlaceholder: "https://hooks.zapier.com/hooks/catch/...",
    webhookHelperHint: "Works with Zapier, Make, and custom HTTP webhook endpoints.",
    testWebhookBtn: "Test Webhook",
    testingWebhook: "Testing…",
    webhookEnterUrlFirst: "Please enter a Webhook URL first.",
    webhookProRequired:
      "Webhook integrations require JustTap Pro. Upgrade to enable live webhook dispatch.",
    webhookTestSuccess: "Test payload dispatched! Status: Delivered ✓",
    webhookTestConfigured: "Test payload dispatched! Webhook configured.",
    webhookTestFailed: "Failed to trigger test webhook.",
    removeBrandingTitle: "Use Your Own Brand",
    removeBrandingDesc: 'Remove the "Powered by JustTap" footer from your public card.',
    removeBrandingToggle: "Remove JustTap Branding",
    brandBeforeLabel: "Before",
    brandBeforeVal: "Powered by JustTap",
    brandAfterLabel: "After",
    brandAfterVal: "Your card only",
    saveProFeaturesBtn: "Save & Publish Features",
    upgradeToActivateBtn: "Upgrade to Activate",
    proFeaturesActiveOnAccount: "Pro features active on your account",
    customizeSpecialFeatures: "Previewing Pro features · Not live on public card",
    proFeaturesSavedToast: "✨ Pro features saved & published live to your digital card!",
    proFeaturesSaveFailedToast: "Failed to save Pro features. Please try again.",
    publishCardFirstToast: "Please publish your card first before saving Pro features.",
    pdfValidPdfToast: "Please upload a valid PDF document.",
    pdfSizeLimitToast: "PDF file size must be less than 10MB.",
    pdfPreviewLoadedToast: "PDF preview loaded. Upgrade to Pro to host and publish documents.",
    pdfUploadedSuccessToast: "PDF document uploaded successfully!",
    pdfUploadFailedToast: "Failed to upload PDF document.",

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
      "Source data will appear when visitors enter through a Link or JustTap Card.",
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

    // Admin Operations Portal (Phase 2)
    adminTitle: "Admin Operations Portal",
    adminSubtitle: "System overview, accounts, card operations, product analytics, and audit log.",
    adminTabOverview: "Overview",
    adminTabUsers: "Client Profiles",
    adminTabCards: "Digital Cards",
    adminTabConnections: "Connections",
    adminTabAnalytics: "Analytics",
    adminTabAudit: "Audit Log",
    adminTabNfc: "NFC Operations",

    // Overview KPIs
    adminTotalUsers: "Total Registered Users",
    adminNewUsers: "New Users (Period)",
    adminActivatedUsers: "Activated Users",
    adminLiveCards: "Live Cards",
    adminInactiveCards: "Inactive Cards",
    adminConnectionsPeriod: "Connections (Period)",
    adminTrialsEndingSoon: "Trials Ending Soon (≤3d)",
    adminTierDistribution: "Tier Distribution",
    adminTierFree: "Free",
    adminTierTrial: "Trial",
    adminTierPro: "Pro",
    adminTierEnterprise: "Enterprise",
    adminActivatedFilter: "Activated",
    adminNotActivatedFilter: "Not Activated",
    adminAllFilter: "All",

    // Date Range & Search
    adminSearchPlaceholder: "Search by name, email, slug or user ID...",
    adminDateRange7d: "Last 7 Days",
    adminDateRange30d: "Last 30 Days",
    adminDateRange90d: "Last 90 Days",
    adminDateRange365d: "Last Year",

    // User Operations
    adminCreateProfileTitle: "Create Client Profile",
    adminCreateProfileBtn: "Create Profile",
    adminUserNameCol: "Name & Email",
    adminUserCardsCol: "Cards (Live/Total)",
    adminUserConnectionsCol: "Connections",
    adminUserTierCol: "Plan Tier",
    adminUserTrialCol: "Trial Status",
    adminUserCreatedCol: "Registered",
    adminUserActionsCol: "Actions",
    adminViewUserDetail: "View Details",
    adminChangeEntitlement: "Change Entitlement",
    adminDeleteProfile: "Delete Profile",
    adminNoUsersFound: "No user profiles match your search criteria.",

    // User Detail Drawer/Modal
    adminUserDetailTitle: "User Support Detail",
    adminProfileSection: "Profile Overview",
    adminUserId: "User ID",
    adminPhone: "Phone",
    adminTrialUsed: "Trial Used",
    adminYes: "Yes",
    adminNo: "No",
    adminOwnedCardsSection: "Owned Cards",
    adminNoCardsFound: "No cards owned by this user.",
    adminProductActivitySection: "Recent Product Activity",
    adminNoProductActivity: "No product activity recorded yet.",
    adminUserAuditSection: "Administrative History",
    adminNoUserAudit: "No audit records for this user.",

    // Card Operations
    adminCreateCardTitle: "Create Digital Card",
    adminCreateCardBtn: "Create Card",
    adminCardOwnerCol: "Owner",
    adminCardNameCol: "Card Name & Slug",
    adminCardTimestampsCol: "Lifecycle Timestamps",
    adminCardStatusCol: "Status",
    adminCardStatsCol: "Scans / Saves / Leads",
    adminCardNfcCol: "Active NFC Token",
    adminCardActionsCol: "Actions",
    adminToggleActiveBtn: "Toggle Active",
    adminDeleteCardBtn: "Delete Card",
    adminNoCardsMatch: "No digital cards match your search criteria.",
    adminPublishedAt: "Published",
    adminUpdatedAt: "Updated",
    adminCreatedAt: "Created",
    adminNotTrackedYet: "Not tracked yet — collection begins from this testing release.",

    // Connections Summary
    adminConnectionsTitle: "Connections Operations Summary",
    adminConnectionsTotal: "Total Connections in Selected Range",
    adminConnectionsNotice:
      "Connection messages, private notes, and visitor contact details are confidential and excluded from operations reporting.",
    adminComparisonUnavailable: "Period comparison is not tracked yet.",

    // Super Admin Analytics Tab
    adminProductAnalyticsTitle: "Analytics",
    adminAnalyticsDesc:
      "App-wide activity, user lifecycle metrics, feature engagement, and product events.",
    adminCollectionStarted: "Collection Started",
    adminDau: "Daily Active Users (DAU)",
    adminWau: "Weekly Active Users (WAU)",
    adminMau: "Monthly Active Users (MAU)",
    adminTotalEventsCount: "Events in Selected Period",
    adminAnalyticsActivityTrend: "Active User Engagement",
    adminAnalyticsBreakdownTitle: "Tier & Feature Adoption Breakdowns",
    adminAnalyticsProPreview: "Pro Preview & Upgrade Engagement",
    adminAnalyticsFeatureAdoption: "Core Feature Usage",
    adminAnalyticsGenuineUpgradeIntent: "Genuine Upgrade Intent (Paid CTAs)",
    adminAnalyticsNoUpgradeIntentYet:
      "No paid upgrade clicks recorded yet (checkout is disabled in testing).",
    adminAnalyticsNoRecentEvents: "No product events recorded in the selected period.",
    adminEventDistribution: "Event Breakdown",
    adminRecentEventsStream: "Recent Product Events",
    adminEventNameCol: "Event Name",
    adminEventFeatureCol: "Feature",
    adminEventSourceCol: "Source",
    adminEventTimeCol: "Timestamp",
    adminPublicVisitorsDisclaimer:
      "Public card visitors are tracked in card_analytics and never counted as owner product activity.",
    adminFunnelStages: "Product Funnel & Journey Stages (Event Occurrences)",
    adminStageSignup: "Account Created (Signup)",
    adminStageCardCreated: "Card Created",
    adminStageCardPublished: "Card Published",
    adminStageTrialStarted: "Trial Started",
    adminStagePaidUpgrade: "Paid Upgrade",
    adminStageUnavailableNotice:
      "Unavailable — checkout and paid billing flows are not implemented in testing.",

    // Audit Log
    adminAuditTitle: "Append-Only Administrative Audit Log",
    adminAuditTimeCol: "Timestamp",
    adminAuditActorCol: "Actor",
    adminAuditActionCol: "Action",
    adminAuditTargetCol: "Target",
    adminAuditResultCol: "Result",
    adminAuditSummaryCol: "Change Summary",
    adminNoAuditRecords: "No audit records found.",

    // NFC Operations
    adminNfcProvisionTitle: "Provision Blank NFC Tag",
    adminNfcProvisionBtn: "Provision Tag",
    adminNfcAssignTitle: "Assign NFC Tag to Card",
    adminNfcAssignBtn: "Assign",
    adminNfcReassignBtn: "Reassign",
    adminNfcTokenCol: "Token",
    adminNfcCardCol: "Assigned Card",
    adminNfcStatusCol: "Tag Status",
    adminNfcCreatedCol: "Provisioned",
    adminNfcAssignedCol: "Assigned",
    adminNfcRevokeBtn: "Revoke Tag",
    adminNfcActivateBtn: "Activate",
    adminNfcDeactivateBtn: "Deactivate",
    adminNfcRevokeWarning: "Revoking an NFC tag is permanent and cannot be undone. Are you sure?",

    // Mutation Safeguards & Modals
    adminReasonRequired: "Support / Audit Reason (Required)",
    adminReasonPlaceholder: "e.g., Customer requested plan upgrade via support ticket #123",
    adminConfirmEntitlementTitle: "Change Client Entitlement",
    adminConfirmEntitlementDesc: "Update paid plan tier. This will record an audit trail event.",
    adminConfirmCardStatusTitle: "Change Card Active State",
    adminConfirmCardStatusDesc: "Activate or deactivate public accessibility of this card.",
    adminConfirmDeleteCardTitle: "Delete Digital Card",
    adminConfirmDeleteCardDesc:
      "This will permanently remove this card. To confirm, type the exact card slug below:",
    adminConfirmDeleteCardPlaceholder: "Type card slug here",
    adminConfirmDeleteProfileTitle: "Delete Client Profile",
    adminConfirmDeleteProfileDesc:
      "This will remove the client profile row. Note: This does NOT delete the Supabase Auth account or owned cards. To confirm, type the client email below:",
    adminConfirmDeleteProfilePlaceholder: "Type client email here",
    adminMismatchError: "Confirmation value did not match.",
    adminReasonMissingError: "A short support reason is required.",

    // Authorization & Gateways
    adminAccessDeniedTitle: "Access Denied — Administrator Required",
    adminAccessDeniedDesc:
      "Your account does not have administrator privileges. Only authorized operators with role 'admin' can view this portal.",
    adminSignInRequiredTitle: "Administrator Sign-In Required",
    adminSignInRequiredDesc:
      "Please sign in with an authorized administrator account to access operations.",
    adminReturnToDashboard: "Return to User Dashboard",
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
    changesNotPublished: "تعديلات غير منشورة",
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
      "سيؤدي هذا إلى جعل ملفك العام صفحة غير مفعلة. ملاحظة: هوية بطاقة JustTap الفعلية ستبقى محمية وآمنة بالكامل.",
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
    bilingualSectionHeading: "النسخة الإنجليزية",
    bilingualSectionDesc: "أضف النسخة الإنجليزية من معلومات بطاقتك.",
    secondaryFullName: "الاسم بالإنجليزية",
    secondaryJobTitle: "المسمى الوظيفي بالإنجليزية",
    secondaryBio: "النبذة التعريفية بالإنجليزية",
    placeholderFullNameEn: "Hashim Alnimari",
    placeholderJobTitleEn: "Product Designer",
    placeholderBioEn: "Brief bio about yourself…",
    placeholderFullNameAr: "هاشم النمري",
    placeholderJobTitleAr: "مصمم منتجات",
    placeholderBioAr: "نبذة تعريفية عنك…",
    fullNameRequired: "الاسم الكامل مطلوب.",
    cardLinkFormatNotice: "الرابط بالإنجليزية:",
    arFullName: "الاسم بالعربية",
    arJobTitle: "المسمى الوظيفي بالعربية",
    arBio: "النبذة التعريفية بالعربية",

    // Editor UX Polish
    editorStatusLiveCard: "البطاقة منشورة",
    editorStatusSavedDraft: "تم حفظ المسودة محلياً · غير منشورة",
    editorStatusProPreview: "معاينة PRO · غير منشورة",
    editorStatusPreviewOnly: "معاينة فقط · غير مباشر",
    editorStatusReadyToPublish: "جاهز للنشر",
    editorStatusPublishing: "جاري النشر…",
    editorStatusPublished: "تم النشر",
    appliedToPreview: "تم التطبيق على المعاينة",
    selected: "محدد",
    undo: "تراجع",
    redo: "إعادة",
    sectionNavProfile: "الملف الشخصي",
    sectionNavStyle: "التصميم",
    sectionNavColors: "الألوان",
    sectionNavContact: "الاتصال",
    sectionNavBilingual: "ثنائي اللغة",
    proPreviewNotLiveDesc: "معاينة PRO · هذه التغييرات ليست منشورة بعد",
    collapseSection: "طي القسم",
    expandSection: "توسيع القسم",

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
    specialFeaturesTitle: "اجعل بطاقتك تقدم المزيد",
    cardPublishedToast: "تم نشر بطاقتك الرقمية بنجاح!",

    // QR Tab
    qrHubTitle: "مركز رمز QR والتصدير",
    qrHubSubtitle:
      "تصدير رموز QR عالية الدقة، بطاقات vCard دون إنترنت، خلفيات شاشة، وبطاقات Apple Wallet.",
    upgradeToPro: "الترقية إلى PRO",
    qrJustTapCard: "بطاقة JustTap",
    qrOfflineVCard: "جهة اتصال دون إنترنت",
    qrCardType: "بطاقة JustTap",
    qrContactType: "جهة اتصال دون إنترنت",
    qrDynamicProfile: "بطاقة JustTap",
    qrPermanentTag: "بطاقة JustTap",
    qrDescCard: "يفتح ملف بطاقة أعمالك الرقمية المباشرة على JustTap.",
    qrDescDynamic: "يفتح ملف بطاقة أعمالك الرقمية المباشرة على JustTap.",
    qrDescPermanent: "يفتح ملف بطاقة أعمالك الرقمية المباشرة على JustTap.",
    qrDescOffline: "يحفظ بيانات جهة الاتصال مباشرة في الهاتف دون الحاجة لاتصال بالإنترنت.",
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

    // Phase 2 Pro Preview & Upgrades
    proMarker: "PRO",
    proPreviewBadge: "معاينة PRO",
    proActiveBadge: "PRO مفعّل",
    proPreviewOnlyYou: "تصميمك المخصص مرئي لك فقط.",
    proPreviewTrialHint: "ابدأ تجربة مجانية لمدة 7 أيام لنشر هذا التصميم.",
    upgradeToPublish: "الترقية للنشر",
    proPreviewSubtitle: "أنت الآن تعاين تصميماً احترافياً (Pro)",
    proTrialBadgePrefix: "تجربة Pro",
    dayRemaining: "يوم متبقٍ",
    daysRemaining: "أيام متبقية",
    signInToStartTrial: "يرجى تسجيل الدخول لبدء التجربة المجانية.",
    trialAlreadyUsedError: "لقد استخدمت تجربتك المجانية بالفعل. قم بالترقية إلى Pro للمتابعة.",
    trialActiveSuccess: "تم تفعيل تجربة Pro المجانية لمدة 7 أيام!",
    upgradeDialogTitlePublish: "تصميمك جاهز للنشر",
    upgradeDialogTitleCreator: "افتح المصمم المخصص الاحترافي",
    upgradeDialogTitleProSave: "حفظ ونشر الميزات الخاصة",
    upgradeDialogTitleDefault: "ابدأ تجربتك المجانية",
    upgradeDialogDescPublish:
      "ابدأ تجربة JustTap Pro المجانية لمدة 7 أيام لنشر هذا التصميم وفتح جميع ميزات Pro.",
    upgradeDialogDescCreator:
      "ابدأ تجربة مجانية لمدة 7 أيام لنشر لوحات الألوان والخطوط والمظهر المخصص للعامة.",
    upgradeDialogDescProSave:
      "أنت تعاين ميزات Pro. ابدأ تجربتك لمدة 7 أيام لتفعيل مقاطع الفيديو وملفات PDF وحجز المواعيد على بطاقتك العامة.",
    upgradeDialogDescDefault:
      "افتح تضمين الفيديو، وتحميل ملفات PDF، وحجز مواعيد Calendly، وبطاقات Apple Wallet، والهوية المخصصة لبطاقتك الرقمية.",
    designSummaryTitle: "ملخص التصميم",
    fiveColorPalette: "لوحة ألوان من 5 درجات",
    fontLabel: "الخط",
    finishLabel: "المظهر",
    upgradeFeatureCustomCreator: "محرك المصمم المخصص ولوحات ألوان متكاملة",
    upgradeFeatureVideo: "تضمين فيديو تعريفي من YouTube و Loom و Vimeo",
    upgradeFeaturePdfCalendly: "رفع مستندات PDF وحجز مواعيد Calendly مباشر",
    upgradeFeatureRemoveBranding: 'إزالة شعار "Powered by JustTap"',
    start7DayTrialBtn: "ابدأ تجربة مجانية لمدة 7 أيام",
    startingTrialBtn: "جاري تفعيل التجربة…",
    keepEditing: "متابعة التعديل",
    continueDesigning: "متابعة التصميم",
    continueReviewing: "متابعة المراجعة",
    upgradeToSaveFollowUp: "ترقية لحفظ المتابعة",
    upgradeDialogTitleConnectionsSave: "ترقية لحفظ المتابعة",
    upgradeDialogDescConnectionsSave:
      "ابدأ تجربة JustTap Pro المجانية لمدة 7 أيام لحفظ الملاحظات الخاصة والوسوم وحالات المتابعة.",
    upgradeDialogTitleConnectionsExport: "ترقية لتصدير جهات الاتصال",
    upgradeDialogDescConnectionsExport:
      "ابدأ تجربة JustTap Pro المجانية لمدة 7 أيام لتصدير قائمة جهات الاتصال بالكامل إلى CSV.",
    continuePreviewing: "متابعة المعاينة",
    upgradeToExport: "ترقية للتصدير",
    upgradeDialogTitleExport: "ترقية للتصدير",
    upgradeDialogDescExport:
      "ابدأ تجربة JustTap Pro المجانية لمدة 7 أيام لتصدير رموز QR عالية الدقة وخلفيات الشاشة وبطاقات Apple Wallet مع الاحتفاظ بالمعاينة.",
    upgradeToAddWallet: "ترقية للإضافة إلى المحفظة",
    upgradeDialogTitleWallet: "ترقية للإضافة إلى المحفظة",
    upgradeDialogDescWallet:
      "ابدأ تجربة JustTap Pro المجانية لمدة 7 أيام لإنشاء بطاقة المحفظة الفعلية مع الاحتفاظ بمعاينة المحفظة التي تشاهدها.",
    walletPassPreviewTitle: "معاينة بطاقة Apple Wallet",
    walletPassPreviewDesc: "عاين كيف تظهر بطاقة أعمالك الرقمية في محفظة Apple Wallet.",
    walletPassDigitalType: "البطاقة الرقمية",
    walletPassContactType: "بطاقة جهة الاتصال",
    walletPassDownloadBtn: "تحميل بطاقة المحفظة (.pkpass)",
    unlockAnalytics: "فتح إحصائياتك",
    upgradeDialogTitleAnalytics: "فتح إحصائياتك",
    upgradeDialogDescAnalytics:
      "ابدأ تجربة JustTap Pro المجانية لمدة 7 أيام لاستبدال هذه المعاينة التوضيحية بنشاط ملفك الشخصي الحقيقي، ومصادر الزيارات، والإجراءات، ومعدل التحويل.",
    analyticsPreviewBadge: "معاينة PRO · بيانات توضيحية",
    analyticsPreviewDesc:
      "استكشف كيف تعمل إحصائيات Pro. هذه المقاييس التوضيحية ليست إحصائياتك الفعلية.",

    // Pro Features Tab
    proBlocksBadge: "اجعل بطاقتك تقدم المزيد",
    proBlocksTitle: "اجعل بطاقتك تقدم المزيد",
    proBlocksDesc:
      "أضف أدوات تفاعلية تساعد الزوار على المشاهدة، التحميل، الحجز، التواصل، واتخاذ إجراء مباشر من بطاقتك.",
    proStatusActive: "حالة الاشتراك: نشط (Pro)",
    proActiveDesc: "يمكن نشر هذه الميزات مباشرة على بطاقتك العامة.",
    freePlanNotice:
      "أنت تعاين ميزات Pro. يمكنك ضبطها ومعاينتها في المحاكي، ولن تظهر للزوار حتى تبدأ تجربة Pro مجانية لمدة 7 أيام.",
    videoIntroTitle: "إضافة فيديو تعريفي",
    videoIntroDesc:
      "دع الزوار يشاهدون فيديو تعريفي قصير، عرض للمنتج، أو رسالة ترحيبية مباشرة من بطاقتك.",
    videoIntroPlaceholder: "رابط YouTube أو Loom أو Vimeo",
    videoIntroSupportHint: "يدعم روابط YouTube و Shorts و Loom و Vimeo و Google Drive.",
    videoValidLink: "تم التحقق من رابط الفيديو بنجاح",
    videoUnsupportedFormat:
      "صيغة الفيديو غير مدعومة. يرجى إدخال رابط صالح من YouTube أو Loom أو Vimeo أو Google Drive.",
    videoPreviewExampleTitle: "الفيديو التعريفي الخاص بك",
    videoPreviewExampleBadge: "معاينة الفيديو",
    livePreviewBadge: "معاينة مباشرة",
    exampleBadge: "مثال توضيحي",
    pdfDocTitle: "مشاركة ملف PDF أو بروشور",
    pdfDocDesc:
      "أرفق قائمة طعام، بروشور الشركة، كتالوج، معرض أعمال، سيرة ذاتية، أو أي ملف PDF ليقوم الزوار بتحميله.",
    pdfBtnLabel: "عنوان زر التحميل",
    pdfBtnPlaceholder: "مثال: بروشور الشركة",
    pdfUploadLabel: "رفع ملف PDF أو لصق الرابط",
    pdfUploadPlaceholder: "https://.../brochure.pdf",
    uploadBtn: "رفع ملف",
    uploading: "جاري الرفع…",
    pdfOpenAction: "فتح ملف PDF ←",
    pdfDefaultLabel: "بروشور الشركة",
    pdfDocumentBadge: "مستند PDF",
    bookingTitle: "تمكين حجز المواعيد",
    bookingDesc: "أضف رابط الحجز الخاص بك ليتمكن الزوار من جدولة موعد معك بسهولة.",
    bookingPlaceholder: "https://calendly.com/your-name/30min",
    bookingHelperHint: "متوافق مع Calendly و SavvyCal و TidyCal وأدوات الجدولة الأخرى.",
    bookingActionLabel: "حجز موعد",
    bookingChooseTime: "اختر موعداً ←",
    bookingLinkExample: "رابط الحجز الخاص بك",
    customCtaTitle: "إضافة زر إجراء رئيسي",
    customCtaDesc:
      "امنح الزوار خطوة تالية واضحة، مثل استعراض أعمالك، معرفة الموقع، الدفع الإلكتروني، أو زيارة موقعك.",
    customCtaButtonTitle: "عنوان الزر",
    customCtaButtonPlaceholder: "مثال: استعراض الأعمال",
    customCtaDestinationLabel: "رابط التوجيه",
    customCtaDestinationPlaceholder: "https://...",
    customCtaDefaultLabel: "استعراض الأعمال",
    customCtaDefaultAction: "استعراض الأعمال ←",
    actionButtonBadge: "زر الإجراء",
    emailAlertsTitle: "تنبيهات جهات الاتصال الجديدة",
    emailAlertsDesc: "استلم بريداً إلكترونياً عند مشاركة أي شخص لبيانات تواصله عبر بطاقتك.",
    emailAlertsToggle: "تنبيهات التواصل",
    emailAlertsDestLabel: "البريد الإلكتروني للإشعارات",
    emailAlertsDestPlaceholder: "مثال: you@company.com",
    sendTestEmailBtn: "إرسال بريد تجريبي",
    sendingTestEmail: "جاري الإرسال…",
    testEmailSentSuccess: "تم إرسال البريد التجريبي إلى",
    testEmailEnterEmailFirst: "يرجى إدخال عنوان البريد الإلكتروني للإشعارات أولاً.",
    testEmailProRequired:
      "تتطلب تنبيهات جهات الاتصال باقة JustTap Pro. قم بالترقية لتفعيل الإشعارات الحية.",
    testEmailFailed: "تعذر إرسال البريد التجريبي.",
    connectionAlertMockTitle: "جهة اتصال جديدة",
    connectionAlertMockBody: "شاركت سارة بيانات التواصل الخاصة بها",
    connectionAlertMockTime: "الآن",
    connectionAlertMockBadge: "تنبيه توضيحي",
    leadsInboxHint: "يتم حفظ جهات الاتصال الجديدة بشكل آمن في تبويب جهات الاتصال.",
    advancedIntegrationsTitle: "التكاملات المتقدمة",
    webhookOptional: "اختياري",
    advancedIntegrationsDesc: "إرسال بيانات التواصل الجديدة إلى أدوات الأتمتة أو نظامك الخاص.",
    advancedIntegrationsToggle: "إعداد Webhook",
    enableWebhookToggle: "تفعيل Webhook",
    webhookUrlLabel: "رابط Webhook",
    webhookUrlPlaceholder: "https://hooks.zapier.com/hooks/catch/...",
    webhookHelperHint: "يعمل مع Zapier و Make وأي نقاط نهاية HTTP مخصصة.",
    testWebhookBtn: "اختبار الربط",
    testingWebhook: "جاري الاختبار…",
    webhookEnterUrlFirst: "يرجى إدخال رابط Webhook أولاً.",
    webhookProRequired: "يتطلب ربط Webhook باقة JustTap Pro. قم بالترقية لتفعيل الربط المباشر.",
    webhookTestSuccess: "تم إرسال البيانات التجريبية بنجاح! الحالة: تم التسليم ✓",
    webhookTestConfigured: "تم إرسال البيانات التجريبية! تم ضبط الـ Webhook.",
    webhookTestFailed: "تعذر اختبار الـ Webhook.",
    removeBrandingTitle: "استخدام هويتك الخاصة",
    removeBrandingDesc: 'إزالة شريط "Powered by JustTap" من أسفل بطاقتك العامة.',
    removeBrandingToggle: "إخفاء شعار JustTap",
    brandBeforeLabel: "قبل",
    brandBeforeVal: "مدعوم من JustTap",
    brandAfterLabel: "بعد",
    brandAfterVal: "بطاقتك فقط",
    saveProFeaturesBtn: "حفظ ونشر الميزات",
    upgradeToActivateBtn: "ترقية للتفعيل",
    proFeaturesActiveOnAccount: "ميزات Pro نشطة في حسابك",
    customizeSpecialFeatures: "معاينة ميزات Pro · غير نشطة على البطاقة العامة",
    proFeaturesSavedToast: "✨ تم حفظ ميزات Pro ونشرها على بطاقتك بنجاح!",
    proFeaturesSaveFailedToast: "تعذر حفظ ميزات Pro. يرجى المحاولة مرة أخرى.",
    publishCardFirstToast: "يرجى نشر بطاقتك أولاً قبل حفظ ميزات Pro.",
    pdfValidPdfToast: "يرجى رفع ملف PDF صالح.",
    pdfSizeLimitToast: "يجب ألا يتجاوز حجم ملف الـ PDF 10 ميغابايت.",
    pdfPreviewLoadedToast: "تم تحميل معاينة الـ PDF. قم بالترقية لاستضافة المستندات ونشرها.",
    pdfUploadedSuccessToast: "تم رفع ملف الـ PDF بنجاح!",
    pdfUploadFailedToast: "تعذر رفع ملف الـ PDF.",

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
    noTrafficSourcesDesc: "ستظهر البيانات عندما يدخل الزوار عبر الرابط أو بطاقة JustTap.",
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

    // Admin Operations Portal (Phase 2)
    adminTitle: "بوابة العمليات والإدارة",
    adminSubtitle: "نظرة عامة على النظام، الحسابات، عمليات البطاقات، تحليلات المنتج، وسجل التدقيق.",
    adminTabOverview: "نظرة عامة",
    adminTabUsers: "ملفات العملاء",
    adminTabCards: "البطاقات الرقمية",
    adminTabConnections: "جهات الاتصال",
    adminTabAnalytics: "التحليلات",
    adminTabAudit: "سجل التدقيق",
    adminTabNfc: "عمليات NFC",

    // Overview KPIs
    adminTotalUsers: "إجمالي المستخدمين المسجلين",
    adminNewUsers: "مستخدمون جدد (خلال الفترة)",
    adminActivatedUsers: "المستخدمون النشطون",
    adminLiveCards: "بطاقات منشورة ونشطة",
    adminInactiveCards: "بطاقات غير نشطة",
    adminConnectionsPeriod: "جهات الاتصال (خلال الفترة)",
    adminTrialsEndingSoon: "فترات تجريبية تنتهي قريباً (≤3 أيام)",
    adminTierDistribution: "توزيع الباقات",
    adminTierFree: "مجاني",
    adminTierTrial: "تجريبي",
    adminTierPro: "احترافي (Pro)",
    adminTierEnterprise: "مؤسسات",
    adminActivatedFilter: "نشط",
    adminNotActivatedFilter: "غير نشط",
    adminAllFilter: "الكل",

    // Date Range & Search
    adminSearchPlaceholder: "البحث بالاسم، البريد، المعرف أو كود المستخدم...",
    adminDateRange7d: "آخر 7 أيام",
    adminDateRange30d: "آخر 30 يوماً",
    adminDateRange90d: "آخر 90 يوماً",
    adminDateRange365d: "آخر سنة",

    // User Operations
    adminCreateProfileTitle: "إنشاء ملف عميل جديد",
    adminCreateProfileBtn: "إنشاء الملف",
    adminUserNameCol: "الاسم والبريد",
    adminUserCardsCol: "البطاقات (النشطة/الإجمالي)",
    adminUserConnectionsCol: "جهات الاتصال",
    adminUserTierCol: "الباقة",
    adminUserTrialCol: "حالة التجربة",
    adminUserCreatedCol: "تاريخ التسجيل",
    adminUserActionsCol: "الإجراءات",
    adminViewUserDetail: "عرض التفاصيل",
    adminChangeEntitlement: "تعديل الباقة",
    adminDeleteProfile: "حذف ملف العميل",
    adminNoUsersFound: "لا توجد ملفات عملاء مطابقة لمعايير البحث.",

    // User Detail Drawer/Modal
    adminUserDetailTitle: "تفاصيل دعم المستخدم",
    adminProfileSection: "نظرة عامة على الملف",
    adminUserId: "معرف المستخدم",
    adminPhone: "الهاتف",
    adminTrialUsed: "تم استخدام التجربة",
    adminYes: "نعم",
    adminNo: "لا",
    adminOwnedCardsSection: "البطاقات المملوكة",
    adminNoCardsFound: "لا توجد بطاقات مملوكة لهذا المستخدم.",
    adminProductActivitySection: "نشاط المنتج الأخير",
    adminNoProductActivity: "لم يتم تسجيل أي نشاط للمنتج حتى الآن.",
    adminUserAuditSection: "سجل التدقيق الإداري",
    adminNoUserAudit: "لا توجد سجلات تدقيق لهذا المستخدم.",

    // Card Operations
    adminCreateCardTitle: "إنشاء بطاقة رقمية",
    adminCreateCardBtn: "إنشاء البطاقة",
    adminCardOwnerCol: "المالك",
    adminCardNameCol: "اسم البطاقة والرابط",
    adminCardTimestampsCol: "التواريخ ومراحل النشر",
    adminCardStatusCol: "الحالة",
    adminCardStatsCol: "المشاهدات / الحفظ / العملاء",
    adminCardNfcCol: "رمز NFC النشط",
    adminCardActionsCol: "الإجراءات",
    adminToggleActiveBtn: "تبديل الحالة",
    adminDeleteCardBtn: "حذف البطاقة",
    adminNoCardsMatch: "لا توجد بطاقات رقمية مطابقة للبحث.",
    adminPublishedAt: "تاريخ النشر",
    adminUpdatedAt: "آخر تحديث",
    adminCreatedAt: "تاريخ الإنشاء",
    adminNotTrackedYet: "لم يتم التتبع بعد — تبدأ المجموعة من إصدار الاختبار هذا.",

    // Connections Summary
    adminConnectionsTitle: "ملخص عمليات جهات الاتصال",
    adminConnectionsTotal: "إجمالي جهات الاتصال في الفترة المحددة",
    adminConnectionsNotice:
      "رسائل جهات الاتصال والملاحظات الشخصية للزوار سرية ومستبعدة من تقارير العمليات.",
    adminComparisonUnavailable: "المقارنة مع الفترة السابقة غير متتبعة بعد.",

    // Super Admin Analytics Tab
    adminProductAnalyticsTitle: "التحليلات",
    adminAnalyticsDesc:
      "النشاط على مستوى التطبيق، مقاييس دورة حياة المستخدم، تفاعل الميزات، وأحداث المنتج.",
    adminCollectionStarted: "بدء جمع البيانات",
    adminDau: "المستخدمون النشطون يومياً (DAU)",
    adminWau: "المستخدمون النشطون أسبوعياً (WAU)",
    adminMau: "المستخدمون النشطون شهرياً (MAU)",
    adminTotalEventsCount: "الأحداث في الفترة المحددة",
    adminAnalyticsActivityTrend: "تفاعل المستخدمين النشطين",
    adminAnalyticsBreakdownTitle: "تفاصيل الاشتراكات وتفاعل الميزات",
    adminAnalyticsProPreview: "معاينة Pro والتفاعل مع الترقية",
    adminAnalyticsFeatureAdoption: "استخدام الميزات الأساسية",
    adminAnalyticsGenuineUpgradeIntent: "نية الترقية الفعلية (أزرار الترقية المدفوعة)",
    adminAnalyticsNoUpgradeIntentYet:
      "لم يتم تسجيل أي نقرات ترقية مدفوعة بعد (الدفع معطل في بيئة الاختبار).",
    adminAnalyticsNoRecentEvents: "لم يتم تسجيل أي أحداث منتج خلال الفترة المحددة.",
    adminEventDistribution: "تفصيل الأحداث",
    adminRecentEventsStream: "أحدث أحداث المنتج",
    adminEventNameCol: "اسم الحدث",
    adminEventFeatureCol: "الميزة",
    adminEventSourceCol: "المصدر",
    adminEventTimeCol: "الوقت",
    adminPublicVisitorsDisclaimer:
      "يتم تتبع زوار البطاقات العامة في تحليلات البطاقة ولا يتم احتسابهم أبداً كنشاط منتج للمالك.",
    adminFunnelStages: "مسار ومراحل تجربة المنتج (تكرارات الأحداث)",
    adminStageSignup: "إنشاء الحساب",
    adminStageCardCreated: "إنشاء البطاقة",
    adminStageCardPublished: "نشر البطاقة",
    adminStageTrialStarted: "بدء التجربة المجانية",
    adminStagePaidUpgrade: "الترقية المدفوعة",
    adminStageUnavailableNotice:
      "غير متاح — مسارات الدفع والترقية المدفوعة غير مطبقة في بيئة الاختبار.",

    // Audit Log
    adminAuditTitle: "سجل التدقيق الإداري غير القابل للتعديل",
    adminAuditTimeCol: "الوقت",
    adminAuditActorCol: "المسؤول",
    adminAuditActionCol: "الإجراء",
    adminAuditTargetCol: "الهدف",
    adminAuditResultCol: "النتيجة",
    adminAuditSummaryCol: "ملخص التغيير",
    adminNoAuditRecords: "لا توجد سجلات تدقيق.",

    // NFC Operations
    adminNfcProvisionTitle: "تهيئة شريحة NFC فارغة",
    adminNfcProvisionBtn: "تهيئة الشريحة",
    adminNfcAssignTitle: "ربط شريحة NFC ببطاقة",
    adminNfcAssignBtn: "ربط",
    adminNfcReassignBtn: "إعادة الربط",
    adminNfcTokenCol: "الرمز",
    adminNfcCardCol: "البطاقة المرتبطة",
    adminNfcStatusCol: "حالة الشريحة",
    adminNfcCreatedCol: "تاريخ التهيئة",
    adminNfcAssignedCol: "تاريخ الربط",
    adminNfcRevokeBtn: "إلغاء الشريحة",
    adminNfcActivateBtn: "تفعيل",
    adminNfcDeactivateBtn: "تعطيل",
    adminNfcRevokeWarning: "إلغاء شريحة NFC إجراء نهائي ولا يمكن التراجع عنه. هل أنت متأكد؟",

    // Mutation Safeguards & Modals
    adminReasonRequired: "سبب الإجراء للتدقيق (مطلوب)",
    adminReasonPlaceholder: "مثال: طلب العميل ترقية الباقة عبر تذكرة الدعم #123",
    adminConfirmEntitlementTitle: "تعديل باقة العميل",
    adminConfirmEntitlementDesc: "تحديث باقة العميل. سيتم تسجيل هذا الإجراء في سجل التدقيق.",
    adminConfirmCardStatusTitle: "تغيير حالة نشاط البطاقة",
    adminConfirmCardStatusDesc: "تفعيل أو تعطيل إمكانية الوصول العام لهذه البطاقة.",
    adminConfirmDeleteCardTitle: "حذف البطاقة الرقمية",
    adminConfirmDeleteCardDesc:
      "سيتم حذف هذه البطاقة نهائياً. للتأكيد، يرجى كتابة الرابط المختصر للبطاقة أدناه:",
    adminConfirmDeleteCardPlaceholder: "اكتب الرابط المختصر للبطاقة هنا",
    adminConfirmDeleteProfileTitle: "حذف ملف العميل",
    adminConfirmDeleteProfileDesc:
      "سيتم حذف سجل ملف العميل. ملاحظة: هذا الإجراء لا يحذف حساب المصادقة (Auth) ولا البطاقات المملوكة. للتأكيد، يرجى كتابة بريد العميل أدناه:",
    adminConfirmDeleteProfilePlaceholder: "اكتب بريد العميل هنا",
    adminMismatchError: "قيمة التأكيد غير متطابقة.",
    adminReasonMissingError: "يلزم تقديم سبب مختصر للإجراء.",

    // Authorization & Gateways
    adminAccessDeniedTitle: "تم رفض الوصول — مطلوب تصريح مسؤول",
    adminAccessDeniedDesc:
      "حسابك الحالي لا يمتلك صلاحيات المسؤول. فقط المشغلون المعتمدون بدور 'admin' يمكنهم الوصول لهذه البوابة.",
    adminSignInRequiredTitle: "تسجيل الدخول كمسؤول مطلوب",
    adminSignInRequiredDesc: "يرجى تسجيل الدخول باستخدام حساب مسؤول معتمد للوصول إلى العمليات.",
    adminReturnToDashboard: "العودة إلى لوحة التحكم",
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

export function LanguageProvider({
  children,
  defaultLang,
}: {
  children: React.ReactNode;
  defaultLang?: Language;
}) {
  const [lang, setLangState] = useState<Language>(() => {
    if (defaultLang === "en" || defaultLang === "ar") return defaultLang;
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
    return {
      lang: "en" as Language,
      setLang: () => {},
      toggleLang: () => {},
      t: (key: keyof Translations): string => translations.en[key] || String(key),
      dir: "ltr" as const,
    };
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
