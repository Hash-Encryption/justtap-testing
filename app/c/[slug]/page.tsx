import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PublicCardView } from '@/components/card/PublicCardView';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const { data: card } = await supabase
    .from('cards')
    .select('*')
    .eq('slug', params.slug)
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
  const supabase = createServerSupabaseClient();
  const { data: card, error } = await supabase
    .from('cards')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();

  if (error || !card) {
    notFound();
  }

  return <PublicCardView card={card} />;
}
