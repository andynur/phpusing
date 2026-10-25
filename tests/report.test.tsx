import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { makeFinding } from '../src/checks/finding';
import { App, isStale } from '../src/entrypoints/report/App';
import { developerMessage } from '../src/shared/developer-message';
import { I18nProvider } from '../src/shared/i18n/I18nProvider';
import { scanKey } from '../src/shared/messages';
import { parseReportQuery, reportPath } from '../src/shared/report-url';
import type { ScanResult } from '../src/shared/types';

const ORIGIN = 'https://shop.example.com';
const env = makeFinding('EX-01', 'critical', 'confirmed', [
  'GET /.env → 200',
  'keys: APP_KEY, DB_PASSWORD',
]);
const listing = makeFinding('CF-04', 'high', 'confirmed', ['GET /uploads/ → 200']);

const RESULT: ScanResult = {
  origin: ORIGIN,
  startedAt: '2026-10-25T10:00:00.000Z',
  requestsUsed: 32,
  fingerprint: { phpDetected: true },
  findings: [listing, env],
  verdict: 'major',
  dataVersion: '2026-10-25.1',
};

function renderReport(search: string) {
  window.history.replaceState(null, '', `/report.html${search}`);
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(fakeBrowser.permissions, 'remove').mockImplementation(async () => true);
});

describe('report page', () => {
  it('groups findings by severity and copies a developer message', async () => {
    await fakeBrowser.storage.session.set({ [scanKey(7, ORIGIN)]: RESULT });
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderReport(reportPath(7, ORIGIN).replace('/report.html', ''));

    expect(await screen.findByRole('heading', { name: 'Major headache' })).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings.slice(0, 2)).toEqual(['Critical (1)', 'High (1)']);

    await userEvent.click(screen.getByRole('button', { name: /Your \.env file is public/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy message for developer' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('keys: APP_KEY, DB_PASSWORD'));
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('switches the developer message language without changing the UI', async () => {
    await fakeBrowser.storage.session.set({ [scanKey(7, ORIGIN)]: RESULT });
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderReport(reportPath(7, ORIGIN).replace('/report.html', ''));

    const group = await screen.findByRole('group', { name: 'Developer message language' });
    await userEvent.click(within(group).getByRole('button', { name: 'ID' }));
    await userEvent.click(screen.getByRole('button', { name: /Your \.env file is public/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy message for developer' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Cara memperbaiki:'));
    expect(screen.getByRole('heading', { name: 'Findings' })).toBeInTheDocument();
  });

  it('explains a missing result and still shows settings', async () => {
    renderReport('?tab=7&origin=https%3A%2F%2Fother.example');
    expect(await screen.findByText(/No check result for this tab/)).toBeInTheDocument();
    expect(screen.getByText(/cannot see logic bugs/)).toBeInTheDocument();
  });

  it('revokes an allowed site', async () => {
    await fakeBrowser.storage.local.set({ authorizedOrigins: [ORIGIN] });
    renderReport('');
    await userEvent.click(await screen.findByRole('button', { name: `Revoke ${ORIGIN}` }));
    await waitFor(() => expect(screen.getByText('No sites yet.')).toBeInTheDocument());
  });

  it('saves the local targets setting', async () => {
    renderReport('');
    await userEvent.click(await screen.findByRole('checkbox', { name: /local and private/ }));
    await waitFor(async () =>
      expect((await fakeBrowser.storage.local.get('settings')).settings).toMatchObject({
        allowLocalTargets: true,
      }),
    );
  });
});

describe('report helpers', () => {
  it('round-trips the report query and rejects odd origins', () => {
    expect(parseReportQuery(reportPath(3, ORIGIN).split('?')[1] ?? '')).toEqual({
      tabId: 3,
      origin: ORIGIN,
    });
    expect(parseReportQuery('tab=3&origin=javascript%3Aalert(1)')).toBeNull();
    expect(parseReportQuery('tab=-1&origin=https%3A%2F%2Fa.example')).toBeNull();
    expect(parseReportQuery('tab=3&origin=https%3A%2F%2Fa.example%2Fpath')).toBeNull();
  });

  it('marks data older than 14 days as stale', () => {
    const day = 86_400_000;
    expect(isStale('2026-10-25.1', Date.parse('2026-11-01'))).toBe(false);
    expect(isStale('2026-10-25.1', Date.parse('2026-10-25') + 15 * day)).toBe(true);
    expect(isStale('', 0)).toBe(true);
  });

  it('builds the developer message in both languages', () => {
    const msg = developerMessage('en', ORIGIN, env, RESULT.startedAt);
    expect(msg).toContain(`Security finding for ${ORIGIN}`);
    expect(msg).toContain('Severity: Critical (confirmed)');
    expect(msg).toContain('- keys: APP_KEY, DB_PASSWORD');
    expect(msg).toContain('2026-10-25');
    expect(developerMessage('id', ORIGIN, env, RESULT.startedAt)).toContain(
      'Tingkat bahaya: Kritis',
    );
  });
});
