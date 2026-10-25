import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { App } from '../src/entrypoints/popup/App';
import { revoke } from '../src/shared/consent';
import { I18nProvider } from '../src/shared/i18n/I18nProvider';

const ORIGIN = 'https://shop.example.com';

function renderPopup() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

function activeTab(url: string) {
  vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () => [{ id: 7, url }] as never);
}

let granted: Set<string>;
let requests: unknown[];

beforeEach(() => {
  granted = new Set();
  requests = [];
  vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(async (m: unknown) => {
    requests.push(m);
    return { ok: true };
  });
  vi.spyOn(fakeBrowser.permissions, 'contains').mockImplementation(async (p) =>
    (p.origins ?? []).every((o) => granted.has(o)),
  );
  vi.spyOn(fakeBrowser.permissions, 'remove').mockImplementation(async (p) => {
    (p.origins ?? []).forEach((o) => granted.delete(o));
    return true;
  });
});

describe('popup check flow', () => {
  it('needs consent, then requests permission for that origin only', async () => {
    activeTab(`${ORIGIN}/cart?id=7`);
    const request = vi.spyOn(fakeBrowser.permissions, 'request').mockImplementation(async (p) => {
      (p.origins ?? []).forEach((o) => granted.add(o));
      return true;
    });
    renderPopup();

    const button = await screen.findByRole('button', { name: 'Check this site' });
    expect(screen.getByText(ORIGIN)).toBeInTheDocument();
    expect(button).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox', { name: /I own this site/ }));
    await userEvent.click(button);

    expect(request).toHaveBeenCalledWith({ origins: [`${ORIGIN}/*`] });
    expect(await screen.findByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(requests).toEqual([{ type: 'scan/start', tabId: 7 }]);
    expect((await fakeBrowser.storage.local.get('authorizedOrigins')).authorizedOrigins).toEqual([
      ORIGIN,
    ]);
  });

  it('stores nothing when Chrome permission is denied', async () => {
    activeTab(`${ORIGIN}/`);
    vi.spyOn(fakeBrowser.permissions, 'request').mockImplementation(async () => false);
    renderPopup();

    await userEvent.click(await screen.findByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Check this site' }));

    expect(await screen.findByText(/Chrome access was not allowed/)).toBeInTheDocument();
    expect((await fakeBrowser.storage.local.get('authorizedOrigins')).authorizedOrigins).toBe(
      undefined,
    );
  });

  it('skips the checkbox for an origin already authorized', async () => {
    activeTab(`${ORIGIN}/`);
    await fakeBrowser.storage.local.set({ authorizedOrigins: [ORIGIN] });
    renderPopup();

    expect(await screen.findByRole('button', { name: 'Check this site' })).toBeEnabled();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows progress, then the verdict from the background', async () => {
    activeTab(`${ORIGIN}/`);
    granted.add(`${ORIGIN}/*`);
    await fakeBrowser.storage.local.set({ authorizedOrigins: [ORIGIN] });
    vi.spyOn(fakeBrowser.permissions, 'request').mockImplementation(async () => true);
    renderPopup();
    await userEvent.click(await screen.findByRole('button', { name: 'Check this site' }));

    await act(() =>
      fakeBrowser.runtime.onMessage.trigger(
        { type: 'scan/progress', tabId: 7, done: 12, total: 41, phase: 'probe' },
        {},
        () => {},
      ),
    );
    expect(screen.getByRole('progressbar', { name: '12 of 41 checks' })).toBeInTheDocument();

    // Another tab's progress is ignored.
    await act(() =>
      fakeBrowser.runtime.onMessage.trigger(
        { type: 'scan/progress', tabId: 8, done: 1, total: 41, phase: 'probe' },
        {},
        () => {},
      ),
    );
    expect(screen.getByRole('progressbar', { name: '12 of 41 checks' })).toBeInTheDocument();

    await act(() =>
      fakeBrowser.runtime.onMessage.trigger(
        {
          type: 'scan/result',
          tabId: 7,
          result: {
            origin: ORIGIN,
            startedAt: '2026-10-25T00:00:00.000Z',
            requestsUsed: 41,
            fingerprint: {},
            findings: [],
            verdict: 'unknown',
            dataVersion: '',
          },
        },
        {},
        () => {},
      ),
    );
    expect(screen.getByRole('heading', { name: "Can't tell yet" })).toBeInTheDocument();
    expect(screen.getByText('41 requests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
  });

  it('explains a refused start and keeps the button', async () => {
    activeTab(`${ORIGIN}/`);
    granted.add(`${ORIGIN}/*`);
    await fakeBrowser.storage.local.set({ authorizedOrigins: [ORIGIN] });
    vi.spyOn(fakeBrowser.permissions, 'request').mockImplementation(async () => true);
    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(async () => ({
      ok: false,
      reason: 'rate-limited',
    }));
    renderPopup();
    await userEvent.click(await screen.findByRole('button', { name: 'Check this site' }));
    expect(await screen.findByText(/checked twice in the last minute/)).toBeInTheDocument();
  });

  it('refuses browser pages and local targets', async () => {
    activeTab('chrome://extensions');
    const { unmount } = renderPopup();
    expect(await screen.findByText(/This page can't be checked/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check this site' })).toBeNull();
    unmount();

    activeTab('http://localhost:8000/');
    renderPopup();
    expect(await screen.findByText(/Local and private network/)).toBeInTheDocument();
  });
});

describe('consent revoke', () => {
  it('removes the origin and its host permission', async () => {
    granted.add(`${ORIGIN}/*`);
    await fakeBrowser.storage.local.set({ authorizedOrigins: [ORIGIN, 'https://b.example'] });

    await revoke(ORIGIN);

    await waitFor(async () => {
      expect((await fakeBrowser.storage.local.get('authorizedOrigins')).authorizedOrigins).toEqual([
        'https://b.example',
      ]);
    });
    expect(granted.has(`${ORIGIN}/*`)).toBe(false);
  });
});
