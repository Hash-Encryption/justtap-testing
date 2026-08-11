import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PublicCardView } from '@/components/card/PublicCardView';
import { Card } from '@/lib/types';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

const DEMO_CARD: Card = {
  id: 'demo-card-id',
  user_id: 'demo-user-id',
  slug: 'demo-card',
  plan: 'free',
  full_name: 'Hashim Alnimari',
  phone: '+966 50 123 4567',
  email: 'hashim@justtap.app',
  title: 'Chief Executive Officer',
  company: 'JustTap Technologies',
  bio: 'Building the next generation of physical NFC digital business cards and contact sharing experiences.',
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

export async function generateStaticParams() {
  return [{ slug: 'demo-card' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === 'demo-card') {
    return {
      title: `${DEMO_CARD.full_name} — ${DEMO_CARD.title}`,
      description: DEMO_CARD.bio,
    };
  }

  const supabase = createServerSupabaseClient();
  const { data: card } = await supabase
    .from('cards')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!card) {
    return {
      title: 'Card Not Found — JustTap',
      robots: 'noindex',
    };
  }

  const title = `${card.full_name}${card.title ? ` — ${card.title}` : ''}`;
  const description =
    card.bio?.slice(0, 150) ||
    `Digital business card for ${card.full_name}${card.company ? ` at ${card.company}` : ''}. Save contact, exchange info, and connect instantly.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: 'JustTap Digital Business Cards',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PublicCardPage({ params }: PageProps) {
  const { slug } = await params;

  if (slug === 'demo-card') {
    return <PublicCardView card={DEMO_CARD} />;
  }

  const supabase = createServerSupabaseClient();
  const { data: card, error } = await supabase
    .from('cards')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !card) {
    // If not found in DB, return demo card fallback instead of 404 for preview
    return <PublicCardView card={{ ...DEMO_CARD, slug, full_name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }} />;
  }

  return <PublicCardView card={card} />;
}
