// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isNotFound, randomPath, safeText } from '../src/scanner/baseline';
import { BlockTracker, Budget, LIMITS, ScanRateLimiter } from '../src/scanner/budget';
import { probe } from '../src/scanner/fetch';
import { runScan, trimPlan, type ProbeSpec } from '../src/scanner/scan';
import { fakeFetch } from './helpers/fake-site';

const ORIGIN = 'https://shop.example.com';

function specs(n: number, severity: ProbeSpec['severity'] = 'high'): ProbeSpec[] {
  return Array.from({ length: n }, (_, i) => ({ path: `/p${i}`, severity }));
}

describe('budget primitives', () => {
  it('limits match docs/06_SECURITY_PRIVACY.md', () => {
    expect(LIMITS).toEqual({
      maxRequests: 60,
      concurrency: 3,
      slotDelayMs: 150,
      timeoutMs: 8000,
      readCapBytes: 65536,
      blockStreak: 3,
      scansPerOriginPerMinute: 2,
    });
  });

  it('budget refuses past the cap', () => {
    const b = new Budget(2);
    expect([b.take(), b.take(), b.take()]).toEqual([true, true, false]);
    expect(b.remaining).toBe(0);
  });

  it('block tracker needs consecutive 403/429', () => {
    const t = new BlockTracker();
    expect([403, 429, 200, 403, 403].map((s) => t.record(s))).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(t.record(429)).toBe(true);
  });

  it('allows two scans per origin per minute', () => {
    const r = new ScanRateLimiter();
    expect(r.allow(ORIGIN, 0)).toBe(true);
    expect(r.allow(ORIGIN, 1000)).toBe(true);
    expect(r.allow(ORIGIN, 2000)).toBe(false);
    expect(r.allow('https://other.example', 2000)).toBe(true);
    expect(r.allow(ORIGIN, 60_001)).toBe(true);
  });

  it('trims by severity, keeps order, drops duplicates', () => {
    const plan: ProbeSpec[] = [
      { path: '/a', severity: 'medium' },
      { path: '/b', severity: 'critical' },
      { path: '/b', severity: 'critical' },
      { path: '/c', severity: 'high' },
      { path: '/d', severity: 'critical' },
    ];
    expect(trimPlan(plan, 3).map((p) => p.path)).toEqual(['/b', '/d', '/c']);
  });
});

