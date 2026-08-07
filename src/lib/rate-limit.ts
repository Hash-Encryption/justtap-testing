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

/** Periodic cleanup to avoid memory leaks from stale IP/rate-limit records */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 300_000);
}
