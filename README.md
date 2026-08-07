# Snap Connect

Build a full-stack, multi-tenant, 100% white-label Digital Business Card SaaS application optimized for physical NFC cards. The app must be mobile-first, highly performant, and built using Next.js (App Router), Supabase (Auth, Database, Storage, RLS), and Tailwind CSS.

==================================================

1. ENVIRONMENT VARIABLES & SUPABASE CREDENTIALS

==================================================

Pre-configure and initialize the Supabase client using these project credentials:

- NEXT_PUBLIC_SUPABASE_URL=https://nlumgigqlaymjiwgpvtp.supabase.co

- NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdW1naWdxbGF5bWppd2dwdnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MDIzMTcsImV4cCI6MjEwMTQ3ODMxN30.wkaEpQlCJQMenDKTd6NGVrtEHiieCiRAp2rs6u3uvAA

==================================================

2. SYSTEM ARCHITECTURE & ROUTING

==================================================

- Public Card Route: /c/[slug] (Fast-loading public profile view mapped from NFC scans)

- Client Portal Route: /dashboard (Card setup & editor, analytics, lead inbox, QR code downloader)

- Admin Portal Route: /admin (Master control panel to manage client accounts, card slugs, and system traffic)

- Dynamic vCard API Route: /api/vcard/[slug] (Generates and streams dynamic .vcf contact files)

==================================================

3. DATABASE SCHEMA & SECURITY (SUPABASE SQL)

==================================================

Configure Supabase with Row Level Security (RLS) enabled on all tables:

TABLE cards:

- id: UUID (Primary Key, DEFAULT gen_random_uuid())

- user_id: UUID (References auth.users(id) ON DELETE CASCADE)

- slug: TEXT (UNIQUE, NOT NULL, e.g. "john-doe")

- full_name: TEXT (NOT NULL)

- phone: TEXT (NOT NULL)

- email: TEXT

- title: TEXT

- company: TEXT

- bio: TEXT

- avatar_url: TEXT

- logo_url: TEXT

- show_logo_badge: BOOLEAN (DEFAULT true)

- header_pattern: TEXT (DEFAULT 'wave') -- Options: 'wave', 'diagonal', 'arch'

- accent_color: TEXT (DEFAULT '#8b5cf6') -- Primary brand accent

- bg_color: TEXT (DEFAULT '#ffffff') -- Card background color

- whatsapp_phone: TEXT

- whatsapp_message: TEXT (DEFAULT 'Hi! I just scanned your digital card.')

- enable_arabic: BOOLEAN (DEFAULT false)

- full_name_ar: TEXT

- title_ar: TEXT

- bio_ar: TEXT

- social_links: JSONB (DEFAULT '{}'::jsonb) -- e.g. {"linkedin": "", "instagram": "", "twitter": "", "website": ""}

- created_at: TIMESTAMP WITH TIME ZONE (DEFAULT now())

TABLE card_leads:

- id: UUID (Primary Key, DEFAULT gen_random_uuid())

- card_id: UUID (References cards(id) ON DELETE CASCADE)

- sender_name: TEXT (NOT NULL)

- sender_phone: TEXT (NOT NULL)

- note: TEXT

- created_at: TIMESTAMP WITH TIME ZONE (DEFAULT now())

TABLE card_analytics:

- id: UUID (Primary Key, DEFAULT gen_random_uuid())

- card_id: UUID (References cards(id) ON DELETE CASCADE)

- event_type: TEXT (NOT NULL) -- 'page_view' or 'vcard_download'

- user_agent: TEXT

- created_at: TIMESTAMP WITH TIME ZONE (DEFAULT now())

RLS POLICIES:

- Enable RLS on all tables.

- Public SELECT access on `cards` table for any visitor.

- Authenticated users can INSERT/UPDATE/DELETE only where `auth.uid() = user_id`.

- Public INSERT access on `card_leads` and `card_analytics`.

- Authenticated card owners can SELECT/DELETE from `card_leads` and `card_analytics` linked to their card ID.

==================================================

4. PUBLIC CARD VIEW (/c/[slug]) - DESIGN & BEHAVIOR

==================================================

- MOBILE-FIRST CONSTRAINT: Viewport optimized for 375px - 430px mobile screens, centered container on desktop.

- BILINGUAL TOGGLE: Top-right switcher button [EN | AR]. When set to 'AR', switch layout to Right-to-Left (dir="rtl") and render Arabic text fields if available.

- HERO PROFILE SECTION:

  - Full-width profile photo at top (avatar_url).

  - SVG Header Cut Pattern at bottom of photo: Render 1 of 3 selectable SVG shapes based on `header_pattern` ('wave' curve, 'diagonal' sharp cut, or 'arch' pill curve). Fill SVG background with card `bg_color` and SVG stroke/accent layer with `accent_color`.

  - Optional Floating Circular Logo Badge: Render transparent PNG/SVG logo in a 48px circle badge overlapping the right side of the header SVG pattern line (toggleable via `show_logo_badge`).