describe('fetch wrapper', () => {
  it('omits credentials, does not follow redirects, caps the body', async () => {
    let init: RequestInit | undefined;
    const big = 'x'.repeat(200_000);
    const res = await probe(ORIGIN, '/big', {
      fetchImpl: (async (_u: unknown, i?: RequestInit) => {
        init = i;
        return new Response(big, { headers: { 'x-powered-by': 'PHP/8.3.1', 'set-me': 'no' } });
      }) as typeof fetch,
    });
    expect(init).toMatchObject({ credentials: 'omit', redirect: 'manual', cache: 'no-store' });
    expect(res.bodyText.length).toBe(LIMITS.readCapBytes);
    expect(res.headers).toEqual({
      'x-powered-by': 'PHP/8.3.1',
      'content-type': 'text/plain;charset=UTF-8',
    });
    expect(res.bodyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('marks redirects and never reads their body', async () => {
    const res = await probe(ORIGIN, '/telescope', {
      fetchImpl: fakeFetch(() => ({ status: 302, headers: { location: '/login' } })),
    });
    expect(res).toMatchObject({ status: 302, redirected: true, bodyText: '' });
  });

  it('reports timeouts as status 0 instead of throwing', async () => {
    const res = await probe(ORIGIN, '/slow', {
      timeoutMs: 20,
      fetchImpl: fakeFetch(() => ({ delayMs: 1000 })),
    });
    expect(res).toMatchObject({ status: 0, error: 'timeout' });
  });

  it('refuses paths that leave the origin', async () => {
    await expect(probe(ORIGIN, '//evil.example/x')).rejects.toThrow(/outside origin/);
  });
});

describe('soft-404 baseline', () => {
  it('random path looks like /phpusing-<id>', () => {
    expect(randomPath()).toMatch(/^\/phpusing-[0-9a-z]{12}$/);
  });

  it('strips control characters and truncates evidence text', () => {
    expect(safeText('a\u0000b\nc')).toBe('a b c');
    expect(safeText('y'.repeat(100))).toHaveLength(80);
  });

  it('treats copies of the missing page as not found', async () => {
    const site = fakeFetch((p) =>
      p === '/' ? { body: '<title>Shop</title>home' } : { body: `<title>Shop</title>${p}` },
    );
    const run = await runScan({
      origin: ORIGIN,
      signal: new AbortController().signal,
      plan: () => [{ path: '/.env', severity: 'critical' }],
      analyze: () => [],
      fetchImpl: site,
      slotDelayMs: 0,
    });
    const env = run.context.responses.get('/.env');
    expect(env && isNotFound(env, run.context.baseline)).toBe(true);
  });
});

describe('runScan', () => {
  it('never exceeds 60 requests, baseline included', async () => {
    const log: string[] = [];
    const run = await runScan({
      origin: ORIGIN,
      signal: new AbortController().signal,
      plan: () => specs(100),
      analyze: () => [],
      fetchImpl: fakeFetch(() => ({ body: 'ok' }), log),
      slotDelayMs: 0,
    });
    expect(log).toHaveLength(60);
    expect(run.requestsUsed).toBe(60);
    expect(log.slice(0, 2)[0]).toBe('GET /');
  });

  it('runs at most 3 probes at once', async () => {
    let inFlight = 0;
    let peak = 0;
    const base = fakeFetch(() => ({ body: 'ok', delayMs: 5 }));
    const counting = (async (u: RequestInfo | URL, i?: RequestInit) => {
      peak = Math.max(peak, ++inFlight);
      try {
        return await base(u, i);
      } finally {
        inFlight--;
      }
    }) as typeof fetch;
    await runScan({
      origin: ORIGIN,
      signal: new AbortController().signal,
      plan: () => specs(12),
      analyze: () => [],
      fetchImpl: counting,
      slotDelayMs: 0,
    });
    expect(peak).toBe(3);
  });

  it('stops after 3 consecutive 403/429 and reports blocked', async () => {
    const log: string[] = [];
    const run = await runScan({
      origin: ORIGIN,
      signal: new AbortController().signal,
      plan: () => specs(30),
      analyze: () => [],
      fetchImpl: fakeFetch((p) => (p === '/' ? { body: 'home' } : { status: 403 }), log),
      slotDelayMs: 5,
    });
    expect(run.blocked).toBe(true);
    expect(log.length).toBeLessThanOrEqual(2 + 3 + 2);
  });

  it('cancel aborts in-flight requests and rejects', async () => {
    const controller = new AbortController();
    const log: string[] = [];
    const scan = runScan({
      origin: ORIGIN,
      signal: controller.signal,
      plan: () => specs(30),
      analyze: () => [],
      fetchImpl: fakeFetch(() => ({ body: 'ok', delayMs: 50 }), log),
      slotDelayMs: 0,
      onProgress: (p) => {
        if (p.phase === 'probe') controller.abort();
      },
    });
    await expect(scan).rejects.toBeDefined();
    expect(log.length).toBeLessThan(10);
  });

  it('sends HEAD when the plan asks for it', async () => {
    const log: string[] = [];
    await runScan({
      origin: ORIGIN,
      signal: new AbortController().signal,
      plan: () => [{ path: '/x.php', method: 'HEAD', severity: 'critical' }],
      analyze: () => [],
      fetchImpl: fakeFetch(() => ({ body: 'ok' }), log),
      slotDelayMs: 0,
    });
    expect(log).toContain('HEAD /x.php');
  });
});
