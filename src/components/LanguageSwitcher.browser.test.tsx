import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider, useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import "@/styles.css";

let root: Root | undefined;

function nextPaint() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function LandingSample() {
  const { t } = useTranslation();
  return (
    <div data-testid="landing-container">
      <header>
        <span data-testid="brand-name">{t("appName")}</span>
        <LanguageSwitcher />
        <span data-testid="nav-signin">{t("landingNavSignIn")}</span>
        <span data-testid="nav-portal">{t("landingNavClientPortal")}</span>
      </header>
      <main>
        <h1 data-testid="hero-h1">{t("landingHeroH1")}</h1>
        <p data-testid="hero-desc">{t("landingHeroDesc")}</p>
        <button type="button" data-testid="cta-create">{t("landingCtaCreate")}</button>
      </main>
    </div>
  );
}

function AuthSample() {
  const { t } = useTranslation();
  return (
    <div data-testid="auth-container">
      <LanguageSwitcher />
      <h2 data-testid="auth-title">{t("authTitleSignIn")}</h2>
      <label data-testid="auth-email-label">{t("authEmailLabel")}</label>
      <label data-testid="auth-password-label">{t("authPasswordLabel")}</label>
      <button type="submit" data-testid="auth-submit">{t("authSubmitSignIn")}</button>
    </div>
  );
}

beforeEach(() => {
  try {
    window.localStorage.removeItem("justtap_app_lang");
  } catch {
    /* ignore */
  }
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  document.body.innerHTML = "";
  try {
    window.localStorage.removeItem("justtap_app_lang");
  } catch {
    /* ignore */
  }
});

describe("Runtime Language Switching & Arabic Rendering", () => {
  it("renders English by default, switches to Arabic on click, and updates document.documentElement dir to rtl", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    flushSync(() => {
      root?.render(
        <LanguageProvider>
          <LandingSample />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    const heroH1 = document.querySelector<HTMLElement>('[data-testid="hero-h1"]');
    const ctaCreate = document.querySelector<HTMLElement>('[data-testid="cta-create"]');
    const navSignIn = document.querySelector<HTMLElement>('[data-testid="nav-signin"]');

    expect(heroH1?.textContent).toBe("One Tap to Share Your Entire Professional Identity");
    expect(ctaCreate?.textContent).toBe("Create Your Card Free");
    expect(navSignIn?.textContent).toBe("Sign In");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");

    // Find and click the Arabic button in LanguageSwitcher
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
    const arabicBtn = buttons.find((b) => b.textContent?.includes("العربية"));
    expect(arabicBtn).toBeDefined();

    arabicBtn?.click();
    await nextPaint();

    // Verify Arabic text rendering
    expect(heroH1?.textContent).toBe("لمسة واحدة لمشاركة هويتك المهنية بالكامل");
    expect(ctaCreate?.textContent).toBe("أنشئ بطاقتك مجاناً");
    expect(navSignIn?.textContent).toBe("تسجيل الدخول");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");

    // Verify persistence in localStorage
    expect(window.localStorage.getItem("justtap_app_lang")).toBe("ar");

    // Click English button to switch back
    const enBtn = buttons.find((b) => b.textContent?.trim() === "EN");
    expect(enBtn).toBeDefined();

    enBtn?.click();
    await nextPaint();

    // Verify English restored
    expect(heroH1?.textContent).toBe("One Tap to Share Your Entire Professional Identity");
    expect(ctaCreate?.textContent).toBe("Create Your Card Free");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem("justtap_app_lang")).toBe("en");
  });

  it("renders Auth form translated in Arabic with RTL layout", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    flushSync(() => {
      root?.render(
        <LanguageProvider>
          <AuthSample />
        </LanguageProvider>,
      );
    });
    await nextPaint();

    const title = document.querySelector<HTMLElement>('[data-testid="auth-title"]');
    const emailLabel = document.querySelector<HTMLElement>('[data-testid="auth-email-label"]');
    const passwordLabel = document.querySelector<HTMLElement>('[data-testid="auth-password-label"]');
    const submitBtn = document.querySelector<HTMLElement>('[data-testid="auth-submit"]');

    expect(title?.textContent).toBe("Welcome Back");
    expect(emailLabel?.textContent).toBe("Email Address");
    expect(passwordLabel?.textContent).toBe("Password");
    expect(submitBtn?.textContent).toBe("Sign In");

    // Switch to Arabic
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
    const arabicBtn = buttons.find((b) => b.textContent?.includes("العربية"));
    expect(arabicBtn).toBeDefined();

    arabicBtn?.click();
    await nextPaint();

    expect(title?.textContent).toBe("أهلاً بك مجدداً");
    expect(emailLabel?.textContent).toBe("البريد الإلكتروني");
    expect(passwordLabel?.textContent).toBe("كلمة المرور");
    expect(submitBtn?.textContent).toBe("تسجيل الدخول");
    expect(document.documentElement.dir).toBe("rtl");
  });
});
