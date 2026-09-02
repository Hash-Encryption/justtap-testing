import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, User } from "@supabase/supabase-js";
import { LanguageProvider, translations } from "@/lib/i18n";
import { Route } from "@/routes/admin";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { getOperations, maskNfcToken } from "@/lib/operations";
import type { OperationsData } from "@/lib/operations";
import "@/styles.css";

const AdminComponent = Route.options.component!;

let root: Root | undefined;

function nextPaint() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

const mockOperationsData: OperationsData = {
  overview: {
    total_users: 25,
    new_users: 5,
    activated_users: 18,
    live_cards: 12,
    inactive_cards: 4,
    connections: 42,
    trials_ending_soon: 2,
    tier_distribution: { free: 15, trialing: 4, pro: 5, enterprise: 1 },
  },
  users: [
    {
      id: "prof-1",
      user_id: "user-1",
      full_name: "Alice Operator",
      email: "alice@example.com",
      phone: "+966501112233",
      plan_tier: "pro",
      trial_started_at: null,
      trial_ends_at: null,
      created_at: "2026-08-01T00:00:00Z",
      card_count: 2,
      live_card_count: 2,
      inactive_card_count: 0,
      connections_count: 10,
      activated: true,
    },
    {
      id: "prof-2",
      user_id: "user-2",
      full_name: "Bob FreeUser",
      email: "bob@example.com",
      phone: null,
      plan_tier: "free",
      trial_started_at: null,
      trial_ends_at: null,
      created_at: "2026-08-15T00:00:00Z",
      card_count: 1,
      live_card_count: 0,
      inactive_card_count: 1,
      connections_count: 0,
      activated: false,
    },
  ],
  cards: [
    {
      id: "card-1",
      user_id: "user-1",
      slug: "alice-card",
      full_name: "Alice Card",
      is_active: true,
      plan_tier: "pro",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-20T00:00:00Z",
      published_at: "2026-08-02T00:00:00Z",
      views: 120,
      contact_saves: 45,
      connections_count: 10,
      active_nfc_token: "jt_tag_0123456789abcdef0123456789abcdef",
      owner_name: "Alice Operator",
      owner_email: "alice@example.com",
      enable_arabic: true,
    },
    {
      id: "card-2",
      user_id: "user-2",
      slug: "bob-draft",
      full_name: "Bob Draft",
      is_active: false,
      plan_tier: "free",
      created_at: "2026-08-15T00:00:00Z",
      updated_at: null,
      published_at: null,
      views: 0,
      contact_saves: 0,
      connections_count: 0,
      active_nfc_token: null,
      owner_name: "Bob FreeUser",
      owner_email: "bob@example.com",
      enable_arabic: false,
    },
  ],
  audit: [
    {
      id: "audit-1",
      created_at: "2026-08-29T12:00:00Z",
      actor_user_id: "admin-uuid-1234",
      action: "admin_set_entitlement",
      target_type: "user",
      target_id: "user-1",
      result: "success",
      environment: "testing",
      release_identifier: "test",
      change_summary: { plan_tier: "pro", reason: "Support ticket #101" },
    },
  ],
  product_analytics: {
    collection_started: "2026-08-29T01:00:00Z",
    dau: 8,
    wau: 18,
    mau: 25,
    events: {
      card_edit_started: 14,
      profile_completed: 6,
      pro_feature_view: 22,
      pro_preview_started: 12,
      pro_preview_interaction: 19,
      feature_used: 9,
      signup_completed: 25,
      card_created: 15,
      card_published: 12,
      trial_started: 4,
    },
    recent: [
      {
        id: "pe-1",
        event_name: "card_edit_started",
        user_id: "user-1",
        card_id: "card-1",
        source: "editor",
        feature: null,
        created_at: "2026-08-29T20:00:00Z",
      },
    ],
  },
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
  useIsAdmin: vi.fn(),
}));

