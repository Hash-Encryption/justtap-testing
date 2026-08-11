import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateVCardString } from '@/lib/vcard';
import { Card } from '@/lib/types';

export const dynamic = 'force-static';
export async function generateStaticParams() {
  return [{ slug: 'demo-card' }];
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
  bio: 'Building physical NFC business cards and digital contact sharing apps.',
  whatsapp_phone: '+966501234567',
  social_links: { website: 'https://justtap.app' },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    let card: Card | null = null;

    if (slug === 'demo-card') {
      card = DEMO_CARD;
    } else {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) {
        card = data as Card;
        // Log vcard_download event in card_analytics
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        await supabase.from('card_analytics').insert({
          card_id: card.id,
          event_type: 'vcard_download',
          user_agent: userAgent,
        });
      } else {
        card = { ...DEMO_CARD, slug, full_name: slug.replace(/-/g, ' ') };
      }
    }

    // Format dynamic vCard text
    const vcardContent = generateVCardString(card);

    // Return response with vCard headers
    return new NextResponse(vcardContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}.vcf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('vCard API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
