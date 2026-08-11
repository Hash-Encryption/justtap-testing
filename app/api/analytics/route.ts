import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { card_id, event_type } = body;

    if (!card_id || !event_type) {
      return NextResponse.json({ error: 'card_id and event_type are required' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const supabase = createServerSupabaseClient();

    const { error } = await supabase.from('card_analytics').insert({
      card_id,
      event_type,
      user_agent: userAgent,
    });

    if (error) {
      console.error('Analytics insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