- CARD BODY CONTENT:

  - Full Name (Bold 24px), Job Title, Company Name, Bio paragraph.

  - Direct Contact Rows: Phone (tel: link) and Email (mailto: link).

  - Social Links List: Clean vertical stack of icon buttons for LinkedIn, Instagram, X/Twitter, Website.

- FIXED BOTTOM FLOATING DOCK (Pinned to bottom of viewport with backdrop blur):

  - LEFT BUTTON: Circular button [🤝] (48px x 48px, background color from accent_color or slate-800). Tapping opens a sleek Mobile Bottom Drawer Sheet for Lead Capture ("Exchange Info" modal with fields: Sender Name, Sender Phone, Short Note, and "Send My Info" submit button).

  - CENTER BUTTON: Prominent rounded rectangle pill button [💾 SAVE CONTACT] (180px wide, 48px tall, filled with `accent_color` and white text). Tapping calls `/api/vcard/[slug]` to download the dynamic `.vcf` contact file and log a 'vcard_download' event.

  - RIGHT BUTTON: Circular button [💬] (48px x 48px, WhatsApp green or accent_color). Tapping opens `https://wa.me/[whatsapp_phone]?text=[encoded_whatsapp_message]`.

- ANALYTICS RECORDING: Automatically log a 'page_view' event in `card_analytics` when the page mounts.

==================================================

5. CLIENT DASHBOARD & LIVE EDITOR (/dashboard)

==================================================

- ENTRY LOGIC:

  - If logged-in user has no card record, immediately auto-open in Card Creation Mode.

  - If user has a card, show a "My Cards" card thumbnail. Clicking the card opens the Editor.

- DASHBOARD EDITOR LAYOUT (VERTICAL STACK):

  1. TOP SECTION: Live Mobile Card Preview Frame centered at top of viewport. Updating any form field below reflects instantly in this live preview.

  2. QUICK STYLING CONTROL PANEL (Directly underneath Preview Frame):

     - Color Presets Bar: Horizontal row of 6 preset color chips (Royal Purple #8b5cf6, Corporate Navy #2563eb, Emerald Mint #059669, Cyberpunk #38bdf8, Monochrome #111827, Sunset Gold #d97706) + a Custom Color Wheel Hex Picker.

     - Header Pattern Selection: Radio chips for Wave, Diagonal, and Arch.

     - Logo Badge Toggle: Checkbox for [✓] Show Circular Floating Logo Badge.

  3. FORM INPUT SECTIONS (Scrolled down below style controls):

     - Personal Info: Full Name (Required), Job Title, Company, Bio text.

     - Photos & Media Uploaders: Drag-and-drop file dropzones for Profile Photo and Logo Badge (uploading directly to Supabase Storage bucket 'card-assets').

     - Contact Details: Phone Number (Required), WhatsApp Number, Email Address.

     - Social Links: URLs for LinkedIn, Instagram, X/Twitter, Website.

     - Bilingual Fields (Optional Accordion): Arabic Name, Arabic Title, Arabic Bio.

  4. FLOATING HELPER BUTTON: Pinned action button at bottom-right `[ ⬆️ Jump to Preview ]` that smooth-scrolls the viewport back to the top mobile preview card.

- ADDITIONAL DASHBOARD TABS:

  - 📊 Analytics Tab: Metric cards showing Total Scans/Views vs Total Contact Downloads.

  - 📥 Leads Inbox Tab: Table displaying visitor submissions from the "Exchange Info" drawer (Name, Phone, Note, Date) with CSV export and delete options.

  - 🔲 QR Code Generator Tab: Generates and downloads a high-resolution PNG/SVG QR code linking directly to `yourdomain.com/c/[slug]`.

==================================================

6. DYNAMIC VCARD API ENDPOINT (/api/vcard/[slug]/route.ts)

==================================================

- Receives GET request for a card slug.

- Queries Supabase for card details where slug = params.slug.

- Inserts an analytics record into `card_analytics` (`event_type`: 'vcard_download').

- Formats dynamic vCard text (VERSION:3.0) with N, FN, ORG, TITLE, TEL, EMAIL, and LinkedIn URL.

- Returns response with headers:

  'Content-Type': 'text/vcard; charset=utf-8'

  'Content-Disposition': 'attachment; filename="[slug].vcf"'

==================================================

7. ADMIN PORTAL (/admin)

==================================================

- Master management table listing all user accounts, assigned card slugs, creation dates, and total traffic counts.

- Ability to create new cards, assign slugs to client user IDs, or deactivate cards.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7992a757-1c07-42ed-b64c-7b930b4d6a7b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
