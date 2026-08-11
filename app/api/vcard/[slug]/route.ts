import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateVCardString } from '@/lib/vcard';
import { Card } from '@/lib/types';

export const dynamic = 'force-static';
export async function generateStaticParams() {
  return [{ slug: 'card' }];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: card, error } = await supabase
      .from('cards')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const vcardContent = generateVCardString(card as Card);

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
