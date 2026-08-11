'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { CardEditor } from '@/components/dashboard/CardEditor';
import { Card } from '@/lib/types';
import { emptyCard, slugify } from '@/lib/card';

const GUEST_DRAFT_KEY = 'justtap_guest_pending_card';

export default function GuestBuilderPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Card>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored =
          localStorage.getItem(GUEST_DRAFT_KEY) || sessionStorage.getItem(GUEST_DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const cardData = parsed?.card ? parsed.card : parsed;
          if (cardData && (cardData.full_name || cardData.phone || cardData.title || cardData.bio)) {
            return cardData as Card;
          }
        }
      } catch {
        /* ignore storage errors */
      }
    }
    return { ...emptyCard, user_id: 'guest' };
  });

  const handleGuestSave = () => {
    if (!draft.full_name.trim()) {
      alert('Full name is required');
      return;
    }
    if (!draft.phone.trim()) {
      alert('Phone number is required');
      return;
    }
    const slug = slugify(draft.slug || draft.full_name);
    if (!slug) {
      alert('Card link slug is required');
      return;
    }

    const payload = JSON.stringify({ card: { ...draft, slug }, updatedAt: Date.now() });
    try {
      localStorage.setItem(GUEST_DRAFT_KEY, payload);
      sessionStorage.setItem(GUEST_DRAFT_KEY, payload);
    } catch {
      /* ignore */
    }

    router.push('/auth?mode=signup&claim_draft=true');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans selection:bg-violet-500 selection:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-bold text-violet-400">
              <Sparkles className="h-3.5 w-3.5" /> Instant Guest Sandbox
            </span>

            <button
              type="button"
              onClick={handleGuestSave}
              className="rounded-2xl bg-violet-600 hover:bg-violet-700 px-4 py-2 text-xs font-extrabold text-white transition-all shadow-lg shadow-violet-600/30"
            >
              Sign Up & Publish
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-6">
        <div className="rounded-3xl border border-violet-500/20 bg-violet-500/5 p-6 text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Design Your Digital Business Card
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Preview your live card design below. Create a free account to claim your unique link and start tapping!
          </p>
        </div>

        <CardEditor
          draft={draft}
          setDraft={setDraft}
          userId="guest"
          isNew={true}
          onSaved={handleGuestSave}
        />
      </div>
    </main>
  );
}