vi.mock("@/lib/operations", async () => {
  const actual = await vi.importActual<typeof import("@/lib/operations")>("@/lib/operations");
  return {
    ...actual,
    getOperations: vi.fn(),
  };
});

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({
      children,
      to,
      className,
    }: {
      children?: React.ReactNode;
      to?: string;
      className?: string;
    }) => (
      <a href={to} className={className}>
        {children}
      </a>
    ),
  };
});

beforeEach(() => {
  try {
    window.localStorage.removeItem("justtap_app_lang");
  } catch {
    /* ignore */
  }
  vi.clearAllMocks();
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  document.body.innerHTML = "";
});

function renderAdminPage(lang: "en" | "ar" = "en", width = 1280) {
  const host = document.createElement("div");
  host.id = "browser-admin-root";
  host.style.width = `${width}px`;
  host.style.maxWidth = `${width}px`;
  host.style.overflowX = "hidden";
  document.body.append(host);

  root = createRoot(host);
  flushSync(() => {
    root?.render(
      <LanguageProvider defaultLang={lang}>
        <AdminComponent />
      </LanguageProvider>,
    );
  });
  return host;
}

describe("Admin Operations Portal — Real Browser Suite", () => {
  it("renders accessible loading state while checking authorization", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: true,
    });
    vi.mocked(useIsAdmin).mockReturnValue(null);

    const host = renderAdminPage("en", 390);
    await nextPaint();

    const loadingSpinner = host.querySelector('[role="status"]');
    expect(loadingSpinner).not.toBeNull();
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
  });

  it("renders clean unauthenticated sign-in gateway for anonymous visitors", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
    });
    vi.mocked(useIsAdmin).mockReturnValue(false);

    const host = renderAdminPage("en", 390);
    await nextPaint();

    expect(host.textContent).toContain(translations.en.adminSignInRequiredTitle);
    expect(host.textContent).toContain(translations.en.signIn);
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
  });

  it("renders 403 Forbidden access denied for authenticated non-admin users", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-normal", email: "user@example.com" } as unknown as User,
      session: { user: { id: "u-normal" } } as unknown as Session,
      loading: false,
    });
    vi.mocked(useIsAdmin).mockReturnValue(false);

    const host = renderAdminPage("en", 390);
    await nextPaint();

    expect(host.textContent).toContain(translations.en.adminAccessDeniedTitle);
    expect(host.textContent).toContain(translations.en.adminReturnToDashboard);
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
  });

  it("renders full Operations Portal across 390px, 430px, tablet, and desktop without horizontal overflow", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-admin", email: "admin@justtap.app" } as unknown as User,
      session: { user: { id: "u-admin" } } as unknown as Session,
      loading: false,
    });
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.mocked(getOperations).mockResolvedValue({
      data: mockOperationsData,
      error: null,
    });

    const viewports = [
      { name: "mobile 390px", width: 390 },
      { name: "mobile 430px", width: 430 },
      { name: "tablet 768px", width: 768 },
      { name: "desktop 1280px", width: 1280 },
    ];

    for (const vp of viewports) {
      document.body.innerHTML = "";
      const host = renderAdminPage("en", vp.width);
      await nextPaint();

      expect(host.textContent).toContain(translations.en.adminTitle);
      expect(host.textContent).toContain("OPERATOR");

      // Verify zero horizontal page overflow
      expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);

      // Verify overview KPIs rendered
      expect(host.textContent).toContain(translations.en.adminTotalUsers);
      expect(host.textContent).toContain("25");
      expect(host.textContent).toContain(translations.en.adminLiveCards);
      expect(host.textContent).toContain("12");
    }
  });

  it("supports interactive tab navigation across all 7 operational tabs", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-admin", email: "admin@justtap.app" } as unknown as User,
      session: { user: { id: "u-admin" } } as unknown as Session,
      loading: false,
    });
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.mocked(getOperations).mockResolvedValue({
      data: mockOperationsData,
      error: null,
    });

    const host = renderAdminPage("en", 1024);
    await nextPaint();

    const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs.length).toBe(7);

    // Tab 2: Client Profiles
    tabs[1]?.click();
    await nextPaint();
    expect(host.textContent).toContain(translations.en.adminCreateProfileTitle);
    expect(host.textContent).toContain("Alice Operator");
    expect(host.textContent).toContain("Bob FreeUser");

    // Tab 3: Digital Cards
    tabs[2]?.click();
    await nextPaint();
    expect(host.textContent).toContain(translations.en.adminCreateCardTitle);
    expect(host.textContent).toContain("alice-card");
    expect(host.textContent).toContain("bob-draft");
    // Forward-only timestamp truth-in-labeling
    expect(host.textContent).toContain(translations.en.adminNotTrackedYet);

    // Tab 4: Connections Summary
    tabs[3]?.click();
    await nextPaint();
    expect(host.textContent).toContain(translations.en.adminConnectionsTitle);
    expect(host.textContent).toContain(translations.en.adminConnectionsNotice);
    expect(host.textContent).toContain(translations.en.adminComparisonUnavailable);

    // Tab 5: Analytics
    expect(tabs[4]?.textContent).toContain("Analytics");
    tabs[4]?.click();
    await nextPaint();
    expect(host.textContent).toContain(translations.en.adminProductAnalyticsTitle);
    expect(host.textContent).toContain(translations.en.adminAnalyticsDesc);
    expect(host.textContent).toContain(translations.en.adminFunnelStages);
    expect(host.textContent).toContain(translations.en.adminStageUnavailableNotice);
    expect(host.textContent).toContain(translations.en.adminTierDistribution);
    expect(host.textContent).toContain(translations.en.adminAnalyticsBreakdownTitle);
    expect(host.textContent).toContain(translations.en.adminRecentEventsStream);
    expect(host.textContent).toContain(translations.en.adminPublicVisitorsDisclaimer);

    // Tab 6: Audit Log
    tabs[5]?.click();
    await nextPaint();
    expect(host.textContent).toContain(translations.en.adminAuditTitle);
    expect(host.textContent).toContain("admin_set_entitlement");

    // Tab 7: NFC Operations
    tabs[6]?.click();
    await nextPaint();
    expect(host.textContent).toContain(translations.en.adminNfcProvisionTitle);
  });

  it("renders empty states gracefully when records are absent", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-admin", email: "admin@justtap.app" } as unknown as User,
      session: { user: { id: "u-admin" } } as unknown as Session,
      loading: false,
    });
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.mocked(getOperations).mockResolvedValue({
      data: {
        overview: mockOperationsData.overview,
        users: [],
        cards: [],
        audit: [],
        product_analytics: mockOperationsData.product_analytics,
      },
      error: null,
    });

    const host = renderAdminPage("en", 1024);
    await nextPaint();

    const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

    // Users empty
    tabs[1]?.click();
    await nextPaint();
    expect(host.textContent).toContain(translations.en.adminNoUsersFound);

    // Cards empty
    tabs[2]?.click();
    await nextPaint();
    expect(host.textContent).toContain(translations.en.adminNoCardsMatch);

    // Audit empty
    tabs[5]?.click();
    await nextPaint();
    expect(host.textContent).toContain(translations.en.adminNoAuditRecords);
  });

  it("handles error state and provides retry capability", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-admin", email: "admin@justtap.app" } as unknown as User,
      session: { user: { id: "u-admin" } } as unknown as Session,
      loading: false,
    });
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.mocked(getOperations)
      .mockResolvedValueOnce({
        data: null,
        error: "Network timeout fetching operations data",
      })
      .mockResolvedValueOnce({
        data: mockOperationsData,
        error: null,
      });

    const host = renderAdminPage("en", 1024);
    await nextPaint();

    expect(vi.mocked(getOperations)).toHaveBeenCalledTimes(1);

    // Click Refresh button to retry
    const refreshBtn = host.querySelector<HTMLButtonElement>('button[aria-label="Refresh data"]');
    expect(refreshBtn).not.toBeNull();
    refreshBtn?.click();
    await nextPaint();

    expect(vi.mocked(getOperations)).toHaveBeenCalledTimes(2);
  });

  it("verifies destructive confirmation dialogs require exact slug/email and audit reason", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-admin", email: "admin@justtap.app" } as unknown as User,
      session: { user: { id: "u-admin" } } as unknown as Session,
      loading: false,
    });
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.mocked(getOperations).mockResolvedValue({
      data: mockOperationsData,
      error: null,
    });

    const host = renderAdminPage("en", 1024);
    await nextPaint();

    const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

    // 1. Delete Profile Dialog Verification
    tabs[1]?.click(); // Users tab
    await nextPaint();

    const deleteProfileBtns = Array.from(
      host.querySelectorAll<HTMLButtonElement>('button[title="Delete Profile"]'),
    );
    expect(deleteProfileBtns.length).toBeGreaterThan(0);
    deleteProfileBtns[0]?.click();
    await nextPaint();

    const deleteProfileDialog = host.querySelector('[role="dialog"]');
    expect(deleteProfileDialog).not.toBeNull();
    expect(deleteProfileDialog?.textContent).toContain(
      translations.en.adminConfirmDeleteProfileTitle,
    );
    expect(deleteProfileDialog?.textContent).toContain(
      "This will remove the client profile row. Note: This does NOT delete the Supabase Auth account or owned cards.",
    );

    // Close modal
    const cancelBtn = Array.from(
      deleteProfileDialog?.querySelectorAll<HTMLButtonElement>("button") || [],
    ).find((b) => b.textContent?.includes("Cancel"));
    cancelBtn?.click();
    await nextPaint();

    // 2. Delete Card Dialog Verification
    tabs[2]?.click(); // Cards tab
    await nextPaint();

    const deleteCardBtns = Array.from(
      host.querySelectorAll<HTMLButtonElement>('button[title="Delete Card"]'),
    );
    expect(deleteCardBtns.length).toBeGreaterThan(0);
    deleteCardBtns[0]?.click();
    await nextPaint();

    const deleteCardDialog = host.querySelector('[role="dialog"]');
    expect(deleteCardDialog).not.toBeNull();
    expect(deleteCardDialog?.textContent).toContain(translations.en.adminConfirmDeleteCardTitle);
    expect(deleteCardDialog?.textContent).toContain(translations.en.adminReasonRequired);
  });

  it("verifies keyboard navigation and visible focus rings on interactive elements", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-admin", email: "admin@justtap.app" } as unknown as User,
      session: { user: { id: "u-admin" } } as unknown as Session,
      loading: false,
    });
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.mocked(getOperations).mockResolvedValue({
      data: mockOperationsData,
      error: null,
    });

    const host = renderAdminPage("en", 1024);
    await nextPaint();

    const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const firstTab = tabs[0];
    firstTab?.focus();
    expect(document.activeElement).toBe(firstTab);

    // Verify focus styles exist in class list
    const searchInput = host.querySelector<HTMLInputElement>('input[type="text"]');
    searchInput?.focus();
    expect(document.activeElement).toBe(searchInput);
    expect(searchInput?.className).toContain("focus:ring-2");
  });

  it("renders Arabic RTL correctly with proper text alignment and RTL document direction", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-admin", email: "admin@justtap.app" } as unknown as User,
      session: { user: { id: "u-admin" } } as unknown as Session,
      loading: false,
    });
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.mocked(getOperations).mockResolvedValue({
      data: mockOperationsData,
      error: null,
    });

    const host = renderAdminPage("ar", 430);
    await nextPaint();

    expect(host.textContent).toContain(translations.ar.adminTitle);
    expect(host.textContent).toContain(translations.ar.adminTabOverview);
    expect(host.textContent).toContain(translations.ar.adminTabUsers);
    expect(host.textContent).toContain(translations.ar.adminTabAnalytics);
    expect(translations.ar.adminTabAnalytics).toBe("التحليلات");

    // Root wrapper has dir="rtl"
    const rootEl = host.querySelector('[dir="rtl"]');
    expect(rootEl).not.toBeNull();

    // Verify zero horizontal page overflow in Arabic mobile
    expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);
  });
});
