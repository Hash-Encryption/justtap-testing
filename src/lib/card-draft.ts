import type { Card } from "./card";

export const CARD_DRAFT_TTL_MS = 3 * 24 * 60 * 60 * 1000;
export const GUEST_DRAFT_CARD_ID = "builder";
export const NEW_CARD_DRAFT_ID = "new";

const CARD_DRAFT_VERSION = 1;

export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type CardDraftFields = Omit<
  Card,
  "id" | "user_id" | "plan_tier" | "is_active" | "created_at"
>;

export type StoredCardDraft = {
  version: typeof CARD_DRAFT_VERSION;
  userId: string;
  cardId: string;
  fields: CardDraftFields;
  updatedAt: number;
  expiresAt: number;
};

export function getCardDraftId(userId: string, card: Pick<Card, "id">): string {
  if (userId === "guest") return GUEST_DRAFT_CARD_ID;
  return card.id || NEW_CARD_DRAFT_ID;
}

export function getCardDraftKey(userId: string, cardId: string): string {
  return userId === "guest"
    ? `justtap:v2:guest-draft:${cardId}`
    : `justtap:v2:draft:${userId}:${cardId}`;
}

function draftFields(card: Card): CardDraftFields {
  const {
    id: _id,
    user_id: _userId,
    plan_tier: _planTier,
    is_active: _isActive,
    created_at: _createdAt,
    ...fields
  } = card;

  return {
    ...fields,
    avatar_url: fields.avatar_url?.startsWith("data:") ? null : fields.avatar_url,
    logo_url: fields.logo_url?.startsWith("data:") ? null : fields.logo_url,
  };
}

function isStoredCardDraft(
  value: unknown,
  userId: string,
  cardId: string,
): value is StoredCardDraft {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCardDraft>;
  const fields = candidate.fields as Partial<CardDraftFields> | undefined;
  const nullableStrings = fields
    ? [
        fields.email,
        fields.title,
        fields.company,
        fields.bio,
        fields.avatar_url,
        fields.logo_url,
        fields.whatsapp_phone,
        fields.whatsapp_message,
        fields.full_name_ar,
        fields.title_ar,
        fields.bio_ar,
      ]
    : [];
  const optionalStrings = fields
    ? [
        fields.design_mode,
        fields.surface_color,
        fields.champagne_accent,
        fields.text_color,
        fields.surface_finish,
        fields.border_radius,
        fields.font_family,
      ]
    : [];
  const isOptionalRecord = (record: unknown) =>
    record == null ||
    (!Array.isArray(record) &&
      typeof record === "object" &&
      Object.values(record).every(
        (entry) => entry == null || typeof entry === "string" || typeof entry === "boolean",
      ));

  return (
    candidate.version === CARD_DRAFT_VERSION &&
    candidate.userId === userId &&
    candidate.cardId === cardId &&
    typeof candidate.updatedAt === "number" &&
    Number.isFinite(candidate.updatedAt) &&
    typeof candidate.expiresAt === "number" &&
    Number.isFinite(candidate.expiresAt) &&
    !!fields &&
    typeof fields.full_name === "string" &&
    typeof fields.phone === "string" &&
    typeof fields.slug === "string" &&
    typeof fields.header_pattern === "string" &&
    typeof fields.accent_color === "string" &&
    typeof fields.bg_color === "string" &&
    typeof fields.show_logo_badge === "boolean" &&
    typeof fields.enable_arabic === "boolean" &&
    nullableStrings.every((field) => field === null || typeof field === "string") &&
    optionalStrings.every((field) => field === undefined || typeof field === "string") &&
    !fields.avatar_url?.startsWith("data:") &&
    !fields.logo_url?.startsWith("data:") &&
    isOptionalRecord(fields.social_links) &&
    isOptionalRecord(fields.pro_features) &&
    !("id" in fields) &&
    !("user_id" in fields) &&
    !("plan_tier" in fields) &&
    !("is_active" in fields) &&
    !("created_at" in fields)
  );
}

