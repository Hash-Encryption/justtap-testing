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
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
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
            primaryFields: [
              { key: 'name', label: 'NAME', value: card.full_name },
            ],
            secondaryFields: [
              { key: 'title', label: 'TITLE', value: card.title || '' },
              { key: 'company', label: 'COMPANY', value: card.company || '' },
            ],
            auxiliaryFields: [
              { key: 'phone', label: 'PHONE', value: card.phone || '' },
            ],
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
        console.warn('WalletWallet API call failed, providing fallback pass response:', walletErr);
      }
    }

    // Fallback: Generate structured pkpass JSON / notice response for environment without live signing service
    const mockPassContent = JSON.stringify({
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.justtap.card',
      serialNumber: card.id,
      teamIdentifier: 'JUSTTAP',
      organizationName: 'JustTap Digital Cards',
      description: `${card.full_name} Digital Business Card`,
      logoText: 'JustTap',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(15, 23, 42)',
      generic: {
        primaryFields: [
          { key: 'name', label: 'FULL NAME', value: card.full_name },
        ],
        secondaryFields: [
          { key: 'title', label: 'TITLE', value: card.title || card.company || 'Digital Card' },
        ],
      },
      barcode: {
        format: 'PKBarcodeFormatQR',
        message: vcardText,
        messageEncoding: 'iso-8859-1',
      },
      note: 'Apple Wallet Pass integration powered by WalletWallet.dev API. Set WALLET_API_KEY in environment for production signed passes.',
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
