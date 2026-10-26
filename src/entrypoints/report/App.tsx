import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { dataDate } from '../../advisories/load';
import { currentAdvisories } from '../../advisories/update';
import { loadAuthorizedOrigins, revoke } from '../../shared/consent';
import { developerMessage } from '../../shared/developer-message';
import type { Lang } from '../../shared/i18n';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { scanKey, type DataReply } from '../../shared/messages';
import { parseReportQuery } from '../../shared/report-url';
import { loadSettings, saveSettings } from '../../shared/settings';
import { SEVERITIES, type ScanResult } from '../../shared/types';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { FindingRow } from '../../shared/ui/FindingRow';
import { LangToggle } from '../../shared/ui/LangToggle';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { LockCheck } from './LockCheck';
import { VerdictCard } from '../../shared/ui/VerdictCard';
import { countSeverities } from '../../shared/verdict';

const STALE_DAYS = 14;

type Load = { kind: 'loading' } | { kind: 'missing' } | { kind: 'ready'; result: ScanResult };

async function loadResult(): Promise<Load> {
  const query = parseReportQuery(location.search);
  if (!query) return { kind: 'missing' };
  const key = scanKey(query.tabId, query.origin);
  const result = (await browser.storage.session.get(key))[key] as ScanResult | undefined;
  return result ? { kind: 'ready', result } : { kind: 'missing' };
}

export function isStale(version: string, now: number): boolean {
  const date = dataDate(version);
  return !date || now - Date.parse(date) > STALE_DAYS * 86_400_000;
}

function Findings({ result }: { result: ScanResult }) {
  const { lang, t } = useI18n();
  const [messageLang, setMessageLang] = useState<Lang>(lang);

  if (result.findings.length === 0) return <EmptyState message={t('report.empty')} />;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('report.findings')}</h2>
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <span>{t('report.messageLang')}</span>
          <LangToggle value={messageLang} onChange={setMessageLang} labelKey="report.messageLang" />
        </div>
      </div>
      {SEVERITIES.map((severity) => {
        const group = result.findings.filter((f) => f.severity === severity);
        if (group.length === 0) return null;
        return (
          <section key={severity} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-fg-muted">
              {t('report.group', { severity: t(`severity.${severity}`), count: group.length })}
            </h3>
            <ul className="flex flex-col gap-2">
              {group.map((f, i) => (
                <FindingRow
                  key={`${f.checkId}-${i}`}
                  finding={f}
                  copyText={developerMessage(messageLang, result.origin, f, result.startedAt)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}

type DataStatus = 'idle' | 'updating' | 'updated' | 'current' | 'failed';

const DATA_STATUS_KEY = {
  updating: 'settings.updating',
  updated: 'settings.updated',
  current: 'settings.current',
  failed: 'settings.updateFailed',
} as const;

// PRD FR-17: data version, Update now, and the auto-check switch.
function DataSettings() {
  const { t } = useI18n();
  const [version, setVersion] = useState('');
  const [autoCheck, setAutoCheck] = useState(true);
  const [status, setStatus] = useState<DataStatus>('idle');

  useEffect(() => {
    void currentAdvisories().then((d) => setVersion(d.version));
    void loadSettings().then((s) => setAutoCheck(s.autoDataCheck !== false));
  }, []);

  async function update() {
    setStatus('updating');
    const reply = (await browser.runtime
      .sendMessage({ type: 'data/update' })
      .catch(() => undefined)) as DataReply | undefined;
    if (reply?.ok) {
      setStatus(reply.status);
      setVersion(reply.version);
    } else {
      setStatus('failed');
    }
  }

  return (
    <>
      <h3 className="text-sm font-semibold text-fg-muted">{t('settings.dataTitle')}</h3>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {version && <p>{t('settings.data', { version: dataDate(version) })}</p>}
        <Button
          variant="secondary"
          size="sm"
          disabled={status === 'updating'}
          onClick={() => void update()}
        >
          {t('settings.updateNow')}
        </Button>
      </div>
      {status !== 'idle' && (
        <p role="status" className="text-fg-muted">
          {t(DATA_STATUS_KEY[status], { version: dataDate(version) })}
        </p>
      )}
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={autoCheck}
          onChange={(e) => {
            setAutoCheck(e.target.checked);
            void saveSettings({ autoDataCheck: e.target.checked ? undefined : false });
          }}
          className="mt-0.5 size-4 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
        {t('settings.autoData')}
      </label>
    </>
  );
}

function Settings() {
  const { t } = useI18n();
  const [sites, setSites] = useState<string[]>([]);
  const [allowLocal, setAllowLocal] = useState(false);

  useEffect(() => {
    void loadAuthorizedOrigins().then(setSites);
    void loadSettings().then((s) => setAllowLocal(s.allowLocalTargets === true));
  }, []);

  return (
    <Card>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
        <h3 className="text-sm font-semibold text-fg-muted">{t('settings.sites')}</h3>
        {sites.length === 0 ? (
          <p className="text-fg-muted">{t('settings.noSites')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sites.map((site) => (
              <li key={site} className="flex items-center justify-between gap-2">
                <span className="truncate font-mono">{site}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`${t('settings.revoke')} ${site}`}
                  onClick={() => {
                    void revoke(site).then(loadAuthorizedOrigins).then(setSites);
                  }}
                >
                  {t('settings.revoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={allowLocal}
            onChange={(e) => {
              setAllowLocal(e.target.checked);
              void saveSettings({ allowLocalTargets: e.target.checked });
            }}
            className="mt-0.5 size-4 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
          {t('settings.local')}
        </label>
        <DataSettings />
      </section>
    </Card>
  );
}

// Report page: max width 760 px, centered, 24 px padding (DESIGN.md §3 Layout).
function Report() {
  const { t } = useI18n();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [now] = useState(() => Date.now());

  useEffect(() => {
    loadResult().then(setLoad, () => setLoad({ kind: 'missing' }));
  }, []);

  const result = load.kind === 'ready' ? load.result : undefined;

  return (
    <div className="min-h-screen bg-canvas text-sm text-fg">
      <main className="report-frame mx-auto flex flex-col gap-6 p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">
              {t('app.name')} · {t('report.title')}
            </h1>
            {result && (
              <p className="truncate font-mono text-fg-muted" title={result.origin}>
                {result.origin}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>
        {load.kind === 'loading' && <EmptyState message={t('popup.loading')} />}
        {load.kind === 'missing' && <EmptyState message={t('report.missing')} />}
        {result && (
          <>
            <VerdictCard
              verdict={result.verdict}
              counts={countSeverities(result.findings)}
              requestsUsed={result.requestsUsed}
              dataDate={dataDate(result.dataVersion)}
            />
            {isStale(result.dataVersion, now) && (
              <p role="status" className="rounded-md bg-sev-medium-bg p-3 text-sev-medium">
                {t('report.stale')}
              </p>
            )}
            {result.blocked && (
              <p role="status" className="text-fg-muted">
                {t('popup.blocked')}
              </p>
            )}
            <Findings result={result} />
          </>
        )}
        <LockCheck />
        <Settings />
        <footer className="text-xs text-fg-subtle">{t('report.limits')}</footer>
      </main>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <Report />
    </ThemeProvider>
  );
}
