import React from "react";
import {
  Building2,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Sparkles,
  Twitter,
  Video,
} from "lucide-react";
import type { Card } from "@/lib/card";

interface CardPreviewProps {
  card: Card;
  onSaveVCard?: () => void;
  onLeadSubmit?: () => void;
}

export function CardPreview({ card }: CardPreviewProps) {
  const isCustom = card.design_mode === "custom";

  // Colors
  const bgColor = isCustom ? card.bg_color || "#08080A" : "#08080A";
  const surfaceColor = isCustom ? card.surface_color || "#121216" : "#121216";
  const accentColor = isCustom ? card.accent_color || "#6B21A8" : "#6B21A8";
  const champagneAccent = isCustom ? card.champagne_accent || "#E6D5AC" : "#E6D5AC";
  const textColor = isCustom ? card.text_color || "#FAFAFA" : "#FAFAFA";

  // Radius
  const borderRadiusStyle = React.useMemo(() => {
    if (!isCustom) return "1.25rem"; // 20px default
    switch (card.border_radius) {
      case "sharp":
        return "0px";
      case "rounded":
        return "2rem"; // 32px
      case "minimal":
      default:
        return "1rem"; // 16px
    }
  }, [isCustom, card.border_radius]);

  // Finish style
  const finishStyle = React.useMemo(() => {
    if (!isCustom) return { backgroundColor: surfaceColor };
    switch (card.surface_finish) {
      case "glassmorphism":
        return {
          backgroundColor: `${surfaceColor}99`,
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          border: `1px solid ${champagneAccent}33`,
        };
      case "carbon_grain":
        return {
          backgroundColor: surfaceColor,
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 0)",
          backgroundSize: "8px 8px",
          border: `1px solid ${champagneAccent}22`,
        };
      case "flat":
        return {
          backgroundColor: surfaceColor,
          border: `1px solid ${surfaceColor}`,
        };
      case "matte":
      default:
        return {
          backgroundColor: surfaceColor,
          border: `1px solid rgba(255, 255, 255, 0.08)`,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        };
    }
  }, [isCustom, card.surface_finish, surfaceColor, champagneAccent]);

  // Font family style
  const fontFamilyStyle = React.useMemo(() => {
    if (!isCustom) return "'Outfit', 'Plus Jakarta Sans', sans-serif";
    switch (card.font_family) {
      case "Space Grotesk":
        return "'Space Grotesk', monospace, sans-serif";
      case "Plus Jakarta Sans":
        return "'Plus Jakarta Sans', sans-serif";
      case "Outfit":
      default:
        return "'Outfit', sans-serif";
    }
  }, [isCustom, card.font_family]);

  // Pattern separator cut
  const patternCut = React.useMemo(() => {
    const pattern = card.header_pattern || "wave";
    if (pattern === "none") return null;

    if (pattern === "diagonal") {
      return (
        <svg
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-8 text-surface transition-all"
          style={{ fill: surfaceColor }}
        >
          <polygon points="0,80 500,0 500,80" />
        </svg>
      );
    }

    if (pattern === "arch") {
      return (
        <svg
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-8 text-surface transition-all"
          style={{ fill: surfaceColor }}
        >
          <path d="M0,80 C150,0 350,0 500,80 L500,80 L0,80 Z" />
        </svg>
      );
    }

    if (pattern === "geometric") {
      return (
        <svg
          viewBox="0 0 500 80"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-8 text-surface transition-all"
          style={{ fill: surfaceColor }}
        >
          <polygon points="0,80 250,20 500,80" />
        </svg>
      );
    }

    // Default: Wave
    return (
      <svg
        viewBox="0 0 500 80"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-8 text-surface transition-all"
        style={{ fill: surfaceColor }}
      >
        <path d="M0,30 C150,90 350,-30 500,30 L500,80 L0,80 Z" />
      </svg>
    );
  }, [card.header_pattern, surfaceColor]);

  const socialLinks = card.social_links || {};
  const hasSocials =
    socialLinks.linkedin || socialLinks.instagram || socialLinks.twitter || socialLinks.website;

  const pf = card.pro_features || {};

  return (
    <div
      className="relative w-full max-w-sm mx-auto overflow-hidden text-left shadow-2xl transition-all"
      style={{
        backgroundColor: bgColor,
        borderRadius: borderRadiusStyle,
        color: textColor,
        fontFamily: fontFamilyStyle,
      }}
    >
      {/* Header Banner */}
      <div
        className="relative h-36 w-full flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: accentColor }}
      >
        {/* Subtle ambient lighting inside header */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${champagneAccent}, transparent 70%)`,
          }}
        />
        {patternCut}
      </div>

      {/* Avatar & Main Card Details */}
      <div className="relative px-6 pb-6 pt-0 space-y-4" style={finishStyle}>
        {/* Avatar */}
        <div className="-mt-14 flex justify-between items-end mb-2">
          <div
            className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-slate-900 shadow-xl flex items-center justify-center font-bold text-2xl"
            style={{
              backgroundColor: accentColor,
              color: "#ffffff",
              borderColor: surfaceColor,
            }}
          >
            {card.avatar_url ? (
              <img
                src={card.avatar_url}
                alt={card.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              card.full_name?.charAt(0) || "J"
            )}
          </div>

          {card.logo_url && card.show_logo_badge && (
            <div className="w-12 h-12 rounded-xl overflow-hidden p-1 bg-white/10 border border-white/20 shadow-md">
              <img src={card.logo_url} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        {/* Identity & Title */}
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: textColor }}>
            {card.full_name || "Your Name"}
          </h2>
          {(card.title || card.company) && (
            <p className="text-xs font-medium mt-0.5" style={{ color: champagneAccent }}>
              {[card.title, card.company].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>

        {/* Bio */}
        {card.bio && (
          <p
            className="text-xs opacity-80 leading-relaxed line-clamp-3"
            style={{ color: textColor }}
          >
            {card.bio}
          </p>
        )}

        {/* Quick Contact Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-opacity hover:opacity-90 shadow-sm"
            style={{ backgroundColor: accentColor, color: "#ffffff" }}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call</span>
          </button>
          <button
            type="button"
            className="py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-colors"
            style={{
              borderColor: `${champagneAccent}44`,
              color: textColor,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Download className="w-3.5 h-3.5" style={{ color: champagneAccent }} />
            <span>Save Contact</span>
          </button>
        </div>

        {/* Contact Info List */}
        <div className="space-y-2 text-xs pt-2">
          {card.phone && (
            <div className="flex items-center space-x-2 opacity-90">
              <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: champagneAccent }} />
              <span className="truncate">{card.phone}</span>
            </div>
          )}
          {card.email && (
            <div className="flex items-center space-x-2 opacity-90">
              <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: champagneAccent }} />
              <span className="truncate">{card.email}</span>
            </div>
          )}
          {card.whatsapp_phone && (
            <div className="flex items-center space-x-2 opacity-90">
              <MessageCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span className="truncate">WhatsApp: {card.whatsapp_phone}</span>
            </div>
          )}
        </div>

        {/* Social Links */}
        {hasSocials && (
          <div className="pt-2 border-t border-white/10 flex items-center space-x-3">
            {socialLinks.linkedin && (
              <span className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Linkedin className="w-4 h-4" style={{ color: champagneAccent }} />
              </span>
            )}
            {socialLinks.instagram && (
              <span className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Instagram className="w-4 h-4" style={{ color: champagneAccent }} />
              </span>
            )}
            {socialLinks.twitter && (
              <span className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Twitter className="w-4 h-4" style={{ color: champagneAccent }} />
              </span>
            )}
            {socialLinks.website && (
              <span className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Globe className="w-4 h-4" style={{ color: champagneAccent }} />
              </span>
            )}
          </div>
        )}

        {/* Pro Action Features Preview */}
        {(pf.booking_url || pf.pdf_url || pf.custom_cta_url) && (
          <div className="pt-2 space-y-2">
            {pf.booking_url && (
              <div className="py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Appointment</span>
                </span>
                <ExternalLink className="w-3 h-3" />
              </div>
            )}
            {pf.pdf_url && (
              <div className="py-2 px-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{pf.pdf_label || "View Brochure (PDF)"}</span>
                </span>
                <Download className="w-3 h-3" />
              </div>
            )}
          </div>
        )}

        {/* Arabic Language Toggle Badge */}
        {card.enable_arabic && (
          <div className="pt-2 text-right">
            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/80">
              🇸🇦 بالعربية
            </span>
          </div>
        )}

        {/* JustTap Footer Watermark */}
        {(!card.pro_features?.remove_branding || card.plan_tier === "free") && (
          <div className="pt-4 text-center">
            <span className="text-[10px] opacity-40 uppercase tracking-widest font-mono">
              Powered by JustTap
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
