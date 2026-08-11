'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PublicCardView } from './PublicCardView';
import { Card } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface PublicCardClientViewProps {
  slug: string;
  initialCard: Card;
}

export function PublicCardClientView({ slug, initialCard }: PublicCardClientViewProps) {
  const [card, setCard] = useState<Card>(initialCard);
  const [loading, setLoading] = useState(slug !== 'demo-card' && !initialCard?.full_name);

  useEffect(() => {
    if (slug === 'demo-card') return;

    let isMounted = true;

    async function fetchCard() {
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
            setCard((prev) => ({
              ...prev,
              slug,
              full_name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            }));
          }
        }
      } catch (err) {
        if (isMounted) {
          setCard((prev) => ({
            ...prev,
            slug,
            full_name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          }));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCard();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400">Loading digital card...</p>
      </div>
    );
  }

  return <PublicCardView card={card} />;
}
