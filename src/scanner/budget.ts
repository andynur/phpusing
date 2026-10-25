// Hard limits (docs/06_SECURITY_PRIVACY.md). Changing a value needs a decision entry.
export const LIMITS = {
  maxRequests: 60,
  concurrency: 3,
  slotDelayMs: 150,
  timeoutMs: 8000,
  readCapBytes: 64 * 1024,
  blockStreak: 3,
  scansPerOriginPerMinute: 2,
} as const;

// Counts every request of one scan, baseline included.
export class Budget {
  used = 0;
  constructor(readonly max: number = LIMITS.maxRequests) {}

  get remaining(): number {
    return this.max - this.used;
  }

  take(): boolean {
    if (this.used >= this.max) return false;
    this.used++;
    return true;
  }
}

// Consecutive 403/429 responses mean a WAF or rate limiter is answering, not the site.
export class BlockTracker {
  private streak = 0;
  constructor(private readonly limit: number = LIMITS.blockStreak) {}

  /** Returns true once the streak reaches the limit. */
  record(status: number): boolean {
    this.streak = status === 403 || status === 429 ? this.streak + 1 : 0;
    return this.streak >= this.limit;
  }
}

// Scans per origin per minute. In memory: a service worker restart resets it, which is acceptable.
export class ScanRateLimiter {
  private readonly starts = new Map<string, number[]>();
  constructor(
    private readonly perMinute: number = LIMITS.scansPerOriginPerMinute,
    private readonly windowMs = 60_000,
  ) {}

  allow(origin: string, now: number): boolean {
    const recent = (this.starts.get(origin) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.perMinute) {
      this.starts.set(origin, recent);
      return false;
    }
    this.starts.set(origin, [...recent, now]);
    return true;
  }
}
