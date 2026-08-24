import { useCallback, useRef, useState } from "react";
import type {
  BorderRadius,
  Card,
  DesignMode,
  FontFamily,
  HeaderPattern,
  SurfaceFinish,
} from "@/lib/card";

export type CardVisualState = {
  design_mode: DesignMode;
  bg_color: string;
  surface_color: string;
  accent_color: string;
  champagne_accent: string;
  text_color: string;
  header_pattern: HeaderPattern;
  surface_finish: SurfaceFinish;
  border_radius: BorderRadius;
  font_family: FontFamily;
};

export function extractVisualState(card: Card): CardVisualState {
  return {
    design_mode: card.design_mode || "classic_v2",
    bg_color: card.bg_color || "#08080A",
    surface_color: card.surface_color || "#121216",
    accent_color: card.accent_color || "#6B21A8",
    champagne_accent: card.champagne_accent || "#E6D5AC",
    text_color: card.text_color || "#FAFAFA",
    header_pattern: card.header_pattern || "wave",
    surface_finish: card.surface_finish || "matte",
    border_radius: card.border_radius || "minimal",
    font_family: card.font_family || "Outfit",
  };
}

export function isSameVisualState(a: CardVisualState, b: CardVisualState): boolean {
  return (
    a.design_mode === b.design_mode &&
    a.bg_color === b.bg_color &&
    a.surface_color === b.surface_color &&
    a.accent_color === b.accent_color &&
    a.champagne_accent === b.champagne_accent &&
    a.text_color === b.text_color &&
    a.header_pattern === b.header_pattern &&
    a.surface_finish === b.surface_finish &&
    a.border_radius === b.border_radius &&
    a.font_family === b.font_family
  );
}

const MAX_HISTORY = 30;

export function useEditorHistory(
  initialCard: Card,
  applyVisualState: (state: CardVisualState) => void,
) {
  const [history, setHistory] = useState<CardVisualState[]>([extractVisualState(initialCard)]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const isNavigatingHistoryRef = useRef(false);

  const pushState = useCallback(
    (card: Card) => {
      if (isNavigatingHistoryRef.current) {
        isNavigatingHistoryRef.current = false;
        return;
      }
      const nextVisual = extractVisualState(card);
      setHistory((prev) => {
        const current = prev[currentIndex];
        if (current && isSameVisualState(current, nextVisual)) {
          return prev;
        }
        const newHistory = prev.slice(0, currentIndex + 1);
        if (newHistory.length >= MAX_HISTORY) {
          newHistory.shift();
        }
        newHistory.push(nextVisual);
        return newHistory;
      });
      setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
    },
    [currentIndex],
  );

  const undo = useCallback(() => {
    if (currentIndex <= 0) return;
    const targetIndex = currentIndex - 1;
    const targetState = history[targetIndex];
    if (targetState) {
      isNavigatingHistoryRef.current = true;
      setCurrentIndex(targetIndex);
      applyVisualState(targetState);
    }
  }, [applyVisualState, currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex >= history.length - 1) return;
    const targetIndex = currentIndex + 1;
    const targetState = history[targetIndex];
    if (targetState) {
      isNavigatingHistoryRef.current = true;
      setCurrentIndex(targetIndex);
      applyVisualState(targetState);
    }
  }, [applyVisualState, currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    pushState,
  };
}
