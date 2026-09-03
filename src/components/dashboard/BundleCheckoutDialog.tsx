import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { type Card } from "@/lib/card";
import { createBundleCheckoutIntent, type BundleCheckoutResult } from "@/lib/payments/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Crown,
  Tag,
} from "lucide-react";

interface BundleCheckoutDialogProps {
  cards: Card[];
  selectedCardId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCheckoutCreated: (result: BundleCheckoutResult) => void;
}

export function BundleCheckoutDialog({
  cards,
  selectedCardId,
  isOpen,
  onClose,
  onCheckoutCreated,
}: BundleCheckoutDialogProps) {
  const { t, lang, dir } = useTranslation();

  const [targetCardId, setTargetCardId] = useState<string>(
    selectedCardId || (cards.length > 0 ? cards[0].id : ""),
  );

  const selectedCard = cards.find((c) => c.id === targetCardId) || cards[0];

  const [recipientName, setRecipientName] = useState(selectedCard?.full_name || "");
  const [recipientPhone, setRecipientPhone] = useState(selectedCard?.phone || "");
  const [nationalAddress, setNationalAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!targetCardId) {
      setErrorMessage(
        lang === "ar" ? "يرجى تحديد البطاقة الرقمية" : "Please select a digital card",
      );
      return;
    }
    if (!recipientName.trim()) {
      setErrorMessage(lang === "ar" ? "يرجى إدخال اسم المستلم" : "Recipient name is required");
      return;
    }
    if (!recipientPhone.trim()) {
      setErrorMessage(
        lang === "ar" ? "يرجى إدخال رقم هاتف المستلم" : "Recipient phone is required",
      );
      return;
    }
    if (!nationalAddress.trim()) {
      setErrorMessage(lang === "ar" ? "يرجى إدخال العنوان الوطني" : "National Address is required");
      return;
    }
    if (!city.trim()) {
      setErrorMessage(lang === "ar" ? "يرجى إدخال المدينة" : "City is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await createBundleCheckoutIntent({
        cardId: targetCardId,
        recipientName,
        recipientPhone,
        nationalAddress,
        city,
        postalCode,
        deliveryInstructions,
      });

      if (error || !data) {
        setErrorMessage(
          error || (lang === "ar" ? "فشل إنشاء طلب الباقة" : "Failed to initiate bundle checkout"),
        );
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onCheckoutCreated(data);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unexpected error");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        dir={dir}
        className="max-w-xl max-h-[90vh] overflow-y-auto bg-[#0F0F13] border-white/10 text-white p-6 sm:p-8"
      >
        <DialogHeader className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold w-fit">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>{t("pricingBundleBadge")}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-emerald-400 font-bold">{t("pricingBundleSave")}</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {t("bundleCheckoutTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            {t("bundleCheckoutDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Offer Breakdown Summary */}
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-purple-300" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-white">1 Year of JustTap Pro</div>
              <div className="text-zinc-400">
                {lang === "ar"
                  ? "تفعيل كافة ميزات Pro المتقدمة لـ 3 بطاقات رقمية"
                  : "All Pro features unlocked across up to 3 digital cards"}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 text-purple-300" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-white">1 Physical JustTap Matte NFC Card</div>
              <div className="text-zinc-400">
                {lang === "ar"
                  ? "بطاقة فيزيائية مطفية فاخرة مشمولة لمرة واحدة"
                  : "Premium physical matte NFC card (included once)"}
              </div>
            </div>
          </div>

          <div className="border-t border-purple-500/20 pt-2 text-[11px] text-purple-200/80 leading-relaxed">
            {t("bundleRenewalNotice")}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center gap-2 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Select Target Digital Card */}
          {cards.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">
                {lang === "ar"
                  ? "البطاقة الرقمية المراد ربط شريحة NFC بها"
                  : "Digital Card to Link with NFC Card"}{" "}
                *
              </Label>
              <select
                value={targetCardId}
                onChange={(e) => setTargetCardId(e.target.value)}
                className="w-full h-10 rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs text-white focus:border-purple-500 outline-none"
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.card_name || c.full_name || "Personal Card"} (/c/{c.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Shipping Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-purple-400" />
              <span>{t("shippingDetails")}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bundleRecipientName" className="text-xs text-zinc-300">
                  {t("recipientName")} *
                </Label>
                <Input
                  id="bundleRecipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Hashim Alnimari"
                  required
                  className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bundleRecipientPhone" className="text-xs text-zinc-300">
                  {t("recipientPhone")} *
                </Label>
                <Input
                  id="bundleRecipientPhone"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+966 50 123 4567"
                  required
                  className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bundleNationalAddress" className="text-xs text-zinc-300">
                {t("nationalAddress")} *
              </Label>
              <Input
                id="bundleNationalAddress"
                value={nationalAddress}
                onChange={(e) => setNationalAddress(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "RRRD2929، 2929 طريق الملك فهد..."
                    : "RRRD2929, 2929 King Fahd Rd..."
                }
                required
                className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bundleCity" className="text-xs text-zinc-300">
                  {t("shippingCity")} *
                </Label>
                <Input
                  id="bundleCity"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={
                    lang === "ar" ? "الرياض، جدة، الدمام..." : "Riyadh, Jeddah, Dammam..."
                  }
                  required
                  className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bundlePostalCode" className="text-xs text-zinc-300">
                  {t("postalCode")}
                </Label>
                <Input
                  id="bundlePostalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="12211"
                  className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bundleDeliveryInstructions" className="text-xs text-zinc-300">
                {t("deliveryInstructions")}
              </Label>
              <Textarea
                id="bundleDeliveryInstructions"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "أمام الباب، الاتصال قبل الوصول..."
                    : "Leave at front desk, call on arrival..."
                }
                rows={2}
                className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500 resize-none text-xs"
              />
            </div>
          </div>

          {/* Pricing & Financial Breakdown */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t("orderSummary")}</span>
            </h4>

            <div className="flex justify-between text-xs text-zinc-400 pt-1">
              <span>Pro Annual Plan + JustTap NFC Card</span>
              <span className="font-mono text-zinc-400 line-through">248.00 SAR</span>
            </div>

            <div className="flex justify-between text-xs text-emerald-400 font-semibold">
              <span>{t("pricingBundleSave")}</span>
              <span className="font-mono">-49.00 SAR</span>
            </div>

            <div className="border-t border-purple-500/20 pt-2 flex justify-between items-center text-sm font-bold text-white">
              <span>{t("orderTotal")}</span>
              <span className="text-xl font-mono text-purple-400">199.00 SAR</span>
            </div>
          </div>

          {/* Stage / Provider Notice */}
          <div className="p-3 rounded-lg bg-zinc-900/90 border border-white/[0.06] flex items-start gap-2.5 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{t("providerNotConnectedNotice")}</span>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto text-zinc-400 hover:text-white"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("pleaseWait")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t("placeOrder")}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
