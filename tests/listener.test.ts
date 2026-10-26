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

  it('ignores untrusted senders and malformed messages', () => {
    const handle = vi.fn();
    const listener = createMessageListener(handle, ID, ORIGIN);
    const sendResponse = vi.fn();
    expect(listener({ type: 'scan/start', tabId: 1 }, { ...popup, tab: {} }, sendResponse)).toBe(
      false,
    );
    expect(listener({ type: 'nope' }, popup, sendResponse)).toBe(false);
    expect(handle).not.toHaveBeenCalled();
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
