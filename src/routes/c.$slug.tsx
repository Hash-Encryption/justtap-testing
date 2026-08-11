import { createFileRoute, notFound } from "@tanstack/react-router";
import { resolvePublicCardFromSupabase } from "@/lib/public-card.server";
import { CardView } from "@/components/card/CardView";
import { CardNotFound, CardServiceError } from "@/components/card/CardStatusPages";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ params }) => {
    const result = await resolvePublicCardFromSupabase(params.slug);
    if (result.status === "service_error") {
      throw new Error(`Public card service error: ${result.message || "Unknown"}`);
    }
    if (result.status !== "found") {
      throw notFound();
    }
    return { card: result.card };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.card) {
      return { meta: [{ title: "Card not found" }, { name: "robots", content: "noindex" }] };
    }
    const c = loaderData.card;
    const title = `${c.full_name}${c.title ? ` — ${c.title}` : ""}`;
    const description =
      c.bio?.slice(0, 150) ||
      `Digital business card for ${c.full_name}${c.company ? ` at ${c.company}` : ""}. Save contact, exchange info, and connect instantly.`;
    const ogImageUrl = `/api/og/${c.slug}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:site_name", content: "JustTap Digital Business Cards" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImageUrl },
        { property: "og:image:type", content: "image/svg+xml" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { property: "twitter:image", content: ogImageUrl },
      ],
    };
  },
  notFoundComponent: CardNotFound,
  errorComponent: CardServiceError,
  component: PublicCard,
});

function PublicCard() {
  const { card } = Route.useLoaderData();
  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: card.bg_color || "#ffffff" }}>
      <CardView card={card} />
    </main>
  );
}
