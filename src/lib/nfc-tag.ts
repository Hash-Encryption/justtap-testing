import { validateTagToken } from "./token";

export type TagLookupResult =
  { status: "found"; slug: string } | { status: "invalid_token" | "not_found" | "service_error" };

export type TagQueryResult = {
  data: unknown | null;
  error: { code?: string; message?: string } | null;
};

export type TagLookup = (token: string) => Promise<TagQueryResult>;

type ResolveOptions = {
  onServiceError?: (error: unknown) => void;
};

export async function resolveSlugByTagToken(
  input: string,
  lookup: TagLookup,
  options: ResolveOptions = {},
): Promise<TagLookupResult> {
  if (!validateTagToken(input)) {
    return { status: "invalid_token" };
  }

  let result: TagQueryResult;
  try {
    result = await lookup(input);
  } catch (error) {
    options.onServiceError?.(error);
    return { status: "service_error" };
  }

  if (result.error) {
    options.onServiceError?.(result.error);
    return { status: "service_error" };
  }

  if (!result.data) return { status: "not_found" };

  const rows = Array.isArray(result.data) ? result.data : [result.data];
  if (rows.length === 0 || !rows[0] || typeof rows[0] !== "object") {
    return { status: "not_found" };
  }

  const slug = (rows[0] as { slug?: string }).slug;
  if (!slug || typeof slug !== "string") {
    return { status: "not_found" };
  }

  return { status: "found", slug };
}
