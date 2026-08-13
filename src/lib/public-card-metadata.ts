import type { PublicCard } from "./public-card";

type MetadataCard = Pick<PublicCard, "slug" | "full_name" | "title" | "bio" | "company">;

function parseOrigin(value: string) {
  const url = new URL(value);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:"))
  ) {
    throw new Error("Public site URL must be a trusted HTTP(S) origin");
  }
  return url.origin;
}

export function resolvePublicOrigin(configuredOrigin: string | undefined, requestUrl: string) {
  if (configuredOrigin) return parseOrigin(configuredOrigin);

  const request = new URL(requestUrl);
  const local = request.hostname === "localhost" || request.hostname === "127.0.0.1";
  if (
    (request.protocol === "https:" && request.hostname.endsWith(".pages.dev")) ||
    (local && (request.protocol === "http:" || request.protocol === "https:"))
  ) {
    return request.origin;
  }
  throw new Error("VITE_PUBLIC_SITE_URL must be configured for this deployment host");
}

export function buildPublicCardHead(card: MetadataCard, publicOrigin: string) {
  const title = `${card.full_name}${card.title ? ` — ${card.title}` : ""}`;
  const description =
    card.bio?.slice(0, 150) ||
    `Digital business card for ${card.full_name}${card.company ? ` at ${card.company}` : ""}. Save contact, exchange info, and connect instantly.`;
  const cardUrl = new URL(`/c/${encodeURIComponent(card.slug)}`, publicOrigin).href;
  const imageUrl = new URL(`/api/og/${encodeURIComponent(card.slug)}`, publicOrigin).href;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "profile" },
      { property: "og:site_name", content: "JustTap Digital Business Cards" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: imageUrl },
      { property: "og:image:alt", content: `Digital business card for ${card.full_name}` },
      { property: "og:url", content: cardUrl },
      { property: "og:image:type", content: "image/svg+xml" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
    ],
    links: [{ rel: "canonical", href: cardUrl }],
  };
}
