import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { Card } from "@/lib/card";
import { CardView } from "@/components/card/CardView";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { card: data as Card };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
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
        { name: "twitter:image", content: ogImageUrl },
      ],
    };
  },
  notFoundComponent: CardNotFound,
  errorComponent: CardNotFound,
  component: PublicCard,
});

function CardNotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">This card doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link or NFC tag may have been deactivated.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}

function PublicCard() {
  const { card } = Route.useLoaderData();
  return (
    <main className="min-h-screen w-full" style={{ backgroundColor: card.bg_color || "#ffffff" }}>
      <CardView card={card} />
    </main>
  );
}
