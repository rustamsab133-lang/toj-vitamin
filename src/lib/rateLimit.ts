/**
 * Simple in-memory rate limiter for API routes.
 * 
 * On Vercel Serverless, each invocation may run in a separate process,
 * so this provides best-effort limiting. For strict enforcement,
 * replace with Redis-based solution (e.g. Upstash).
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  store.forEach((entry, key) => {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  });
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

/** Default: 10 requests per 60 seconds */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowSeconds: 60,
};

/** Stricter limit for expensive operations (e.g. image generation) */
export const STRICT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowSeconds: 60,
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

/**
 * Check rate limit for a given identifier (usually IP address).
 * Returns { success: true } if within limits, { success: false } if exceeded.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  cleanup();

  const key = `${identifier}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired — start new window
    store.set(key, {
      count: 1,
      resetTime: now + config.windowSeconds * 1000,
    });
    return { success: true, remaining: config.maxRequests - 1, resetIn: config.windowSeconds };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);
    return { success: false, remaining: 0, resetIn };
  }

  // Increment counter
  entry.count++;
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);
  return { success: true, remaining: config.maxRequests - entry.count, resetIn };
}

/**
 * Extract client IP from NextRequest headers.
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
