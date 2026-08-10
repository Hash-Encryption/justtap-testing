'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Phone,
  Mail,
  Linkedin,
  Instagram,
  Twitter,
  Globe,
  Share2,
  Download,
  UserPlus,
  MessageCircle,
  Building2,
  Languages,
  Check,
} from 'lucide-react';
import { Card } from '@/lib/types';
import { LeadModal } from './LeadModal';
import { FooterWatermark } from './FooterWatermark';

interface PublicCardViewProps {
  card: Card;
}

export function PublicCardView({ card }: PublicCardViewProps) {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isAr = lang === 'ar' && card.enable_arabic;

  // Log page view analytics on mount
  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id: card.id,
        event_type: 'page_view',
      }),
    }).catch((err) => console.warn('Failed to log page view:', err));
  }, [card.id]);

  const fullName = isAr && card.full_name_ar ? card.full_name_ar : card.full_name;
  const title = isAr && card.title_ar ? card.title_ar : card.title;
  const bio = isAr && card.bio_ar ? card.bio_ar : card.bio;

  // WhatsApp link
  const waPhone = (card.whatsapp_phone || card.phone || '').replace(/[^0-9]/g, '');
  const waMessage = card.whatsapp_message || 'Hi! I just scanned your digital card.';
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}` : '#';

  // Social Links
  const social = card.social_links || {};

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: fullName,
          text: `Contact card for ${fullName}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between pb-32 pt-4 px-4 font-sans selection:bg-violet-500 selection:text-white"
    >
      {/* Top Header / Language Switcher */}
      <header className="w-full max-w-md flex items-center justify-between py-2 px-1">
        <div className="flex items-center space-x-2">
          {card.enable_arabic && (
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-all shadow-sm"
            >
              <Languages className="w-3.5 h-3.5 text-violet-400" />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>
          )}
        </div>

        <button
          onClick={handleShare}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-all shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'تم النسخ' : 'Copied!'}</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{isAr ? 'مشاركة' : 'Share'}</span>
            </>
          )}
        </button>
      </header>

      {/* Profile Card Container */}
      <main className="w-full max-w-md my-auto space-y-6">
        {/* Main Glass Card */}
        <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-violet-950/20 overflow-hidden text-center">
          {/* Header Pattern Background Accent */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-violet-600/30 via-violet-900/10 to-transparent pointer-events-none" />

          {/* Profile Photo Avatar */}
          <div className="relative z-10 mx-auto w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-slate-800 ring-offset-4 ring-offset-slate-900 shadow-xl overflow-hidden mb-4 bg-slate-800 flex items-center justify-center">
            {card.avatar_url ? (
              <img
                src={card.avatar_url}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-violet-700 to-purple-500 flex items-center justify-center text-white text-3xl font-extrabold">
                {fullName.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Optional Company Logo Badge */}
          {card.show_logo_badge && card.logo_url && (
            <div className="relative z-10 -mt-8 mb-4 inline-block px-3 py-1 bg-slate-800/90 border border-slate-700 rounded-full shadow-md">
              <img
                src={card.logo_url}
                alt={card.company || 'Company logo'}
                className="h-6 w-auto object-contain inline-block"
              />
            </div>
          )}

          {/* Name & Title */}
          <div className="relative z-10 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {fullName}
            </h1>
            {title && (
              <p className="text-sm font-medium text-violet-400">
                {title}
              </p>
            )}
            {card.company && (
              <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400 pt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{card.company}</span>
              </div>
            )}
          </div>

          {/* Bio Paragraph */}
          {bio && (
            <p className="relative z-10 mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto bg-slate-800/40 p-3 rounded-2xl border border-slate-800/80">
              {bio}
            </p>
          )}

          {/* Quick Direct Contact Row (Phone & Email) */}
          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
            {card.phone && (
              <a
                href={`tel:${card.phone}`}
                className="flex items-center justify-center space-x-2 py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-2xl text-xs font-semibold text-slate-200 transition-all hover:scale-[1.02]"
              >
                <Phone className="w-4 h-4 text-violet-400" />
                <span>{isAr ? 'اتصال' : 'Call'}</span>
              </a>
            )}

            {card.email && (
              <a
                href={`mailto:${card.email}`}
                className="flex items-center justify-center space-x-2 py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-2xl text-xs font-semibold text-slate-200 transition-all hover:scale-[1.02]"
              >
                <Mail className="w-4 h-4 text-violet-400" />
                <span>{isAr ? 'بريد' : 'Email'}</span>
              </a>
            )}
          </div>

          {/* Social Icons Row */}
          {(social.linkedin || social.instagram || social.twitter || social.website) && (
            <div className="relative z-10 mt-6 pt-5 border-t border-slate-800 flex items-center justify-center space-x-4">
              {social.linkedin && (
                <a
                  href={social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-violet-600/20 hover:border-violet-500 border border-slate-700 text-slate-300 hover:text-violet-400 transition-all"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}

              {social.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-pink-600/20 hover:border-pink-500 border border-slate-700 text-slate-300 hover:text-pink-400 transition-all"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}

              {social.twitter && (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X Twitter"
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-sky-600/20 hover:border-sky-500 border border-slate-700 text-slate-300 hover:text-sky-400 transition-all"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}

              {social.website && (
                <a
                  href={social.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Website"
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-emerald-600/20 hover:border-emerald-500 border border-slate-700 text-slate-300 hover:text-emerald-400 transition-all"
                >
                  <Globe className="w-5 h-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer Branding Watermark */}
      <FooterWatermark plan={card.plan} lang={lang} />

      {/* Floating Bottom Action Dock */}
      <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40">
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-800 p-2.5 rounded-3xl shadow-2xl shadow-violet-950/40 flex items-center justify-between gap-2">
          {/* Save Contact (.vcf) */}
          <a
            href={`/api/vcard/${card.slug}`}
            className="flex-1 py-3 px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-violet-600/30 flex items-center justify-center space-x-1.5 transition-all hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" />
            <span>{isAr ? 'حفظ جهة الاتصال' : 'Save Contact'}</span>
          </a>

          {/* Lead Exchange Drawer Button */}
          <button
            onClick={() => setLeadModalOpen(true)}
            className="py-3 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-2xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all hover:scale-[1.02]"
          >
            <UserPlus className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline">{isAr ? 'تبادل بياناتك' : 'Exchange Info'}</span>
          </button>

          {/* WhatsApp Direct Chat Button */}
          {waPhone && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-all hover:scale-[1.02]"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Lead Exchange Modal */}
      <LeadModal
        cardId={card.id}
        cardName={fullName}
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
