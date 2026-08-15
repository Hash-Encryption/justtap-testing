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
});
