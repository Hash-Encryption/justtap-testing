import { notFound } from "@tanstack/react-router";
import type { PublicCardLookupResult } from "./public-card";

export function publicCardRouteData(result: PublicCardLookupResult) {
  if (result.status === "service_error") {
    throw new Error("Public card service is temporarily unavailable");
  }
  if (result.status !== "found") throw notFound();
  return { card: result.card };
}
