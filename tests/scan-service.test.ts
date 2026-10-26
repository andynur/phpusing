import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createScanService } from '../src/entrypoints/background/scan-service';
import { isTrustedSender, parseBroadcast, parseRequest, scanKey } from '../src/shared/messages';
import snapshot from '../data/snapshot/advisories.json';
import subset from './fixtures/VU-02/advisories.json';
import { fakeFetch } from './helpers/fake-site';

const ORIGIN = 'https://shop.example.com';
const TAB = 7;

let sent: unknown[];

beforeEach(async () => {
  sent = [];
  vi.spyOn(fakeBrowser.tabs, 'get').mockImplementation(
    async () => ({ id: TAB, url: `${ORIGIN}/cart` }) as never,
  );
  vi.spyOn(fakeBrowser.permissions, 'contains').mockImplementation(async () => true);
  vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(async (m: unknown) => {
    sent.push(m);
  });
  await fakeBrowser.storage.local.set({ authorizedOrigins: [ORIGIN] });
});

function done() {
  return vi.waitFor(() => {
    const last = sent.at(-1) as { type?: string } | undefined;
    if (last?.type !== 'scan/result' && last?.type !== 'scan/error') throw new Error('running');
    return last;
  });
}

describe('scan service', () => {
  it('scans an authorized origin and stores the result in session storage', async () => {
    const service = createScanService({
      slotDelayMs: 0,
      fetchImpl: fakeFetch(() => ({ body: 'ok' })),
    });
    expect(await service.handle({ type: 'scan/start', tabId: TAB })).toEqual({ ok: true });
    const last = await done();
    expect(parseBroadcast(last)?.type).toBe('scan/result');
    const stored = (await fakeBrowser.storage.session.get(scanKey(TAB, ORIGIN)))[
      scanKey(TAB, ORIGIN)
    ];
    expect(stored).toMatchObject({
      origin: ORIGIN,
      requestsUsed: 32,
      verdict: 'unknown',
      dataVersion: '2026-10-25.1',
    });
    expect(await fakeBrowser.storage.local.get(null)).not.toHaveProperty(scanKey(TAB, ORIGIN));
  });

  it('marks a major verdict on the toolbar badge', async () => {
    const badge = vi.spyOn(fakeBrowser.action, 'setBadgeText').mockImplementation(async () => {});
    const service = createScanService({
      slotDelayMs: 0,
      fetchImpl: fakeFetch((p) =>
        p === '/.git/HEAD' ? { body: 'ref: refs/heads/main\n' } : undefined,
      ),
    });
    await service.handle({ type: 'scan/start', tabId: TAB });
    const last = parseBroadcast(await done());
    expect(last?.type === 'scan/result' && last.result.verdict).toBe('major');
    expect(badge).toHaveBeenCalledWith({ tabId: TAB, text: '!' });
  });

  it('audits an exposed composer.lock against stored package advisories', async () => {
    await fakeBrowser.storage.local.set({
      advisoryData: { ...snapshot, version: '2026-10-26.4', packages: subset.packages },
    });
    const lock = JSON.stringify({
      'content-hash': '0123456789abcdef0123456789abcdef',
      packages: [{ name: 'guzzlehttp/guzzle', version: '7.4.3' }],
    });
    const service = createScanService({
      slotDelayMs: 0,
      fetchImpl: fakeFetch((p) => (p === '/composer.lock' ? { body: lock } : undefined)),
      now: () => Date.parse('2026-10-26T12:00:00Z'),
    });
    await service.handle({ type: 'scan/start', tabId: TAB });
    const last = parseBroadcast(await done());
    const result = last?.type === 'scan/result' ? last.result : null;
    expect(result?.dataVersion).toBe('2026-10-26.4');
    expect(result?.findings.map((f) => f.checkId)).toEqual(
      expect.arrayContaining(['EX-04', 'VU-02']),
    );
    expect(JSON.stringify(result)).not.toContain('0123456789abcdef');
  });

  it('refuses origins without consent or host permission', async () => {
    await fakeBrowser.storage.local.set({ authorizedOrigins: [] });
    const service = createScanService({ slotDelayMs: 0, fetchImpl: fakeFetch(() => ({})) });
    expect(await service.handle({ type: 'scan/start', tabId: TAB })).toEqual({
      ok: false,
      reason: 'not-authorized',
    });
  });

  it('refuses a second scan in the same tab and the third scan in a minute', async () => {
    let t = 0;
    const service = createScanService({
      slotDelayMs: 0,
      fetchImpl: fakeFetch(() => ({ body: 'ok', delayMs: 20 })),
      now: () => t,
    });
    expect(await service.handle({ type: 'scan/start', tabId: TAB })).toEqual({ ok: true });
    expect(await service.handle({ type: 'scan/start', tabId: TAB })).toEqual({
      ok: false,
      reason: 'busy',
    });
    await done();
    t = 1000;
    expect(await service.handle({ type: 'scan/start', tabId: TAB })).toEqual({ ok: true });
    await vi.waitFor(() => expect(service.isRunning(TAB)).toBe(false));
    expect(await service.handle({ type: 'scan/start', tabId: TAB })).toEqual({
      ok: false,
      reason: 'rate-limited',
    });
  });

  it('cancel stops the scan and reports cancelled', async () => {
    const service = createScanService({
      slotDelayMs: 0,
      fetchImpl: fakeFetch(() => ({ body: 'ok', delayMs: 50 })),
    });
    await service.handle({ type: 'scan/start', tabId: TAB });
    await service.handle({ type: 'scan/cancel', tabId: TAB });
    expect(await done()).toMatchObject({ type: 'scan/error', reason: 'cancelled' });
  });
});

describe('messages', () => {
  it('validates requests and broadcasts at runtime', () => {
    expect(parseRequest({ type: 'scan/start', tabId: 3 })).toEqual({
      type: 'scan/start',
      tabId: 3,
    });
    expect(parseRequest({ type: 'scan/start', tabId: '3' })).toBeNull();
    expect(parseRequest({ type: 'scan/delete', tabId: 3 })).toBeNull();
    expect(parseRequest({ type: 'data/update', url: 'https://evil.example/' })).toEqual({
      type: 'data/update',
    });
    expect(parseBroadcast({ type: 'scan/error', tabId: 1, reason: 'nope' })).toBeNull();
    expect(
      parseBroadcast({ type: 'scan/progress', tabId: 1, done: 1, total: 2, phase: 'probe' }),
    ).not.toBeNull();
  });

  it('trusts only extension pages of this extension', () => {
    const ext = 'chrome-extension://abc/';
    expect(isTrustedSender({ id: 'abc', url: `${ext}popup.html` }, 'abc', ext)).toBe(true);
    expect(isTrustedSender({ id: 'xyz', url: `${ext}popup.html` }, 'abc', ext)).toBe(false);
    expect(
      isTrustedSender({ id: 'abc', url: 'https://shop.example.com/', tab: {} }, 'abc', ext),
    ).toBe(false);
  });
});
