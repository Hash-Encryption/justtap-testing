import type { Card } from "@/lib/card";
import { CardView } from "./CardView";

export function CardPreview({ card }: { card: Card }) {
  return <CardView card={card} preview />;
}
