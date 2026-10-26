import { describe, expect, it, vi } from 'vitest';
import { createMessageListener } from '../src/entrypoints/background/listener';

const ID = 'ext-id';
const ORIGIN = 'chrome-extension://ext-id/';
const popup = { id: ID, url: `${ORIGIN}popup.html` };

describe('background message listener', () => {
  it('replies through sendResponse and keeps the channel open', async () => {
    const listener = createMessageListener(async () => ({ ok: true }), ID, ORIGIN);
    const sendResponse = vi.fn();
    expect(listener({ type: 'scan/start', tabId: 1 }, popup, sendResponse)).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ ok: true }));
  });

  it('replies failed when the handler throws', async () => {
    const listener = createMessageListener(
      () => {
        throw new Error('boom');
      },
      ID,
      ORIGIN,
    );
    const sendResponse = vi.fn();
    expect(listener({ type: 'scan/cancel', tabId: 1 }, popup, sendResponse)).toBe(true);
    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith({ ok: false, reason: 'failed' }),
    );
  });

  it('answers the report page, which Chrome sends with sender.tab set', async () => {
    const listener = createMessageListener(
      async () => ({ ok: true, status: 'updated', version: '2026-10-26.6' }),
      ID,
      ORIGIN,
    );
    const sendResponse = vi.fn();
    const report = { id: ID, url: `${ORIGIN}report.html?tab=7`, tab: { id: 8 } };
    expect(listener({ type: 'data/update' }, report, sendResponse)).toBe(true);
    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ ok: true })),
    );
  });

  it('ignores untrusted senders and malformed messages', () => {
    const handle = vi.fn();
    const listener = createMessageListener(handle, ID, ORIGIN);
    const sendResponse = vi.fn();
    const webPage = { id: ID, url: 'https://shop.example.com/', tab: { id: 1 } };
    expect(listener({ type: 'scan/start', tabId: 1 }, webPage, sendResponse)).toBe(false);
    expect(
      listener({ type: 'scan/start', tabId: 1 }, { ...popup, id: 'other' }, sendResponse),
    ).toBe(false);
    expect(listener({ type: 'nope' }, popup, sendResponse)).toBe(false);
    expect(handle).not.toHaveBeenCalled();
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
