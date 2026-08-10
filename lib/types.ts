export interface SocialLinks {
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
  facebook?: string;
  github?: string;
  youtube?: string;
  tiktok?: string;
}

export interface Card {
  id: string;
  user_id: string;
  slug: string;
  plan: 'free' | 'pro' | string;
  full_name: string;
  phone: string;
  email?: string | null;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  show_logo_badge?: boolean;
  whatsapp_phone?: string | null;
  whatsapp_message?: string;
  enable_arabic?: boolean;
  full_name_ar?: string | null;
  title_ar?: string | null;
  bio_ar?: string | null;
  social_links?: SocialLinks;
  is_active?: boolean;
  created_at?: string;
}

export interface CardLead {
  id: string;
  card_id: string;
  sender_name: string;
  sender_phone: string;
  note?: string | null;
  created_at: string;
}

export interface CardAnalytics {
  id: string;
  card_id: string;
  event_type: 'page_view' | 'vcard_download';
  user_agent?: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
}
