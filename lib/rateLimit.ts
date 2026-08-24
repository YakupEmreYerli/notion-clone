/**
 * Süreç içi (in-memory) sabit pencereli sayaç.
 *
 * Zotion tek Next.js süreci olarak çalıştığı için (docker-compose'da tek `app`
 * servisi) bu yeterli. Uygulama birden fazla replikaya çıkarılırsa sayaç
 * replika başına tutulacağından etkin limit replika sayısıyla çarpılır —
 * o noktada paylaşımlı bir sayaca (Redis vb.) taşınmalı.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Sayaç sızıntısını önlemek için süresi dolmuş kayıtları ara sıra temizle.
const PRUNE_EVERY = 500;
let writes = 0;

const prune = (now: number) => {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Sıradaki denemeye kalan saniye — sadece `ok: false` iken anlamlı. */
  retryAfter: number;
};

export const rateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult => {
  const now = Date.now();

  if (++writes % PRUNE_EVERY === 0) prune(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
};
