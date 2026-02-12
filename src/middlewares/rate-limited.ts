import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  prefix?: string;
  // When true, rate limits by user ID (falls back to IP if no user)
  byUser?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimitMiddleware(config: RateLimitConfig) {
  return createMiddleware({}).server(async ({ next, context }) => {
    const env = context.env as Env;
    const kv = env.KV;

    const headers = getRequestHeaders();
    const ip =
      headers.get("cf-connecting-ip") ||
      headers.get("x-forwarded-for") ||
      "unknown";

    const prefix = config.prefix || "rl";

    // Build keys to check — always check IP, optionally check user
    const keys: string[] = [`${prefix}:ip:${ip}`];

    // If byUser is enabled and user exists in context (set by authMiddleware),
    // add a user-specific key as well
    const user = (context as any).user;
    if (config.byUser && user?.id) {
      keys.push(`${prefix}:user:${user.id}`);
    }

    const now = Date.now();

    // Check ALL keys — if ANY exceeds the limit, reject
    for (const key of keys) {
      const existing = await kv.get<RateLimitEntry>(key, "json");

      if (existing && existing.resetAt > now) {
        if (existing.count >= config.maxRequests) {
          const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
          throw new Response(
            JSON.stringify({
              error: "Too many requests",
              message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
              retryAfter,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": retryAfter.toString(),
                "X-RateLimit-Limit": config.maxRequests.toString(),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": Math.ceil(
                  existing.resetAt / 1000
                ).toString(),
              },
            }
          );
        }

        // Increment
        const updated: RateLimitEntry = {
          count: existing.count + 1,
          resetAt: existing.resetAt,
        };
        const ttl = Math.ceil((existing.resetAt - now) / 1000);
        await kv.put(key, JSON.stringify(updated), {
          expirationTtl: Math.max(ttl, 60),
        });
      } else {
        // New window
        const entry: RateLimitEntry = {
          count: 1,
          resetAt: now + config.windowMs,
        };
        const ttl = Math.ceil(config.windowMs / 1000);
        await kv.put(key, JSON.stringify(entry), {
          expirationTtl: Math.max(ttl, 60),
        });
      }
    }

    return next({ context });
  });
}

// === Preset rate limiters ===

// Public routes — IP only (no user context available)
export const authRateLimiter = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 10,
  prefix: "rl:auth",
  byUser: false,
});

export const publicInvoiceRateLimiter = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 30,
  prefix: "rl:public",
  byUser: false,
});

// Authenticated routes — IP + User ID
export const apiRateLimiter = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 100,
  prefix: "rl:api",
  byUser: true,
});

export const resourceIntensiveRateLimiter = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 20,
  prefix: "rl:intensive",
  byUser: true,
});

// Webhooks — IP only
export const webhookRateLimiter = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 50,
  prefix: "rl:webhook",
  byUser: false,
});