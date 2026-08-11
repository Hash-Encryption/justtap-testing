'use client';

import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  Building,
  Briefcase,
  FileText,
  Upload,
  Globe,
  Linkedin,
  Instagram,
  Twitter,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/lib/types';

interface CardEditorProps {
  card?: Partial<Card>;
  onSaveSuccess?: (updatedCard: Card) => void;
  draft?: Partial<Card>;
  setDraft?: (c: any) => void;
  userId?: string;
  isNew?: boolean;
  onSaved?: (saved: any) => void;
}

export function CardEditor({ card, onSaveSuccess, draft, onSaved }: CardEditorProps) {
  const activeCard = card || draft || {};
  const [formData, setFormData] = useState<Partial<Card>>({
    full_name: activeCard.full_name || '',
    slug: activeCard.slug || '',
    phone: activeCard.phone || '',
    email: activeCard.email || '',
    title: activeCard.title || '',
    company: activeCard.company || '',
    bio: activeCard.bio || '',
    avatar_url: activeCard.avatar_url || '',
    logo_url: activeCard.logo_url || '',
    show_logo_badge: activeCard.show_logo_badge ?? true,
    whatsapp_phone: activeCard.whatsapp_phone || activeCard.phone || '',
    whatsapp_message: activeCard.whatsapp_message || 'Hi! I just scanned your digital card.',
    enable_arabic: activeCard.enable_arabic ?? false,
    full_name_ar: activeCard.full_name_ar || '',
    title_ar: activeCard.title_ar || '',
    bio_ar: activeCard.bio_ar || '',
    social_links: {
      linkedin: activeCard.social_links?.linkedin || '',
      instagram: activeCard.social_links?.instagram || '',
      twitter: activeCard.social_links?.twitter || '',
      website: activeCard.social_links?.website || '',
    },
    plan: activeCard.plan || 'free',
  });

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [arabicAccordionOpen, setArabicAccordionOpen] = useState(activeCard.enable_arabic ?? false);

  const handleInputChange = (field: keyof Card, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [key]: value,
      },
    }));
  };

  // Upload file helper to Supabase bucket 'card-assets'
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'avatar' | 'logo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingLogo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('card-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('card-assets').getPublicUrl(filePath);

      if (type === 'avatar') {
        handleInputChange('avatar_url', data.publicUrl);
      } else {
        handleInputChange('logo_url', data.publicUrl);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setMessage({ type: 'error', text: `Upload failed: ${err.message}` });
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      setMessage({ type: 'error', text: 'Full Name and Phone Number are required.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let targetSlug = formData.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      if (!targetSlug) {
        targetSlug = formData.full_name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      }

      const payload = {
        ...formData,
        slug: targetSlug,
        user_id: user?.id,
      };

      let result;
      if (card.id) {
        // Update existing
        result = await supabase
          .from('cards')
          .update(payload)
          .eq('id', card.id)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from('cards')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setMessage({ type: 'success', text: 'Card saved successfully!' });
      onSaveSuccess(result.data as Card);
    } catch (err: any) {
      console.error('Save card error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save card details' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          <span>{message.text}</span>
          {message.type === 'success' && <Check className="w-5 h-5 text-emerald-400" />}
        </div>
      )}

      {/* 1. PERSONAL INFO SECTION */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <User className="w-5 h-5 text-violet-400" />
          <span>Personal Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.full_name || ''}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="e.g. Hashim Alnimari"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Card Slug / Custom URL *
            </label>
            <input
              type="text"
              required
              value={formData.slug || ''}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              placeholder="e.g. hashim-alnimari"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g. Chief Executive Officer"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company || ''}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="e.g. JustTap Technologies"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Short Bio
          </label>
          <textarea
            rows={3}
            value={formData.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Brief introduction about yourself or your company..."
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>
      </section>

      {/* 2. MEDIA UPLOADERS (AVATAR & LOGO) */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Upload className="w-5 h-5 text-violet-400" />
          <span>Profile Media & Branding</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Avatar Uploader */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Profile Photo (Avatar)
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <label className="cursor-pointer py-2 px-4 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 rounded-xl transition-all">
                <span>{uploadingAvatar ? 'Uploading...' : 'Choose File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'avatar')}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Logo Uploader */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Company Logo Badge
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <Building className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <label className="cursor-pointer py-2 px-4 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 rounded-xl transition-all">
                <span>{uploadingLogo ? 'Uploading...' : 'Choose File'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'logo')}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CONTACT DETAILS */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Phone className="w-5 h-5 text-violet-400" />
          <span>Contact Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+966 50 000 0000"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              WhatsApp Phone Number
            </label>
            <input
              type="tel"
              value={formData.whatsapp_phone || ''}
              onChange={(e) => handleInputChange('whatsapp_phone', e.target.value)}
              placeholder="+966 50 000 0000"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Default WhatsApp Greeting Message
            </label>
            <input
              type="text"
              value={formData.whatsapp_message || ''}
              onChange={(e) => handleInputChange('whatsapp_message', e.target.value)}
              placeholder="Hi! I just scanned your digital card."
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
      </section>

      {/* 4. SOCIAL LINKS */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Globe className="w-5 h-5 text-violet-400" />
          <span>Social & Web Links</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Linkedin className="w-3.5 h-3.5 text-blue-400" />
              <span>LinkedIn URL</span>
            </label>
            <input
              type="url"
              value={formData.social_links?.linkedin || ''}
              onChange={(e) => handleSocialChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Instagram className="w-3.5 h-3.5 text-pink-400" />
              <span>Instagram URL</span>
            </label>
            <input
              type="url"
              value={formData.social_links?.instagram || ''}
              onChange={(e) => handleSocialChange('instagram', e.target.value)}
              placeholder="https://instagram.com/username"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Twitter className="w-3.5 h-3.5 text-sky-400" />
              <span>X (Twitter) URL</span>
            </label>
            <input
              type="url"
              value={formData.social_links?.twitter || ''}
              onChange={(e) => handleSocialChange('twitter', e.target.value)}
              placeholder="https://x.com/username"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Website URL</span>
            </label>
            <input
              type="url"
              value={formData.social_links?.website || ''}
              onChange={(e) => handleSocialChange('website', e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
      </section>

      {/* 5. BILINGUAL ACCORDION (ARABIC) */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden">
        <button
          type="button"
          onClick={() => {
            const nextState = !arabicAccordionOpen;
            setArabicAccordionOpen(nextState);
            if (nextState) handleInputChange('enable_arabic', true);
          }}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400">
              🇸🇦
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bilingual Arabic Profile</h3>
              <p className="text-xs text-slate-400">Enable RTL layout & Arabic contact details</p>
            </div>
          </div>
          {arabicAccordionOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {arabicAccordionOpen && (
          <div className="p-6 pt-0 border-t border-slate-800 space-y-4 mt-4" dir="rtl">
            <div className="flex items-center space-x-2 space-x-reverse mb-2">
              <input
                type="checkbox"
                id="enable_arabic_cb"
                checked={formData.enable_arabic ?? false}
                onChange={(e) => handleInputChange('enable_arabic', e.target.checked)}
                className="w-4 h-4 rounded accent-violet-600"
              />
              <label htmlFor="enable_arabic_cb" className="text-xs font-semibold text-slate-300">
                تفعيل زر التحويل إلى اللغة العربية في البطاقة
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الاسم الكامل بالعربية
                </label>
                <input
                  type="text"
                  value={formData.full_name_ar || ''}
                  onChange={(e) => handleInputChange('full_name_ar', e.target.value)}
                  placeholder="مثال: هاشم النمري"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  المسمى الوظيفي بالعربية
                </label>
                <input
                  type="text"
                  value={formData.title_ar || ''}
                  onChange={(e) => handleInputChange('title_ar', e.target.value)}
                  placeholder="مثال: الرئيس التنفيذي"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                نبذة مختصرة بالعربية
              </label>
              <textarea
                rows={3}
                value={formData.bio_ar || ''}
                onChange={(e) => handleInputChange('bio_ar', e.target.value)}
                placeholder="نبذة عنك باللغة العربية..."
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
          </div>
        )}
      </section>

      {/* SAVE BUTTON */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="py-3.5 px-8 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl shadow-xl shadow-violet-600/30 flex items-center space-x-2 transition-all disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Saving Changes...' : 'Save Card Profile'}</span>
        </button>
      </div>
    </form>
  );
}