function removeDraft(storage: DraftStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* storage can be unavailable */
  }
}

export function writeCardDraft(
  storage: DraftStorage,
  userId: string,
  card: Card,
  now = Date.now(),
): StoredCardDraft {
  const cardId = getCardDraftId(userId, card);
  const stored: StoredCardDraft = {
    version: CARD_DRAFT_VERSION,
    userId,
    cardId,
    fields: draftFields(card),
    updatedAt: now,
    expiresAt: now + CARD_DRAFT_TTL_MS,
  };
  storage.setItem(getCardDraftKey(userId, cardId), JSON.stringify(stored));
  return stored;
}

export function readCardDraft(
  storage: DraftStorage,
  userId: string,
  cardId: string,
  now = Date.now(),
): StoredCardDraft | null {
  const key = getCardDraftKey(userId, cardId);

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredCardDraft(parsed, userId, cardId) || parsed.expiresAt <= now) {
      removeDraft(storage, key);
      return null;
    }
    return parsed;
  } catch {
    removeDraft(storage, key);
    return null;
  }
}

export function migrateLegacyCardDraft(
  storage: DraftStorage,
  userId: string,
  serverCard: Card,
  now = Date.now(),
): StoredCardDraft | null {
  const legacyKey =
    userId === "guest" ? "justtap_guest_pending_card" : `justtap_card_draft_${userId}`;

  try {
    const raw = storage.getItem(legacyKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { card?: Card; updatedAt?: number } | Card;
    const legacyCard = "card" in parsed && parsed.card ? parsed.card : (parsed as Card);
    const updatedAt = "updatedAt" in parsed ? parsed.updatedAt : undefined;
    const expectedCardId = getCardDraftId(userId, serverCard);
    if (
      !legacyCard ||
      typeof legacyCard.full_name !== "string" ||
      typeof legacyCard.phone !== "string" ||
      typeof legacyCard.slug !== "string" ||
      legacyCard.user_id !== userId ||
      typeof updatedAt !== "number" ||
      !Number.isFinite(updatedAt) ||
      now - updatedAt >= CARD_DRAFT_TTL_MS
    ) {
      removeDraft(storage, legacyKey);
      return null;
    }
    if (getCardDraftId(userId, legacyCard) !== expectedCardId) return null;

    const migrated = writeCardDraft(storage, userId, { ...serverCard, ...legacyCard }, updatedAt);
    removeDraft(storage, legacyKey);
    return migrated;
  } catch {
    removeDraft(storage, legacyKey);
    return null;
  }
}

export function applyCardDraft(serverCard: Card, stored: StoredCardDraft): Card {
  return {
    ...serverCard,
    ...stored.fields,
    id: serverCard.id,
    user_id: serverCard.user_id,
    plan_tier: serverCard.plan_tier,
    is_active: serverCard.is_active,
    created_at: serverCard.created_at,
  };
}

export function recoverNewerCardDraft(
  currentCard: Card,
  currentUpdatedAt: number,
  stored: StoredCardDraft | null,
): { card: Card; updatedAt: number; restored: boolean } {
  if (!stored || stored.updatedAt <= currentUpdatedAt) {
    return { card: currentCard, updatedAt: currentUpdatedAt, restored: false };
  }
  return { card: applyCardDraft(currentCard, stored), updatedAt: stored.updatedAt, restored: true };
}

export function canPersistCardDraft(
  hydratedKey: string | null,
  currentKey: string,
  isDirty: boolean,
): boolean {
  return hydratedKey === currentKey && isDirty;
}

export function clearCardDraft(storage: DraftStorage, userId: string, cardId: string): void {
  removeDraft(storage, getCardDraftKey(userId, cardId));
}

export function reconcileCardDraftAfterSave(
  storage: DraftStorage,
  userId: string,
  cardId: string,
  saved: boolean,
): void {
  if (saved) clearCardDraft(storage, userId, cardId);
}
