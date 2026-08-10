import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateVCardString } from '@/lib/vcard';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Query card details
    const { data: card, error } = await supabase
      .from('cards')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Log vcard_download event in card_analytics
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    await supabase.from('card_analytics').insert({
      card_id: card.id,
      event_type: 'vcard_download',
      user_agent: userAgent,
    });

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
