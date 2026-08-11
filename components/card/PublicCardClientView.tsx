'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { PublicCardView } from './PublicCardView';
import { Card } from '@/lib/types';
import { Loader2, ArrowLeft } from 'lucide-react';

interface PublicCardClientViewProps {
  slug?: string;
  initialCard?: Card | null;
}

export function PublicCardClientView({ slug: propSlug, initialCard }: PublicCardClientViewProps) {
  const getBrowserSlug = () => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/c/');
      if (parts.length > 1 && parts[1]) {
        return decodeURIComponent(parts[1].replace(/\/$/, ''));
      }
    }
    return propSlug || '';
  };

  const [card, setCard] = useState<Card | null>(initialCard || null);
  const [loading, setLoading] = useState<boolean>(!initialCard?.id);

  useEffect(() => {
    const slug = getBrowserSlug();
    if (!slug) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchCard() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('cards')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (isMounted) {
          setCard((data as Card) || null);
        }
      } catch {
        if (isMounted) setCard(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCard();
    return () => {
      isMounted = false;
    };
  }, [propSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Loading digital card...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4 font-sans text-center">
        <div className="max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl backdrop-blur-xl">
          <h1 className="text-2xl font-black text-white">Card Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The card link or NFC tag you scanned does not exist or has not been published yet.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 py-3 px-5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-violet-600/30"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to JustTap Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <PublicCardView card={card} />;
}
