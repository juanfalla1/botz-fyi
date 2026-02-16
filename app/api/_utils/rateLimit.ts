import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function nowMs() {
  return Date.now();
}

export function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for") || "";
  const first = xf.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

// Initialize Upstash Redis client if env vars are available
function getRedisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    return null;
  }
  
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

const redis = getRedisClient();

/**
 * Sliding window rate limit using Redis (production) or in-memory (fallback)
 * 
 * For production on Vercel:
 * 1. Go to Vercel Dashboard > Your Project > Integrations
 * 2. Add "Upstash Redis" integration
 * 3. This will automatically set KV_REST_API_URL and KV_REST_API_TOKEN
 * 
 * Or manually set:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
export async function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const { key, limit, windowMs } = params;
  const now = nowMs();
  
  // Use Redis if available (distributed, survives cold starts)
  if (redis) {
    try {
      const windowStart = now - windowMs;
      const redisKey = `ratelimit:${key}`;
      
      // Remove old entries outside the window
      await redis.zremrangebyscore(redisKey, 0, windowStart);
      
      // Count current entries in window
      const currentCount = await redis.zcard(redisKey);
      
      if (currentCount >= limit) {
        // Get the oldest entry to calculate reset time
        const oldest = await redis.zrange(redisKey, 0, 0, { withScores: true });
        const resetAt = (Array.isArray(oldest) && oldest.length > 0 && typeof oldest[0] === 'object' && oldest[0] !== null)
          ? Number((oldest[0] as any).score) + windowMs
          : now + windowMs;
        return { ok: false, remaining: 0, resetAt };
      }
      
      // Add current request
      await redis.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
      
      // Set expiry on the key
      await redis.expire(redisKey, Math.ceil(windowMs / 1000));
      
      return { 
        ok: true, 
        remaining: limit - currentCount - 1, 
        resetAt: now + windowMs 
      };
    } catch (error: any) {
      console.error("Redis rate limit error:", error?.message || error);
      // Fall back to in-memory on Redis error
    }
  }
  
  // In-memory fallback (best-effort, per-instance)
  const t = nowMs();
  const b = buckets.get(key);
  if (!b || b.resetAt <= t) {
    const next = { count: 1, resetAt: t + windowMs };
    buckets.set(key, next);
    return { ok: true, remaining: limit - 1, resetAt: next.resetAt };
  }

  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }

  b.count += 1;
  buckets.set(key, b);
  return { ok: true, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}

// Backward compatible synchronous version for simple use cases
export function rateLimitSync(params: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const { key, limit, windowMs } = params;
  const t = nowMs();
  const b = buckets.get(key);
  if (!b || b.resetAt <= t) {
    const next = { count: 1, resetAt: t + windowMs };
    buckets.set(key, next);
    return { ok: true, remaining: limit - 1, resetAt: next.resetAt };
  }

  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }

  b.count += 1;
  buckets.set(key, b);
  return { ok: true, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}
