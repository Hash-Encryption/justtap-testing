import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CardPreview } from "@/components/card/CardPreview";
import { emptyCard, type Card } from "@/lib/card";
import "@/styles.css";
import { PhoneFrame } from "./PhoneFrame";

let root: Root | undefined;

const previewCard: Card = {
  ...emptyCard,
  id: "phone-preview",
  slug: "phone-preview",
  full_name: "Preview Person",
  title: "Product Designer",
  company: "JustTap",
  bio: "A deliberately full preview used to exercise the narrow production layout.",
  phone: "+966501234567",
  email: "preview@example.com",
  whatsapp_phone: "+966501234567",
  enable_arabic: true,
  full_name_ar: "شخص للمعاينة",
  title_ar: "مصمم منتجات",
  bio_ar: "معاينة كاملة لاختبار التخطيط العربي الضيق.",
  social_links: { website: "https://example.com" },
  plan_tier: "pro",
  pro_features: {
    video_url: "https://www.youtube.com/watch?v=kzfvVizScuU",
    booking_url: "https://example.com/book",
    pdf_url: "https://example.com/profile.pdf",
    pdf_label: "View profile",
    custom_cta_label: "Visit profile",
    custom_cta_url: "https://example.com/profile",
  },
};

function nextPaint() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function expectOpaqueAncestors(element: HTMLElement) {
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    expect(getComputedStyle(current).opacity).toBe("1");
  }
}

function assertContainedLayout() {
  const screen = document.querySelector<HTMLElement>("[data-phone-screen]");
  const card = document.querySelector<HTMLElement>("[data-card-design]");
  const dock = document.querySelector<HTMLElement>("[data-card-dock]");
  const actions = Array.from(document.querySelectorAll<HTMLElement>("[data-card-action]"));

  expect(screen).not.toBeNull();
  expect(card).not.toBeNull();
  expect(dock).not.toBeNull();
  expect(actions.map((action) => action.dataset.cardAction)).toEqual([
    "exchange",
    "save",
    "whatsapp",
  ]);
  if (!screen || !card || !dock) return;

  expect(screen.scrollWidth).toBeLessThanOrEqual(screen.clientWidth);
  expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
  expect(dock.scrollWidth).toBeLessThanOrEqual(dock.clientWidth);
  expect(screen.clientWidth).toBe(244);
  expect(card.clientWidth).toBe(242);
  expect(dock.clientWidth).toBe(224);

  const cardRect = card.getBoundingClientRect();
  const dockRect = dock.getBoundingClientRect();
  expect(dockRect.left).toBeGreaterThanOrEqual(cardRect.left);
  expect(dockRect.right).toBeLessThanOrEqual(cardRect.right);

  for (const action of actions) {
    const actionRect = action.getBoundingClientRect();
    const style = getComputedStyle(action);
    expect(style.display).not.toBe("none");
    expect(style.visibility).not.toBe("hidden");
    expect(actionRect.width).toBeGreaterThan(0);
    expect(actionRect.height).toBeGreaterThan(0);
    expect(actionRect.left).toBeGreaterThanOrEqual(dockRect.left);
    expect(actionRect.right).toBeLessThanOrEqual(dockRect.right);
    expect(actionRect.left).toBeGreaterThanOrEqual(cardRect.left);
    expect(actionRect.right).toBeLessThanOrEqual(cardRect.right);
  }

  expect(actions.at(-1)?.getBoundingClientRect().width).toBe(40);
}

afterEach(() => {
  root?.unmount();
  root = undefined;
  document.body.innerHTML = "";
});

describe("CardEditor phone preview layout", () => {
  it("keeps borderline semantic text fully opaque during the live entrance animation", async () => {
    const host = document.createElement("div");
    host.style.width = "270px";
    document.body.append(host);
    const browserRoot = createRoot(host);
    root = browserRoot;
    flushSync(() =>
      browserRoot.render(
        <PhoneFrame>
          <CardPreview
            card={{
              ...previewCard,
              company: "Borderline Company",
              bio: "Borderline biography",
              design_mode: "custom",
              bg_color: "#000000",
              surface_color: "#000000",
              accent_color: "#000000",
              champagne_accent: "#FFFFFF",
              text_color: "#7D7D7D",
            }}
          />
        </PhoneFrame>,
      ),
    );
    await nextFrame();

    const card = document.querySelector<HTMLElement>('[data-card-design="custom"]');
    const company = Array.from(document.querySelectorAll<HTMLElement>("p")).find(
      (element) => element.textContent?.trim() === "Borderline Company",
    );
    const bio = Array.from(document.querySelectorAll<HTMLElement>("p")).find(
      (element) => element.textContent?.trim() === "Borderline biography",
    );
    const branding = Array.from(document.querySelectorAll<HTMLElement>("div")).find(
      (element) => element.textContent?.trim() === "Powered by JustTap",
    );

    expect(card).not.toBeNull();
    expect(company).not.toBeUndefined();
    expect(bio).not.toBeUndefined();
    expect(branding).not.toBeUndefined();
    if (!card || !company || !bio || !branding) return;

    const animation = card.getAnimations().find((candidate) => candidate.playState === "running");
    const progress = animation?.effect?.getComputedTiming().progress;
    expect(animation).not.toBeUndefined();
    expect(progress).not.toBeNull();
    expect(progress).toBeLessThan(1);
    expect(getComputedStyle(card).opacity).toBe("1");
    expect(getComputedStyle(card).color).toBe("rgb(125, 125, 125)");

    for (const element of [company, bio, branding]) {
      expect(getComputedStyle(element).color).toBe("rgb(125, 125, 125)");
      expectOpaqueAncestors(element);
    }
  });

  it("keeps the real narrow production preview and all dock actions visible in LTR and RTL", async () => {
    const host = document.createElement("div");
    host.style.width = "270px";
    document.body.append(host);
    root = createRoot(host);
    root.render(
      <PhoneFrame>
        <CardPreview card={previewCard} />
      </PhoneFrame>,
    );
    await nextPaint();

    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector("[data-video-preview-placeholder]")).not.toBeNull();
    assertContainedLayout();

    const arabicButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === "ar",
    );
    expect(arabicButton).not.toBeUndefined();
    arabicButton?.click();
    await nextPaint();

    expect(document.querySelector<HTMLElement>("[data-card-design]")?.dir).toBe("rtl");
    assertContainedLayout();
  });
});
