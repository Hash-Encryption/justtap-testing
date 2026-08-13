import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicCardPageData } from "@/lib/public-card.server";
import { CardView } from "@/components/card/CardView";
import { CardNotFound, CardServiceError } from "@/components/card/CardStatusPages";
import { resolveCardDesign } from "@/lib/card-design";
import { buildPublicCardHead } from "@/lib/public-card-metadata";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ params }) => {
    const { result, publicOrigin } = await getPublicCardPageData({ data: { slug: params.slug } });
    if (result.status === "service_error") {
      throw new Error(`Public card service error: ${result.message || "Unknown"}`);
    }
    if (result.status !== "found") {
      throw notFound();
    }
    return { card: result.card, publicOrigin };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.card) {
      return { meta: [{ title: "Card not found" }, { name: "robots", content: "noindex" }] };
    }
    return buildPublicCardHead(loaderData.card, loaderData.publicOrigin);
  },
  notFoundComponent: CardNotFound,
  errorComponent: CardServiceError,
  component: PublicCard,
});

function PublicCard() {
  const { card } = Route.useLoaderData();
  const design = resolveCardDesign(card);
  return (
    <main
      className="flex min-h-screen w-full justify-center overflow-x-hidden sm:px-6 sm:py-8"
      style={{ backgroundColor: design.bgColor }}
    >
      <CardView card={card} />
    </main>
  );
}
