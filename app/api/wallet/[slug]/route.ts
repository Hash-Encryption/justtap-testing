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
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    let card: Card = DEMO_CARD;
    if (slug !== 'demo-card') {
      const supabase = createServerSupabaseClient();
      const { data } = await supabase
        .from('cards')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (data) card = data as Card;
    }

    // Offline vCard string payload
    const vcardText = generateVCardString(card);
    const walletApiKey = process.env.WALLET_API_KEY;

    // Send POST request to WalletWallet.dev API if key is available
    if (walletApiKey && !walletApiKey.includes('demo')) {
      try {
        const walletResponse = await fetch('https://api.walletwallet.dev/v1/passes/apple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${walletApiKey}`,
          },
          body: JSON.stringify({
            card_title: card.full_name,
            subtitle: card.title || card.company || 'Digital Business Card',
            barcode: {
              format: 'PKBarcodeFormatQR',
              message: vcardText,
              messageEncoding: 'iso-8859-1',
            },
            primaryFields: [{ key: 'name', label: 'NAME', value: card.full_name }],
            secondaryFields: [
              { key: 'title', label: 'TITLE', value: card.title || '' },
              { key: 'company', label: 'COMPANY', value: card.company || '' },
            ],
            auxiliaryFields: [{ key: 'phone', label: 'PHONE', value: card.phone || '' }],
          }),
        });

        if (walletResponse.ok) {
          const passBuffer = await walletResponse.arrayBuffer();
          return new NextResponse(passBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.apple.pkpass',
              'Content-Disposition': `attachment; filename="${slug}.pkpass"`,
            },
          });
        }
      } catch (walletErr) {
        console.warn('WalletWallet API call fallback:', walletErr);
      }
    }

    // Fallback pass JSON
    const mockPassContent = JSON.stringify({
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.justtap.card',
      serialNumber: card.id,
      organizationName: 'JustTap Digital Cards',
      description: `${card.full_name} Digital Business Card`,
      barcode: {
        format: 'PKBarcodeFormatQR',
        message: vcardText,
        messageEncoding: 'iso-8859-1',
      },
    }, null, 2);

    return new NextResponse(mockPassContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${slug}.pkpass"`,
      },
    });
  } catch (err: any) {
    console.error('Wallet API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
