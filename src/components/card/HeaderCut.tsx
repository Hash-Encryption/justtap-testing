import type { HeaderPattern } from "@/lib/card";

/**
 * Decorative cut that sits at the bottom of the hero photo.
 * The shape is filled with the card background color, the thin layer above
 * it uses the accent color.
 */
export function HeaderCut({
  pattern,
  bgColor,
  accentColor,
}: {
  pattern: HeaderPattern;
  bgColor: string;
  accentColor: string;
}) {
  const shapes: Record<HeaderPattern, { accent: string; base: string }> = {
    wave: {
      accent: "M0,52 C90,110 230,-10 375,44 L375,120 L0,120 Z",
      base: "M0,66 C90,124 230,4 375,58 L375,120 L0,120 Z",
    },
    diagonal: {
      accent: "M0,120 L375,26 L375,120 Z",
      base: "M0,120 L375,42 L375,120 Z",
    },
    arch: {
      accent: "M0,120 C0,52 84,18 187,18 C290,18 375,52 375,120 Z",
      base: "M0,120 C0,66 84,32 187,32 C290,32 375,66 375,120 Z",
    },
  };
  const s = shapes[pattern] ?? shapes.wave;

  return (
    <svg
      viewBox="0 0 375 120"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[76px] w-full"
      aria-hidden="true"
    >
      <path d={s.accent} fill={accentColor} opacity={0.95} />
      <path d={s.base} fill={bgColor} />
    </svg>
  );
}
