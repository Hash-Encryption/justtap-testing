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

export function PublicCardClientView({ slug: propSlug, initialCard }: PublicCardClientViewProps) {
  // Extract real slug from browser location if available (e.g. /c/my-custom-name)
  const getBrowserSlug = () => {
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/c/');
      if (pathParts.length > 1 && pathParts[1]) {
        return decodeURIComponent(pathParts[1].replace(/\/$/, ''));
      }
    }
    return propSlug || 'demo-card';
  };

  const [activeSlug, setActiveSlug] = useState<string>(getBrowserSlug);
  const [card, setCard] = useState<Card>(initialCard);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const currentSlug = getBrowserSlug();
    setActiveSlug(currentSlug);

    let isMounted = true;

    async function fetchCard() {
      if (currentSlug === 'demo-card') {
        if (isMounted) {
          setCard(initialCard || DEMO_CARD_FALLBACK);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .eq('slug', currentSlug)
          .maybeSingle();

        if (isMounted) {
          if (!error && data) {
            setCard(data as Card);
          } else {
            // If not found in DB yet or previewing draft, construct formatted preview card
            const formattedName = currentSlug
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());

            setCard({
              ...initialCard,
              slug: currentSlug,
              full_name: formattedName || 'Digital Business Card',
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          const formattedName = currentSlug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

          setCard({
            ...initialCard,
            slug: currentSlug,
            full_name: formattedName || 'Digital Business Card',
          });
        }
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

  return <PublicCardView card={card} />;
}

const DEMO_CARD_FALLBACK: Card = {
  id: 'demo-card-id',
  user_id: 'demo-user-id',
  slug: 'demo-card',
  plan: 'free',
  full_name: 'Hashim Alnimari',
  phone: '+966 50 123 4567',
  email: 'hashim@justtap.app',
  title: 'Chief Executive Officer',
  company: 'JustTap Technologies',
  bio: 'Building physical NFC digital business cards and contact sharing apps.',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
  show_logo_badge: true,
  whatsapp_phone: '+966501234567',
  whatsapp_message: 'Hi Hashim! I just scanned your JustTap digital card.',
  enable_arabic: true,
  full_name_ar: 'هاشم النمري',
  title_ar: 'الرئيس التنفيذي',
  bio_ar: 'نطور الجيل القادم من بطاقات الأعمال الرقمية الذكية وتقنيات التواصل النقال.',
  social_links: {
    linkedin: 'https://linkedin.com',
    instagram: 'https://instagram.com',
    twitter: 'https://x.com',
    website: 'https://justtap.app',
  },
  created_at: new Date().toISOString(),
};
