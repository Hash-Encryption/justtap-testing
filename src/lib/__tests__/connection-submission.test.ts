import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LeadSubmissionSchema } from "../sanitization";

const validSubmission = {
  card_slug: "public-card",
  sender_name: "زائر دولي",
  sender_phone: "+44 (20) 7946-0958",
  sender_email: "visitor@example.com",
  sender_company: "شركة عالمية",
  sender_job_title: "Product Lead",
  note: "Please follow up next week.",
};

describe("Connection submission contract", () => {
  it("accepts required and optional visitor fields while preserving Unicode", () => {
    expect(LeadSubmissionSchema.parse(validSubmission)).toEqual(validSubmission);
  });

  it("normalizes blank optional values to null", () => {
    const parsed = LeadSubmissionSchema.parse({
      card_slug: "public-card",
      sender_name: "Visitor",
      sender_phone: "+966 50 123 4567",
      sender_email: "",
      sender_company: "",
      sender_job_title: "",
      note: "",
    });

    expect(parsed).toMatchObject({
      sender_email: null,
      sender_company: null,
      sender_job_title: null,
      note: null,
    });
  });

  it.each([
    ["missing name", { ...validSubmission, sender_name: "" }],
    ["missing phone", { ...validSubmission, sender_phone: "" }],
    ["invalid email", { ...validSubmission, sender_email: "not-an-email" }],
    ["long name", { ...validSubmission, sender_name: "n".repeat(101) }],
    ["long phone", { ...validSubmission, sender_phone: "1".repeat(31) }],
    ["long email", { ...validSubmission, sender_email: `${"a".repeat(245)}@example.com` }],
    ["long company", { ...validSubmission, sender_company: "c".repeat(161) }],
    ["long job title", { ...validSubmission, sender_job_title: "j".repeat(161) }],
    ["long note", { ...validSubmission, note: "n".repeat(1001) }],
    ["privileged owner note", { ...validSubmission, owner_note: "public write" }],
    ["privileged status", { ...validSubmission, status: "done" }],
    ["privileged tags", { ...validSubmission, tags: ["private"] }],
  ])("rejects %s", (_label, submission) => {
    expect(LeadSubmissionSchema.safeParse(submission).success).toBe(false);
  });

  it("keeps public capture slug-driven and private management database-enforced", () => {
    const renderer = readFileSync(
      new URL("../../components/card/CardView.tsx", import.meta.url),
      "utf8",
    );
    const migration = readFileSync(
      new URL(
        "../../../supabase/migrations/20260815010000_connections_data_model.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const publicFunction = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.create_public_connection"),
      migration.indexOf("REVOKE ALL ON FUNCTION public.create_public_connection"),
    );

    expect(renderer).toContain('rpc("create_public_connection"');
    expect(renderer).toContain("_card_slug: sanitized.card_slug");
    expect(renderer).not.toContain('from("card_leads").insert');
    expect(renderer).toContain("submissionInFlight.current");
    expect(renderer).toContain('data-connection-state="success"');
    expect(migration).toContain("REVOKE ALL ON TABLE public.card_leads FROM anon");
    expect(migration).toContain("GRANT UPDATE (owner_note, status, tags)");
    expect(migration).toContain("profile.plan_tier IN ('pro', 'enterprise')");
    expect(publicFunction).not.toMatch(/\b_(?:owner_note|status|tags)\b/);
  });

  it("renders distinct dashboard loading, empty, error, and data states", () => {
    const dashboard = readFileSync(
      new URL("../../components/dashboard/LeadsTab.tsx", import.meta.url),
      "utf8",
    );

    expect(dashboard).toContain("{loading && (");
    expect(dashboard).toContain("{!loading && error && (");
    expect(dashboard).toContain("connections.length === 0");
    expect(dashboard).toContain("connections.length > 0");
    expect(dashboard).toContain("sender_company");
    expect(dashboard).toContain("sender_job_title");
    expect(dashboard).toContain("Visitor note");
  });
});
