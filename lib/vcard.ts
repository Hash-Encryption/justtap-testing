import { Card } from './types';

export function generateVCardString(card: Card): string {
  const nameParts = (card.full_name || '').trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${card.full_name || ''}`,
  ];

  if (card.company) {
    vcardLines.push(`ORG:${card.company}`);
  }

  if (card.title) {
    vcardLines.push(`TITLE:${card.title}`);
  }

  if (card.phone) {
    vcardLines.push(`TEL;TYPE=CELL,VOICE:${card.phone}`);
  }

  if (card.email) {
    vcardLines.push(`EMAIL;TYPE=INTERNET,PREF:${card.email}`);
  }

  if (card.bio) {
    // Sanitize bio for vCard notes
    const sanitizedBio = card.bio.replace(/\n/g, '\\n');
    vcardLines.push(`NOTE:${sanitizedBio}`);
  }

  if (card.social_links?.website) {
    vcardLines.push(`URL:${card.social_links.website}`);
  } else {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://justtap.app';
    vcardLines.push(`URL:${appUrl}/c/${card.slug}`);
  }

  vcardLines.push('END:VCARD');

  return vcardLines.join('\r\n');
}
