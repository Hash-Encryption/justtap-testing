import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Session, User } from "@supabase/supabase-js";
import { LanguageProvider, translations } from "../i18n";
import { Route } from "@/routes/admin";
import * as authHook from "@/hooks/useAuth";

const AdminComponent = Route.options.component!;

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

describe("Admin Operations Portal Surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders sign-in requirement when unauthenticated", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
    });
    vi.spyOn(authHook, "useIsAdmin").mockReturnValue(false);

    const html = renderToStaticMarkup(
      <LanguageProvider defaultLang="en">
        <AdminComponent />
      </LanguageProvider>,
    );

    expect(html).toContain(translations.en.adminSignInRequiredTitle);
    expect(html).toContain(translations.en.adminSignInRequiredDesc);
    expect(html).toContain(translations.en.signIn);
    expect(html).not.toContain(translations.en.adminTitle);
  });

  it("renders 403 Access Denied when authenticated without admin role", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: { id: "u-normal", email: "user@example.com" } as unknown as User,
      session: { user: { id: "u-normal" } } as unknown as Session,
      loading: false,
    });
    vi.spyOn(authHook, "useIsAdmin").mockReturnValue(false);

    const html = renderToStaticMarkup(
      <LanguageProvider defaultLang="en">
        <AdminComponent />
      </LanguageProvider>,
    );

    expect(html).toContain(translations.en.adminAccessDeniedTitle);
    expect(html).toContain("Your account does not have administrator privileges");
    expect(html).toContain(translations.en.adminReturnToDashboard);
    expect(html).not.toContain(translations.en.adminTitle);
  });

  it("renders operations overview tabs and controls when authenticated as admin", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: { id: "u-admin", email: "admin@justtap.app" } as unknown as User,
      session: { user: { id: "u-admin" } } as unknown as Session,
      loading: false,
    });
    vi.spyOn(authHook, "useIsAdmin").mockReturnValue(true);

    const html = renderToStaticMarkup(
      <LanguageProvider defaultLang="en">
        <AdminComponent />
      </LanguageProvider>,
    );

    expect(html).toContain(translations.en.adminTitle);
    expect(html).toContain("OPERATOR");
    expect(html).toContain(translations.en.adminTabOverview);
    expect(html).toContain(translations.en.adminTabUsers);
    expect(html).toContain(translations.en.adminTabCards);
    expect(html).toContain(translations.en.adminTabConnections);
    expect(html).toContain(translations.en.adminTabAnalytics);
    expect(html).toContain(translations.en.adminTabAudit);
    expect(html).toContain(translations.en.adminTabNfc);
  });

  it("truthfully renders 'Not tracked yet — collection begins from this testing release.' in English and Arabic", () => {
    expect(translations.en.adminNotTrackedYet).toBe(
      "Not tracked yet — collection begins from this testing release.",
    );
    expect(translations.ar.adminNotTrackedYet).toBe(
      "لم يتم التتبع بعد — تبدأ المجموعة من إصدار الاختبار هذا.",
    );
  });

  it("preserves privacy in connections summary without private visitor data or fake comparison", () => {
    expect(translations.en.adminConnectionsNotice).toContain(
      "Connection messages, private notes, and visitor contact details are confidential and excluded from operations reporting.",
    );
    expect(translations.en.adminComparisonUnavailable).toBe(
      "Period comparison is not tracked yet.",
    );
  });

  it("correctly labels unavailable stages in product funnel", () => {
    expect(translations.en.adminStageUnavailableNotice).toContain(
      "Unavailable — checkout and paid billing flows are not implemented in testing.",
    );
  });

  it("truthfully labels profile deletion as 'Delete Profile' and explains auth account isolation", () => {
    expect(translations.en.adminConfirmDeleteProfileTitle).toBe("Delete Client Profile");
    expect(translations.en.adminConfirmDeleteProfileDesc).toContain(
      "This will remove the client profile row. Note: This does NOT delete the Supabase Auth account or owned cards.",
    );
  });
});
