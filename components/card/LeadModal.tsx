'use client';

import React, { useState } from 'react';
import { X, Send, CheckCircle2, User, Phone, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface LeadModalProps {
  cardId: string;
  cardName: string;
  isOpen: boolean;
  onClose: () => void;
  lang?: 'en' | 'ar';
}

export function LeadModal({ cardId, cardName, isOpen, onClose, lang = 'en' }: LeadModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg(isAr ? 'الرجاء إدخال الاسم ورقم الهاتف' : 'Please enter your name and phone number');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('card_leads').insert({
        card_id: cardId,
        sender_name: name.trim(),
        sender_phone: phone.trim(),
        note: note.trim() || null,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      console.error('Lead submission error:', err);
      setErrorMsg(err.message || (isAr ? 'فشل إرسال البيانات' : 'Failed to submit info'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setName('');
    setPhone('');
    setNote('');
    setSubmitted(false);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-all duration-300">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 transition-all transform scale-100"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'تبادل معلومات الاتصال' : 'Exchange Info'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? `أرسل تفاصيلك إلى ${cardName}` : `Share your details back with ${cardName}`}
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'تم الإرسال بنجاح!' : 'Info Shared Successfully!'}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
              {isAr
                ? `تم حفظ تفاصيل الاتصال الخاصة بك لدى ${cardName}.`
                : `Your contact info has been sent to ${cardName}.`}
            </p>
            <button
              onClick={resetAndClose}
              className="mt-4 w-full py-3 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-2xl shadow-lg hover:opacity-90 transition-opacity"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الاسم الكامل *' : 'Full Name *'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isAr ? 'مثال: محمد علي' : 'e.g. Alex Morgan'}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رقم الهاتف *' : 'Phone Number *'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 50 000 0000"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'ملاحظة (اختياري)' : 'Short Note (Optional)'}
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={isAr ? 'سعدت بلقائك!' : 'Nice to connect!'}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-2xl shadow-lg shadow-violet-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 mt-2"
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting
                  ? (isAr ? 'جاري الإرسال...' : 'Submitting...')
                  : (isAr ? 'إرسال معلوماتي' : 'Send My Info')}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
