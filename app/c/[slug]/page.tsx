import React from 'react';
import { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PublicCardClientView } from '@/components/card/PublicCardClientView';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: cards } = await supabase.from('cards').select('slug');
    const paramsList = (cards || []).map((c) => ({ slug: c.slug }));
    if (!paramsList.some((p) => p.slug === 'card')) {
      paramsList.push({ slug: 'card' });
    }
    return paramsList;
  } catch {
    return [{ slug: 'card' }];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const supabase = createServerSupabaseClient();
  const { data: card } = await supabase
    .from('cards')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!card) {
    return {
      title: 'Digital Business Card — JustTap',
    };
  }

  const title = `${card.full_name}${card.title ? ` — ${card.title}` : ''}`;
  const description =
    card.bio?.slice(0, 150) ||
    `Digital business card for ${card.full_name}${card.company ? ` at ${card.company}` : ''}. Save contact, exchange info, and connect instantly.`;

  return {
    title,
    description,
  };
}

export default async function PublicCardPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = createServerSupabaseClient();
  const { data: card } = await supabase
    .from('cards')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  return <PublicCardClientView slug={slug} initialCard={card || null} />;
}
