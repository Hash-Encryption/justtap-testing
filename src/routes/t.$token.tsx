import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getPublicCardByTagToken } from "@/lib/nfc-tag.server";
import { CardNotFound, CardServiceError } from "@/components/card/CardStatusPages";

export const Route = createFileRoute("/t/$token")({
  loader: async ({ params }) => {
    const token = (params as { token: string }).token;
    const result = await getPublicCardByTagToken({ data: { token } });

    if (result.status === "service_error") {
      throw new Error("Public tag service is temporarily unavailable");
    }

    if (result.status === "found") {
      throw redirect({
        to: "/c/$slug",
        params: { slug: result.slug },
        replace: true,
      });
    }

    throw notFound();
  },
  notFoundComponent: CardNotFound,
  errorComponent: CardServiceError,
});
