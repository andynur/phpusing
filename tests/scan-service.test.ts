import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createScanService } from '../src/entrypoints/background/scan-service';
import { isTrustedSender, parseBroadcast, parseRequest, scanKey } from '../src/shared/messages';
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
    expect(stored).toMatchObject({ origin: ORIGIN, requestsUsed: 28, verdict: 'unknown' });
    expect(await fakeBrowser.storage.local.get(null)).not.toHaveProperty(scanKey(TAB, ORIGIN));
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
