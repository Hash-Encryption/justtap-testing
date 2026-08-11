'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { PublicCardView } from './PublicCardView';
import { Card } from '@/lib/types';
import { Loader2, ArrowLeft, SearchX } from 'lucide-react';

interface PublicCardClientViewProps {
  slug?: string;
  initialCard?: Card | null;
}

export function PublicCardClientView({ slug: propSlug, initialCard }: PublicCardClientViewProps) {
  const getBrowserSlug = () => {
    if (typeof window !== 'undefined') {
      // 1. URL search params: ?slug=xyz
      const searchParams = new URLSearchParams(window.location.search);
      const qSlug = searchParams.get('slug') || searchParams.get('s');
      if (qSlug && qSlug.trim()) return decodeURIComponent(qSlug.trim());

      // 2. URL path: /c/xyz
      const pathname = window.location.pathname;
      const match = pathname.match(/\/c\/([^\/\?#]+)/);
      if (match && match[1]) {
        const clean = decodeURIComponent(match[1].trim());
        if (clean !== 'index.html' && clean !== 'c.html' && clean !== 'card.html') {
          return clean;
        }
      }
    }
    return propSlug && propSlug !== 'card' && propSlug !== 'demo-card' ? propSlug : '';
  };

  const [activeSlug, setActiveSlug] = useState<string>('');
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const slug = getBrowserSlug();
    setActiveSlug(slug);

    if (!slug) {
      setLoading(false);
      return;
    }

    if (initialCard && initialCard.slug === slug) {
      setCard(initialCard);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchCard() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (isMounted) {
          if (!error && data) {
            setCard(data as Card);
          } else {
            setCard(null);
          }
        }
      } catch (err) {
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
        <p className="text-xs font-semibold text-slate-400">Loading digital business card...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4 font-sans text-center">
        <div className="max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/20">
            <SearchX className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white">Card Profile Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The card profile <code className="text-violet-400">/c/{activeSlug || 'unknown'}</code> was not found in the database.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-3 px-5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-violet-600/30"
            >
              <span>Go to Client Portal</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl transition-all border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <PublicCardView card={card} />;
}
