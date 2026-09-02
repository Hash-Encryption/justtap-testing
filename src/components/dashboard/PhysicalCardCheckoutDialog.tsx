import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { type Card } from "@/lib/card";
import { DEFAULT_PHYSICAL_CARD_PRODUCT } from "@/lib/physical-cards";
import { createPhysicalCardOrder } from "@/lib/orders";
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
} from "lucide-react";

interface PhysicalCardCheckoutDialogProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: { order_id: string; order_number: string }) => void;
}

export function PhysicalCardCheckoutDialog({
  card,
  isOpen,
  onClose,
  onOrderCreated,
}: PhysicalCardCheckoutDialogProps) {
  const { t, lang, dir } = useTranslation();
  const product = DEFAULT_PHYSICAL_CARD_PRODUCT;

  const [recipientName, setRecipientName] = useState(card.full_name || "");
  const [recipientPhone, setRecipientPhone] = useState(card.phone || "");
  const [shippingAddress, setShippingAddress] = useState("");
  const [city, setCity] = useState("Riyadh");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
    if (!shippingAddress.trim()) {
      setErrorMessage(lang === "ar" ? "يرجى إدخال عنوان الشارع" : "Street address is required");
      return;
    }
    if (!city.trim()) {
      setErrorMessage(lang === "ar" ? "يرجى إدخال المدينة" : "City is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await createPhysicalCardOrder({
        cardId: card.id,
        productId: product.id,
        recipientName,
        recipientPhone,
        shippingAddress,
        city,
        postalCode,
        deliveryInstructions,
      });

      if (error || !data) {
        setErrorMessage(error || (lang === "ar" ? "فشل تقديم الطلب" : "Failed to place order"));
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onOrderCreated(data);
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
          <div className="flex items-center gap-2 text-purple-400 font-mono text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>{t("orderPhysicalCard")}</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {lang === "ar" ? product.name_ar : product.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            {lang === "ar" ? product.description_ar : product.description}
          </DialogDescription>
        </DialogHeader>

        {/* Card Snapshot Summary Box */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">
              {lang === "ar" ? "البطاقة الرقمية المرتبطة" : "Linked Digital Profile"}:
            </span>
            <span className="font-semibold text-white">
              {card.card_name || card.full_name || "Personal Card"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>Slug / URL:</span>
            <span className="text-purple-400">/c/{card.slug}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>{t("adminDigitalCardToken")}:</span>
            <span className="text-zinc-400">{card.id.slice(0, 13)}…</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center gap-2 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Shipping Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-purple-400" />
              <span>{t("shippingDetails")}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="recipientName" className="text-xs text-zinc-300">
                  {t("recipientName")} *
                </Label>
                <Input
                  id="recipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Hashim Alnimari"
                  required
                  className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recipientPhone" className="text-xs text-zinc-300">
                  {t("recipientPhone")} *
                </Label>
                <Input
                  id="recipientPhone"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+966 50 123 4567"
                  required
                  className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shippingAddress" className="text-xs text-zinc-300">
                {t("shippingAddress")} *
              </Label>
              <Input
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="King Fahd Road, Al Olaya"
                required
                className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs text-zinc-300">
                  {t("shippingCity")} *
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Riyadh, Jeddah, Dammam..."
                  required
                  className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="postalCode" className="text-xs text-zinc-300">
                  {t("postalCode")}
                </Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="12211"
                  className="bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-600 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deliveryInstructions" className="text-xs text-zinc-300">
                {t("deliveryInstructions")}
              </Label>
              <Textarea
                id="deliveryInstructions"
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
              <span>
                {t("productPrice")} ({lang === "ar" ? product.variant_ar : product.variant})
              </span>
              <span className="font-mono text-white">
                {product.price.toFixed(2)} {product.currency}
              </span>
            </div>

            <div className="flex justify-between text-xs text-zinc-400">
              <span>{t("shippingFee")}</span>
              <span className="font-medium text-emerald-400">{t("freeShipping")}</span>
            </div>

            <div className="flex justify-between text-xs text-zinc-400">
              <span>{t("taxIncluded")}</span>
              <span className="font-mono text-zinc-300">
                {(product.price * 0.15).toFixed(2)} {product.currency}
              </span>
            </div>

            <div className="border-t border-purple-500/20 pt-2 flex justify-between items-center text-sm font-bold text-white">
              <span>{t("orderTotal")}</span>
              <span className="text-lg font-mono text-purple-400">
                {product.price.toFixed(2)} {product.currency}
              </span>
            </div>
          </div>

          {/* Commerce Stage Notice */}
          <div className="p-3 rounded-lg bg-zinc-900/90 border border-white/[0.06] flex items-start gap-2.5 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              {lang === "ar"
                ? "بنية التجارة الإلكترونية للمرحلة 3: سيتم إنشاء طلب فحص واختبار معتمد ومحمي بالكامل برقم تسلسلي مخصص (JT-XXXXXX)."
                : "Testing Commerce Foundation: Your order will be securely snapshot and registered with a unique order number (JT-XXXXXX)."}
            </span>
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
