interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * In-memory sliding window rate limiter.
 * @param key Unique identifier (e.g. `lead:${card_id}`, `vcard:${slug}`)
 * @param limit Maximum allowed attempts within window
 * @param windowMs Time window in milliseconds (default: 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();

  // Lazy cleanup of expired entries to avoid memory leaks without top-level timers
  if (memoryStore.size > 100) {
    for (const [k, rec] of memoryStore.entries()) {
      if (now > rec.resetAt) {
        memoryStore.delete(k);
      }
    }
  }

  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, record.resetAt - now),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetMs: Math.max(0, record.resetAt - now),
  };
}
