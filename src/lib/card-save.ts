import { validateSlug } from "./slug";

export type CardSaveDatabaseResult<T> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
};

export type CardSaveGateway<T> = {
  insert: (payload: Record<string, unknown>) => Promise<CardSaveDatabaseResult<T>>;
  update: (
    cardId: string,
    userId: string,
    payload: Record<string, unknown>,
  ) => Promise<CardSaveDatabaseResult<T>>;
};

export type SaveCardRecordResult<T> =
  { status: "saved"; card: T } | { status: "invalid_slug" | "duplicate_slug" | "service_error" };

type SaveCardRecordInput = {
  isNew: boolean;
  cardId: string;
  userId: string;
  payload: Record<string, unknown>;
};

export async function saveCardRecord<T>(
  input: SaveCardRecordInput,
  gateway: CardSaveGateway<T>,
  onServiceError?: (error: unknown) => void,
): Promise<SaveCardRecordResult<T>> {
  const slugResult = validateSlug(String(input.payload.slug ?? ""));
  if (!slugResult.valid) return { status: "invalid_slug" };

  const payload = { ...input.payload, slug: slugResult.slug };

  try {
    const result = input.isNew
      ? await gateway.insert(payload)
      : await gateway.update(input.cardId, input.userId, payload);

    if (result.error?.code === "23505") return { status: "duplicate_slug" };
    if (result.error || !result.data) {
      onServiceError?.(result.error ?? new Error("Card save returned no data"));
      return { status: "service_error" };
    }

    return { status: "saved", card: result.data };
  } catch (error) {
    onServiceError?.(error);
    return { status: "service_error" };
  }
}
