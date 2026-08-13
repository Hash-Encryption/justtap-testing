import { createFileRoute } from "@tanstack/react-router";
import { readableOn } from "@/lib/card";
import { validateSlug } from "@/lib/slug";
import { resolvePublicCardFromSupabase } from "@/lib/public-card.server";

export const Route = createFileRoute("/api/og/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugResult = validateSlug(params.slug || "");

        if (!slugResult.valid) {
          return new Response("Invalid slug", { status: 400 });
        }

        const result = await resolvePublicCardFromSupabase(slugResult.slug);
        if (result.status === "service_error") {
          return new Response("Card service unavailable", { status: 503 });
        }
        if (result.status !== "found") {
          return new Response("Card not found", { status: 404 });
        }
        const card = result.card;

        const name = escapeXml(card.full_name || "Digital Card");
        const title = escapeXml(card.title || "");
        const company = escapeXml(card.company || "");
        const accent = card.accent_color || "#6B21A8";
        const bg = card.bg_color || "#08080A";
        const onAccent = readableOn(accent);
        const firstLetter = escapeXml(name.charAt(0).toUpperCase());

        // Standard OpenGraph Image Dimensions: 1200x630
        const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#08080A"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent}dd"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
    <clipPath id="avatarClip">
      <circle cx="240" cy="315" r="130"/>
    </clipPath>
  </defs>

  <!-- Background Canvas -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>

  <!-- Brand Accent Wave Header Cut -->
  <path d="M 0 0 L 1200 0 L 1200 180 Q 900 240 600 180 T 0 220 Z" fill="url(#accentGrad)" opacity="0.85"/>

  <!-- Main Card Container -->
  <rect x="80" y="80" width="1040" height="470" rx="36" fill="#121216" opacity="0.9" stroke="#E6D5AC" stroke-opacity="0.2" stroke-width="2" filter="url(#shadow)"/>

  <!-- Left: Avatar / Photo Circle -->
  <g>
    <circle cx="240" cy="315" r="136" fill="${accent}" filter="url(#shadow)"/>
    ${
      card.avatar_url
        ? `<image href="${card.avatar_url}" x="110" y="185" width="260" height="260" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>`
        : `<circle cx="240" cy="315" r="130" fill="${accent}" />
           <text x="240" y="350" font-family="Outfit, Arial, sans-serif" font-size="110" font-weight="bold" fill="${onAccent}" text-anchor="middle">${firstLetter}</text>`
    }
  </g>

  <!-- Right: Profile Info -->
  <g transform="translate(430, 0)">
    <!-- Full Name -->
    <text x="0" y="270" font-family="Outfit, Arial, sans-serif" font-size="56" font-weight="800" fill="#FAFAFA">${name}</text>

    <!-- Job Title -->
    ${
      title
        ? `<text x="0" y="330" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="32" font-weight="600" fill="#E6D5AC">${title}</text>`
        : ""
    }

    <!-- Company Name -->
    ${
      company
        ? `<text x="0" y="${title ? "380" : "330"}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="28" font-weight="500" fill="#A1A1AA">${company}</text>`
        : ""
    }

    <!-- Tap to View Contact Badge -->
    <g transform="translate(0, 430)">
      <rect x="0" y="0" width="340" height="54" rx="27" fill="${accent}" />
      <text x="170" y="35" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="20" font-weight="700" fill="${onAccent}" text-anchor="middle">TAP TO SAVE CONTACT</text>
    </g>
  </g>

  <!-- Watermark Logo -->
  <g transform="translate(920, 480)">
    <text x="0" y="30" font-family="Outfit, Arial, sans-serif" font-size="24" font-weight="800" fill="#FAFAFA">JustTap<tspan fill="#E6D5AC">.</tspan></text>
  </g>
</svg>
`;

        return new Response(svg.trim(), {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
