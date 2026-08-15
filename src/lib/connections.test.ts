import { describe, expect, it } from "vitest";
import {
  buildConnectionsCsv,
  getConnectionContactLinks,
  parseConnectionTags,
  type Connection,
} from "./connections";

const connection: Connection = {
  id: "connection-1",
  sender_name: '=HYPERLINK("https://bad.example","Click")',
  sender_phone: "+966 50 123 4567",
  sender_email: null,
  sender_company: "-Smith, Sons & Co.",
  sender_job_title: "@Founder",
  note: 'Line one\r\nLine "two"',
  owner_note: "+SUM(1,1)",
  status: "follow_up",
  tags: ["event", "priority"],
  created_at: "2026-08-15T10:00:00.000Z",
  updated_at: "2026-08-15T10:30:00.000Z",
};

describe("Connections utilities", () => {
  it("exports valid quoted CSV and neutralizes spreadsheet formulas", () => {
    const csv = buildConnectionsCsv([connection]);

    expect(csv).toContain('"\'=HYPERLINK(""https://bad.example"",""Click"")"');
    expect(csv).toContain('"\'-Smith, Sons & Co."');
    expect(csv).toContain('"\'@Founder"');
    expect(csv).toContain('"Line one\r\nLine ""two"""');
    expect(csv).toContain('"\'+SUM(1,1)"');
    expect(csv).toContain('"event, priority"');
    expect(csv).toContain(',"",');
  });

  it("keeps call links local but requires an explicit country code for WhatsApp", () => {
    expect(getConnectionContactLinks("+966 50 123 4567", "person@example.com")).toEqual({
      call: "tel:+966501234567",
      whatsapp: "https://wa.me/966501234567",
      email: "mailto:person@example.com",
    });
    expect(getConnectionContactLinks("050 123 4567", null)).toEqual({
      call: "tel:0501234567",
      whatsapp: null,
      email: null,
    });
  });

  it("deduplicates tags and enforces the database limits before saving", () => {
    expect(parseConnectionTags("event, priority, event")).toEqual(["event", "priority"]);
    expect(() =>
      parseConnectionTags(Array.from({ length: 21 }, (_, i) => `tag-${i}`).join(",")),
    ).toThrow("Use no more than 20 tags.");
    expect(() => parseConnectionTags("x".repeat(41))).toThrow(
      "Each tag must be 40 characters or less.",
    );
  });
});
