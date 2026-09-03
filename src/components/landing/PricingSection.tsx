import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n";
import { getPublicCommercialCatalog, FALLBACK_COMMERCIAL_CATALOG } from "@/lib/payments/catalog";
import type { CommercialCatalogData } from "@/lib/payments/types";
import { Check, Sparkles, Crown, Tag, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PricingSection() {
  const { t, lang, dir } = useTranslation();
  const [catalog, setCatalog] = useState<CommercialCatalogData>(FALLBACK_COMMERCIAL_CATALOG);

  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      const { data } = await getPublicCommercialCatalog();
      if (isMounted && data) {
        setCatalog(data);
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const proPlan = catalog.plans.find((p) => p.code === "pro");
  const proPrice = catalog.prices.find((p) => p.plan_id === "pro");
  const bundleOffer = catalog.offers.find((o) => o.code === "pro_nfc_bundle");
  const nfcProduct = catalog.products[0];

  const proPriceDisplay = proPrice ? `${proPrice.amount_minor / 100} SAR` : "99 SAR";
  const nfcPriceDisplay = nfcProduct ? `${nfcProduct.price} SAR` : "149 SAR";
  const bundlePriceDisplay = bundleOffer ? `${bundleOffer.amount_minor / 100} SAR` : "199 SAR";
  const bundleSavingsDisplay = bundleOffer
    ? `${bundleOffer.savings_amount_minor / 100} SAR`
    : "49 SAR";

  return (
    <section
      id="pricing"
      dir={dir}
      className="max-w-7xl mx-auto px-4 sm:px-6 py-20 space-y-12 relative"
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-purple-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="text-center space-y-3 relative z-10 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-bold text-purple-300">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>{lang === "ar" ? "الأسعار والباقات" : "Commercial Pricing"}</span>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          {t("pricingTitle")}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">{t("pricingSubtitle")}</p>
      </div>

      {/* 3 Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch relative z-10">
        {/* CARD 1: PRO ANNUAL */}
        <div className="justtap-glass-card rounded-3xl p-8 flex flex-col justify-between border border-border/80 bg-card/60 backdrop-blur-xl relative hover:border-purple-500/30 transition-all">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                {lang === "ar" ? "اشتراك سنوي" : "Annual Subscription"}
              </span>
            </div>

            <div>
              <h3 className="font-display text-2xl font-bold text-foreground">
                {t("pricingProTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{t("pricingProDesc")}</p>
            </div>

            <div className="pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight font-mono">
                  {lang === "ar" ? "99" : "99"}
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {lang === "ar" ? "ر.س" : "SAR"}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("pricingProInterval")}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {lang === "ar"
                  ? "تجديد سنوي تلقائي بقيمة 99 ر.س"
                  : "Billed annually at 99 SAR/year"}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {lang === "ar" ? "ما يتضمنه الاشتراك:" : "Includes:"}
              </div>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar" ? "إدارة حتى 3 بطاقات رقمية" : "Up to 3 digital business cards"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar"
                      ? "محرك Custom Creator والألوان الخاصة"
                      : "Custom Creator Design Engine"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar"
                      ? "إزالة شعار JustTap من البطاقة"
                      : 'Remove "Powered by JustTap"'}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar"
                      ? "الفيديو، ملف PDF، وحجز المواعيد"
                      : "Video intro, PDF brochure & Booking"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar"
                      ? "تصدير بطاقة Apple Wallet (.pkpass)"
                      : "Apple Wallet digital passes"}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8">
            <Link to="/auth" className="w-full block">
              <Button className="w-full py-6 rounded-2xl bg-card hover:bg-secondary border border-border text-foreground font-bold text-xs flex items-center justify-center gap-2 transition-all">
                <span>{t("pricingCtaPro")}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </Link>
          </div>
        </div>

        {/* CARD 2: NFC CARD STANDALONE */}
        <div className="justtap-glass-card rounded-3xl p-8 flex flex-col justify-between border border-border/80 bg-card/60 backdrop-blur-xl relative hover:border-purple-500/30 transition-all">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#E6D5AC]/10 border border-[#E6D5AC]/30 text-[#E6D5AC] flex items-center justify-center">
                <Tag className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                {lang === "ar" ? "تدفع لمرة واحدة" : "One-Time"}
              </span>
            </div>

            <div>
              <h3 className="font-display text-2xl font-bold text-foreground">
                {t("pricingNfcTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{t("pricingNfcDesc")}</p>
            </div>

            <div className="pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight font-mono">
                  {lang === "ar" ? "149" : "149"}
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {lang === "ar" ? "ر.س" : "SAR"}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("pricingNfcInterval")}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {lang === "ar"
                  ? "شحن لجميع مدن المملكة بالعنوان الوطني"
                  : "Saudi National Address delivery"}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {lang === "ar" ? "مواصفات البطاقة:" : "Card Features:"}
              </div>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar"
                      ? "شريحة NFC عالية التردد مدمجة"
                      : "Embedded high-frequency NFC chip"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar"
                      ? "مظهر أسود مطفي فاخر ومقاوم للماء"
                      : "Premium Matte Black PVC finish"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar"
                      ? "رمز QR مطبوع بدقة عالية للشاشات القديمة"
                      : "Laser-sharp QR code printed on back"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar"
                      ? "ربط وإعادة تعيين فوري لأي بطاقة رقمية"
                      : "Instant dynamic linking to your card"}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8">
            <Link to="/auth" className="w-full block">
              <Button className="w-full py-6 rounded-2xl bg-card hover:bg-secondary border border-border text-foreground font-bold text-xs flex items-center justify-center gap-2 transition-all">
                <span>{t("pricingCtaNfc")}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </Link>
          </div>
        </div>

        {/* CARD 3: BUNDLE (FEATURED / BEST VALUE) */}
        <div className="rounded-3xl p-8 flex flex-col justify-between border-2 border-purple-500/80 bg-gradient-to-b from-[#181126] to-[#0E0B16] shadow-2xl shadow-purple-950/40 relative scale-[1.02] hover:scale-[1.03] transition-all">
          {/* Best Value Badge */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[11px] shadow-lg shadow-purple-900/50 flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("pricingBundleBadge")}</span>
          </div>

          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-3 py-1 rounded-full">
                {t("pricingBundleSave")} (49 SAR)
              </span>
            </div>

            <div>
              <h3 className="font-display text-2xl font-bold text-white">
                {t("pricingBundleTitle")}
              </h3>
              <p className="text-xs text-purple-200/80 mt-1">{t("pricingBundleDesc")}</p>
            </div>

            <div className="pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono">
                  {lang === "ar" ? "199" : "199"}
                </span>
                <span className="text-lg font-semibold text-white">
                  {lang === "ar" ? "ر.س" : "SAR"}
                </span>
                <span className="text-xs text-purple-300 font-medium">
                  {lang === "ar" ? "عرض أولي" : "initial offer"}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
                <span className="line-through">248 SAR</span>
                <span className="text-emerald-400 font-bold">199 SAR</span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3 pt-4 border-t border-purple-500/20">
              <div className="text-xs font-semibold text-purple-200 uppercase tracking-wider">
                {lang === "ar" ? "المجموعة المتكاملة تشمل:" : "The Full Suite Includes:"}
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">
                    {lang === "ar"
                      ? "1 سنة اشتراك كامل في باقة JustTap Pro (بقيمة 99 ر.س)"
                      : "1 Year of JustTap Pro Subscription (99 SAR value)"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">
                    {lang === "ar"
                      ? "1 بطاقة JustTap فيزيائية ذكية NFC (بقيمة 149 ر.س)"
                      : "1 Physical JustTap Matte NFC Card (149 SAR value)"}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === "ar"
                      ? "توفير فوري 49 ر.س مقارنة بالشراء المنفصل"
                      : "Instant 49 SAR savings vs separate purchase"}
                  </span>
                </li>
              </ul>
            </div>

            {/* Permanent Renewal Clarification */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-purple-500/20 text-[11px] text-purple-200/90 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>{t("pricingBundleRenewalCopy")}</span>
            </div>
          </div>

          <div className="pt-8">
            <Link to="/auth" className="w-full block">
              <Button className="w-full py-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-purple-900/30 transition-all hover:scale-[1.02]">
                <span>{t("pricingCtaBundle")}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Free Option Discoverability & Enterprise Contact */}
      <div className="text-center pt-6 space-y-3 relative z-10">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("pricingFreePrompt")}{" "}
          <Link
            to="/auth"
            className="text-primary hover:text-purple-400 font-bold underline underline-offset-4 ml-1"
          >
            {t("pricingFreeLink")}
          </Link>
        </p>
      </div>
    </section>
  );
}
