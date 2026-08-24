export const CONNECTION_STATUSES = ["new", "follow_up", "contacted", "done"] as const;

export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export type Connection = {
  id: string;
  sender_name: string;
  sender_phone: string;
  sender_email: string | null;
  sender_company: string | null;
  sender_job_title: string | null;
  note: string | null;
  owner_note: string | null;
  status: ConnectionStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
};

const CSV_COLUMNS: [string, keyof Connection][] = [
  ["Name", "sender_name"],
  ["Phone", "sender_phone"],
  ["Email", "sender_email"],
  ["Company", "sender_company"],
  ["Job Title", "sender_job_title"],
  ["Visitor Note", "note"],
  ["Owner Note", "owner_note"],
  ["Status", "status"],
  ["Tags", "tags"],
  ["Created At", "created_at"],
  ["Updated At", "updated_at"],
];

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  const formulaSafe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

export function buildConnectionsCsv(connections: Connection[]) {
  return [
    CSV_COLUMNS.map(([label]) => csvCell(label)).join(","),
    ...connections.map((connection) =>
      CSV_COLUMNS.map(([, key]) => csvCell(connection[key])).join(","),
    ),
  ].join("\r\n");
}

export function parseConnectionTags(value: string) {
  const tags = [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
  if (tags.length > 20) throw new Error("Use no more than 20 tags.");
  if (tags.some((tag) => tag.length > 40))
    throw new Error("Each tag must be 40 characters or less.");
  return tags;
}

export function getConnectionContactLinks(phone: string, email: string | null) {
  const rawPhone = phone.trim();
  const callable = rawPhone.replace(/(?!^)\+|[^\d+]/g, "");
  const explicitInternational = rawPhone.startsWith("+")
    ? rawPhone.slice(1).replace(/\D/g, "")
    : rawPhone.startsWith("00")
      ? rawPhone.slice(2).replace(/\D/g, "")
      : "";

  return {
    call: /^\+?\d{3,30}$/.test(callable) ? `tel:${callable}` : null,
    whatsapp: /^\d{7,15}$/.test(explicitInternational)
      ? `https://wa.me/${explicitInternational}`
      : null,
    email: email?.trim() ? `mailto:${email.trim()}` : null,
  };
}
