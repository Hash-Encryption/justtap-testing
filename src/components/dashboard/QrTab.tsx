import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Crown, Download, Lock, QrCode, Smartphone, Sparkles, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";
import { buildVCard, type Card } from "@/lib/card";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";
import { isProEntitled } from "@/lib/card-design";
import type { Session } from "@supabase/supabase-js";
import { ProUpgradeDialog, type ProUpgradeSource } from "./ProUpgradeDialog";

interface QrTabProps {
  card: Card;
  session?: Session | null;
  onTrialStarted?: (trialEndsAt: Date) => void;
  onUpgradeRequest?: () => void;
}

export function QrTab({ card, session, onTrialStarted, onUpgradeRequest }: QrTabProps) {
  const { t, lang } = useTranslation();
  const [profileQrUrl, setProfileQrUrl] = useState<string>("");
  const [offlineQrUrl, setOfflineQrUrl] = useState<string>("");
  const [permanentQrUrl, setPermanentQrUrl] = useState<string>("");
  const [permanentToken, setPermanentToken] = useState<string | null>(null);
  const [activeQr, setActiveQr] = useState<"profile" | "offline" | "permanent">("profile");
  const [activePassType, setActivePassType] = useState<"digital" | "contact">("digital");
  const [upgradeOpen, setUpgradeOpen] = useState<boolean>(false);
  const [upgradeSource, setUpgradeSource] = useState<ProUpgradeSource>("qr_export");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://justtap.app";

  const cardProfileUrl = `${appUrl}/c/${card.slug}?jt_entry=profile_qr`;
  const offlineVCardData = buildVCard(card);
  const isPro = isProEntitled(card);

  // Fetch assigned permanent tag token if exists via customer-safe RPC
  useEffect(() => {
    let cancelled = false;
    async function fetchAssignedTag() {
      if (!card.id) return;
      try {
        const { data } = await supabase.rpc("get_customer_card_tag", { _card_id: card.id });
        if (!cancelled && data && data.length > 0) {
          const tag = data[0];
          if (tag?.token && tag?.status === "active") {
            setPermanentToken(tag.token);
          }
        }
      } catch {
        /* ignore */
      }
    }
    void fetchAssignedTag();
    return () => {
      cancelled = true;
    };
  }, [card.id]);

  useEffect(() => {
    QRCode.toDataURL(cardProfileUrl, { margin: 1, width: 400 }, (err, url) => {
      if (!err && url) setProfileQrUrl(url);
    });
    QRCode.toDataURL(offlineVCardData, { margin: 1, width: 400 }, (err, url) => {
      if (!err && url) setOfflineQrUrl(url);
    });
    if (permanentToken) {
      const permUrl = `${appUrl}/t/${permanentToken}`;
      QRCode.toDataURL(permUrl, { margin: 1, width: 400 }, (err, url) => {
        if (!err && url) setPermanentQrUrl(url);
      });
    }
  }, [cardProfileUrl, offlineVCardData, permanentToken, appUrl]);

  const activeQrUrl =
    activeQr === "profile"
      ? profileQrUrl
      : activeQr === "permanent" && permanentQrUrl
        ? permanentQrUrl
        : offlineQrUrl;

  const handleDownloadHighResQr = async (type: "profile" | "offline" | "permanent") => {
    if (!isPro) {
      setUpgradeSource("qr_export");
      setUpgradeOpen(true);
      onUpgradeRequest?.();
      return;
    }
    const dataToEncode =
      type === "profile"
        ? cardProfileUrl
        : type === "permanent" && permanentToken
          ? `${appUrl}/t/${permanentToken}`
          : offlineVCardData;

    try {
      const highResDataUrl = await QRCode.toDataURL(dataToEncode, { margin: 2, width: 2000 });
      const link = document.createElement("a");
      link.href = highResDataUrl;
      link.download = `JustTap_QR_${type}_${card.slug}_2000px.png`;
      link.click();
    } catch (err) {
      console.error("High res QR error:", err);
    }
  };

  // Lockscreen Wallpaper Canvas Export (1080x1920)
  const handleGenerateWallpaper = async () => {
    if (!isPro) {
      setUpgradeSource("qr_export");
      setUpgradeOpen(true);
      onUpgradeRequest?.();
      return;
    }

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, "#08080A");
    grad.addColorStop(0.5, "#121216");
    grad.addColorStop(1, "#4C1D95");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glow
    const glowGrad = ctx.createRadialGradient(540, 450, 50, 540, 450, 400);
    glowGrad.addColorStop(0, "rgba(107, 33, 168, 0.35)");
    glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, 1080, 900);

    // Container box
    const boxX = 90;
    const boxY = 280;
    const boxW = 900;
    const boxH = 1360;

    ctx.save();
    ctx.fillStyle = "rgba(18, 18, 22, 0.85)";
    ctx.strokeStyle = "rgba(230, 213, 172, 0.2)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 60);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const displayName = lang === "ar" && card.full_name_ar ? card.full_name_ar : card.full_name;
    const displayTitle =
      lang === "ar" && card.title_ar ? card.title_ar : card.title || card.company || "";

    ctx.textAlign = "center";
    ctx.font = "bold 56px Outfit, sans-serif";
    ctx.fillStyle = "#FAFAFA";
    ctx.fillText(displayName, 540, 420);

    if (displayTitle) {
      ctx.font = "500 36px sans-serif";
      ctx.fillStyle = "#E6D5AC";
      ctx.fillText(displayTitle, 540, 485);
    }

    if (card.phone) {
      ctx.font = "400 30px sans-serif";
      ctx.fillStyle = "#A1A1AA";
      ctx.fillText(card.phone, 540, 540);
    }

    try {
      const qrDataUrl = await QRCode.toDataURL(offlineVCardData, { margin: 2, width: 600 });
      const img = new Image();
      img.onload = () => {
        const qrSize = 520;
        const qrX = (1080 - qrSize) / 2;
        const qrY = 640;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 40);
        ctx.fill();

        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        ctx.font = "bold 28px sans-serif";
        ctx.fillStyle = "#FAFAFA";
        ctx.fillText(
          lang === "ar" ? "امسح الكود لحفظ جهة الاتصال" : "SCAN FOR CONTACT INFO",
          540,
          1260,
        );

        ctx.font = "400 24px sans-serif";
        ctx.fillStyle = "#A1A1AA";
        ctx.fillText(
          lang === "ar"
            ? "يعمل دون الحاجة لاتصال بالإنترنت"
            : "Works offline without internet connection",
          540,
          1305,
        );

        ctx.font = "extrabold 32px sans-serif";
        ctx.fillStyle = "#6B21A8";
        ctx.fillText("JustTap Digital Business Card", 540, 1530);

        const wallpaperUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = wallpaperUrl;
        link.download = `JustTap_Wallpaper_${card.slug}.png`;
        link.click();
      };
      img.src = qrDataUrl;
    } catch (err) {
      console.error("Wallpaper error:", err);
    }
  };

  const handleDownloadWalletPass = async (passType: "digital" | "contact" = "digital") => {
    if (!isPro) {
      setUpgradeSource("wallet_add");
      setUpgradeOpen(true);
      onUpgradeRequest?.();
      return;
    }
    try {
      const typeParam = `type=${passType}`;
      const tokenParam =
        passType === "digital" && permanentToken
          ? `&token=${encodeURIComponent(permanentToken)}`
          : "";
      const res = await fetch(`/api/wallet/${card.slug}?${typeParam}${tokenParam}`);
      if (res.status === 200) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${card.slug}-${passType}.pkpass`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(
          passType === "contact"
            ? lang === "ar"
              ? "تم تحميل بطاقة جهة الاتصال لـ Apple Wallet!"
              : "Downloaded Contact Card Wallet Pass!"
            : lang === "ar"
              ? "تم تحميل البطاقة الرقمية لـ Apple Wallet!"
              : "Downloaded Digital Card Wallet Pass!",
        );
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Apple Wallet pass download failed.");
      }
    } catch {
      toast.error("Apple Wallet provider is temporarily unavailable.");
    }
  };

  const cardDisplayName = lang === "ar" && card.full_name_ar ? card.full_name_ar : card.full_name;
  const cardDisplayTitle =
    lang === "ar" && card.title_ar ? card.title_ar : card.title || card.company || "";

  const walletPassQrUrl =
    activePassType === "contact"
      ? offlineQrUrl
      : permanentToken && permanentQrUrl
        ? permanentQrUrl
        : profileQrUrl;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center space-x-2 rtl:space-x-reverse font-display">
            <QrCode className="w-5 h-5 text-purple-400" />
            <span>{t("qrHubTitle")}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">{t("qrHubSubtitle")}</p>
        </div>

        {!isPro && (
          <button
            type="button"
            onClick={() => {
              setUpgradeSource("qr_export");
              setUpgradeOpen(true);
              onUpgradeRequest?.();
            }}
            className="py-2 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 rtl:space-x-reverse transition-all self-start sm:self-auto"
          >
            <Crown className="w-4 h-4 fill-slate-950" />
            <span>{t("upgradeToExport")}</span>
          </button>
        )}
      </div>

      {/* QR TYPE SELECTOR & PREVIEW */}
      <div className="justtap-glass rounded-3xl p-6 flex flex-col items-center space-y-5 shadow-xl border border-slate-800">
        <div className="flex flex-wrap justify-center gap-1.5 bg-slate-950/80 rounded-2xl p-1.5 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveQr("profile")}
            className={`flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeQr === "profile"
                ? "bg-purple-700 text-white shadow-md shadow-purple-700/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("qrDynamicProfile")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveQr("offline")}
            className={`flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeQr === "offline"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{t("qrOfflineVCard")}</span>
          </button>

          {permanentToken && (
            <button
              type="button"
              onClick={() => setActiveQr("permanent")}
              className={`flex items-center space-x-1.5 rtl:space-x-reverse px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeQr === "permanent"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t("qrPermanentTag")}</span>
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center max-w-sm leading-relaxed">
          {activeQr === "profile" ? (
            <>
              {t("qrDescDynamic")} (
              <code className="text-purple-300" dir="ltr">
                /c/{card.slug}
              </code>
              )
            </>
          ) : activeQr === "permanent" ? (
            <>
              {t("qrDescPermanent")} (
              <code className="text-amber-300" dir="ltr">
                /t/{permanentToken}
              </code>
              )
            </>
          ) : (
            t("qrDescOffline")
          )}
        </p>

        {/* QR Display */}
        <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200" dir="ltr">
          {activeQrUrl ? (
            <img src={activeQrUrl} alt="QR Code" className="w-56 h-56 object-contain" />
          ) : (
            <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
              {t("generatingQr")}
            </div>
          )}
        </div>

        {/* Action Buttons Underneath EACH QR */}
        <div className="w-full max-w-sm space-y-2.5 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <a
              href={activeQrUrl}
              download={`JustTap_QR_${activeQr}_${card.slug}.png`}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 rtl:space-x-reverse transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("standardPng")}</span>
            </a>

            <button
              type="button"
              onClick={() => handleDownloadHighResQr(activeQr)}
              className={`py-2.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center space-x-1.5 rtl:space-x-reverse transition-all ${
                isPro
                  ? "bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border-purple-500/40"
                  : "bg-slate-950/40 text-slate-500 border-slate-800 cursor-pointer"
              }`}
            >
              {!isPro && <Lock className="w-3 h-3 text-amber-400" />}
              <span>{t("highRes2000px")}</span>
              {!isPro && (
                <span className="text-[9px] text-amber-400 font-extrabold ml-1 rtl:mr-1 rtl:ml-0">
                  PRO
                </span>
              )}
            </button>
          </div>

          {/* Wallet Pass Download button under applicable QR */}
          <button
            type="button"
            data-testid="wallet-quick-action"
            onClick={() => handleDownloadWalletPass(activeQr === "offline" ? "contact" : "digital")}
            className={`w-full py-3 px-4 font-semibold text-xs rounded-xl border flex items-center justify-between shadow-sm transition-colors ${
              isPro
                ? "bg-black hover:bg-slate-950 text-white border-slate-700"
                : "bg-slate-950/60 text-slate-400 border-slate-800"
            }`}
          >
            <span className="flex items-center space-x-2 rtl:space-x-reverse">
              {isPro ? (
                <Download className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400" />
              )}
              <span>
                {activeQr === "offline" ? t("appleWalletContactBtn") : t("appleWalletDigitalBtn")}
              </span>
            </span>
            {!isPro && (
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                PRO
              </span>
            )}
          </button>
        </div>
      </div>

      {/* APPLE WALLET PASS VISUAL PREVIEW & EXPORT HUB */}
      <div
        data-testid="wallet-pass-preview-section"
        className="justtap-glass rounded-3xl p-6 space-y-5 border border-slate-800"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-display">
                {t("walletPassPreviewTitle")}
              </h4>
              <p className="text-xs text-slate-400">{t("walletPassPreviewDesc")}</p>
            </div>
          </div>

          {!isPro && (
            <span
              data-testid="wallet-pro-preview-badge"
              className="text-[10px] text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full font-extrabold border border-amber-400/20 self-start sm:self-auto"
            >
              {t("proPreviewBadge")}
            </span>
          )}
        </div>

        {/* Pass Type Switcher */}
        <div className="flex justify-center gap-1.5 bg-slate-950/80 rounded-2xl p-1.5 border border-slate-800 max-w-sm mx-auto">
          <button
            type="button"
            data-testid="wallet-type-digital"
            onClick={() => setActivePassType("digital")}
            className={`flex-1 flex items-center justify-center space-x-1.5 rtl:space-x-reverse py-2 rounded-xl text-xs font-bold transition-all ${
              activePassType === "digital"
                ? "bg-purple-700 text-white shadow-md shadow-purple-700/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("walletPassDigitalType")}</span>
          </button>

          <button
            type="button"
            data-testid="wallet-type-contact"
            onClick={() => setActivePassType("contact")}
            className={`flex-1 flex items-center justify-center space-x-1.5 rtl:space-x-reverse py-2 rounded-xl text-xs font-bold transition-all ${
              activePassType === "contact"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{t("walletPassContactType")}</span>
          </button>
        </div>

        {/* Apple Wallet Visual Pass Mockup */}
        <div className="flex justify-center">
          <div
            data-testid="wallet-pass-card"
            data-pass-type={activePassType}
            className="w-full max-w-sm rounded-[2rem] p-5 bg-gradient-to-b from-slate-900 via-[#100c18] to-[#08080A] border border-slate-700/70 shadow-2xl space-y-4 text-white relative overflow-hidden"
          >
            {/* Ambient Purple Glow */}
            <div
              className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 opacity-25 blur-2xl rounded-full"
              style={{ backgroundColor: card.accent_color || "#6B21A8" }}
            />

            {/* Pass Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="font-display font-black text-sm tracking-tight text-white">
                  JustTap<span className="text-purple-400">.</span>
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  PASS
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {activePassType === "contact"
                  ? t("walletPassContactType")
                  : t("walletPassDigitalType")}
              </span>
            </div>

            {/* Primary & Secondary Fields */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {lang === "ar" ? "الاسم" : "NAME"}
              </span>
              <h5
                data-testid="wallet-pass-name"
                className="text-lg font-extrabold text-white truncate font-display"
              >
                {cardDisplayName}
              </h5>
              {cardDisplayTitle && (
                <p
                  data-testid="wallet-pass-title"
                  className="text-xs text-slate-300 truncate font-medium"
                >
                  {cardDisplayTitle}
                </p>
              )}
            </div>

            {/* Barcode Section */}
            <div className="p-3 bg-white rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-inner border border-slate-200">
              {walletPassQrUrl ? (
                <img
                  src={walletPassQrUrl}
                  alt="Wallet Barcode"
                  className="w-36 h-36 object-contain"
                />
              ) : (
                <div className="w-36 h-36 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                  {t("generatingQr")}
                </div>
              )}
              <span
                className="text-[9px] font-mono text-slate-500 truncate max-w-[200px]"
                dir="ltr"
              >
                {activePassType === "contact" ? "Offline vCard" : `/c/${card.slug || "justtap"}`}
              </span>
            </div>

            {/* Back info preview */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate" dir="ltr">
                {card.phone || card.email || "JustTap Digital Identity"}
              </span>
              <span className="text-[10px] font-semibold text-purple-400 shrink-0">
                Apple Wallet
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="max-w-sm mx-auto pt-1">
          <button
            type="button"
            data-testid="wallet-primary-cta"
            onClick={() => handleDownloadWalletPass(activePassType)}
            className={`w-full py-3.5 px-4 text-xs font-bold rounded-xl border flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all ${
              isPro
                ? "bg-black hover:bg-slate-950 text-white border-slate-700 shadow-lg"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 border-amber-400 font-extrabold shadow-lg shadow-amber-500/20"
            }`}
          >
            {!isPro ? (
              <>
                <Crown className="w-4 h-4 fill-slate-950" />
                <span>{t("upgradeToAddWallet")}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{t("walletPassDownloadBtn")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* LOCKSCREEN WALLPAPER GENERATOR HUB */}
      <div className="justtap-glass rounded-3xl p-6 space-y-4 border border-slate-800">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse font-display">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <span>{t("wallpaperGenTitle")}</span>
          </h4>
          {!isPro && (
            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-extrabold border border-amber-400/20">
              PRO
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">{t("wallpaperGenDesc")}</p>

        <button
          type="button"
          onClick={handleGenerateWallpaper}
          className={`w-full py-3 px-4 text-xs font-bold rounded-xl border flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all ${
            isPro
              ? "bg-[#6B21A8] hover:bg-[#7E22CE] text-[#FAFAFA] border-[#6B21A8] shadow-lg shadow-[rgba(107,33,168,0.25)]"
              : "bg-[#08080A] text-[#A1A1AA] border-[#22222A]"
          }`}
        >
          {!isPro ? (
            <>
              <Lock className="w-4 h-4 text-amber-400" />
              <span>{t("wallpaperGenBtnPro")}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>{t("wallpaperGenBtn")}</span>
            </>
          )}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* PRO UPGRADE MODAL */}
      <ProUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        source={upgradeSource}
        draft={card}
        session={session}
        onTrialStarted={onTrialStarted}
      />
    </div>
  );
}
