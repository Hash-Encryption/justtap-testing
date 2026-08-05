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
      `Digital business card for ${c.full_name}${c.company ? ` at ${c.company}` : ""}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(c.avatar_url?.startsWith("https://")
          ? [
              { property: "og:image", content: c.avatar_url },
              { name: "twitter:image", content: c.avatar_url },
            ]
          : []),
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
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Go home
        </Link>
      </div>
    </main>
  );
}

function PublicCard() {
  const { card } = Route.useLoaderData();
  return (
    <main
      className="min-h-screen w-full"
      style={{ backgroundColor: card.bg_color || "#ffffff" }}
    >
      <CardView card={card} />
    </main>
  );
}
