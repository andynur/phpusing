import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { authorize, isAuthorized, requestHostPermission } from '../../shared/consent';
import { dataDate } from '../../advisories/load';
import { useI18n } from '../../shared/i18n/I18nProvider';
import {
  parseBroadcast,
  scanKey,
  type Request,
  type ScanErrorReason,
  type StartReply,
} from '../../shared/messages';
import { loadSettings } from '../../shared/settings';
import { checkTarget } from '../../shared/target';
import type { ScanResult } from '../../shared/types';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ConsentBox } from '../../shared/ui/ConsentBox';
import { EmptyState } from '../../shared/ui/EmptyState';
import { LangToggle } from '../../shared/ui/LangToggle';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { ProgressBar } from '../../shared/ui/ProgressBar';
import { VerdictCard } from '../../shared/ui/VerdictCard';
import { reportPath } from '../../shared/report-url';
import { FindingRow } from '../../shared/ui/FindingRow';
import { Icon } from '../../shared/ui/Icon';
import { countSeverities, sortFindings } from '../../shared/verdict';

interface Target {
  tabId: number;
  origin: string;
}

type View =
  | { kind: 'loading' }
  | { kind: 'blocked'; reason: 'unsupported' | 'local' | 'error' }
  | (Target & {
      kind: 'ready';
      consented: boolean;
      denied?: boolean;
      reason?: ScanErrorReason;
    })
  | (Target & { kind: 'scanning'; done: number; total: number })
  | (Target & { kind: 'done'; result: ScanResult });

// activeTab exposes the URL of the tab the user clicked from; no `tabs` permission (D-003).
async function resolveView(): Promise<View> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const { allowLocalTargets } = await loadSettings();
  const target = checkTarget(tab?.url, { allowLocalTargets });
  if (!target.ok || tab?.id === undefined) {
    return { kind: 'blocked', reason: target.ok ? 'unsupported' : target.reason };
  }
  const { origin } = target;
  const key = scanKey(tab.id, origin);
  const stored = (await browser.storage.session.get(key))[key] as ScanResult | undefined;
  if (stored) return { kind: 'done', tabId: tab.id, origin, result: stored };
  const consented = await isAuthorized(origin);
  return { kind: 'ready', tabId: tab.id, origin, consented };
}

const blockedKey = {
  unsupported: 'popup.unsupported',
  local: 'popup.localOff',
  error: 'popup.error',
} as const;

const reasonKey = {
  unsupported: 'popup.reason.unsupported',
  'not-authorized': 'popup.reason.notAuthorized',
  'rate-limited': 'popup.reason.rateLimited',
  busy: 'popup.reason.busy',
  cancelled: 'popup.reason.cancelled',
  failed: 'popup.reason.failed',
} as const;

// Top findings in the popup; the rest live in the report.
const POPUP_FINDINGS = 3;

function send(request: Request): Promise<StartReply> {
  return browser.runtime.sendMessage(request) as Promise<StartReply>;
}

// Popup shell: 380 px wide, max 600 px tall (DESIGN.md §3 Layout).
function Popup() {
  const { t } = useI18n();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    resolveView().then(setView, () => setView({ kind: 'blocked', reason: 'error' }));
  }, []);

  const tabId = 'tabId' in view ? view.tabId : undefined;
  const origin = 'origin' in view ? view.origin : undefined;

  // Progress and results come from the background; ignore other tabs.
  useEffect(() => {
    if (tabId === undefined || origin === undefined) return;
    const listener = (message: unknown) => {
      const msg = parseBroadcast(message);
      if (!msg || msg.tabId !== tabId) return;
      if (msg.type === 'scan/progress') {
        setView({ kind: 'scanning', tabId, origin, done: msg.done, total: msg.total });
      } else if (msg.type === 'scan/result') {
        setView({ kind: 'done', tabId, origin, result: msg.result });
      } else {
        setView({ kind: 'ready', tabId, origin, consented: true, reason: msg.reason });
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [tabId, origin]);

  async function startScan({ tabId, origin }: Target) {
    const target = { tabId, origin };
    setView({ kind: 'scanning', ...target, done: 0, total: 0 });
    const reply = await send({ type: 'scan/start', tabId: target.tabId });
    if (!reply.ok) {
      setView({
        kind: 'ready',
        ...target,
        consented: reply.reason !== 'not-authorized',
        reason: reply.reason,
      });
    }
  }

  function handleCheck({ tabId, origin }: Target) {
    const target = { tabId, origin };
    // Request first, before any await, so the click still counts as a user gesture.
    // Chrome resolves at once without a prompt when the origin is already granted.
    requestHostPermission(target.origin)
      .then(async (granted) => {
        if (!granted) {
          setView({ kind: 'ready', ...target, consented: false, denied: true });
          return;
        }
        await authorize(target.origin);
        await startScan(target);
      })
      .catch(() => setView({ kind: 'blocked', reason: 'error' }));
  }

  function handleCancel(target: Target) {
    send({ type: 'scan/cancel', tabId: target.tabId }).catch(() => {});
  }

  // tabs.create needs no `tabs` permission.
  function openReport({ tabId, origin }: Target) {
    void browser.tabs.create({
      url: browser.runtime.getURL(reportPath(tabId, origin)),
    });
  }

  function handleAgain(target: Target) {
    startScan(target).catch(() => setView({ kind: 'blocked', reason: 'error' }));
  }

  const findings = view.kind === 'done' ? sortFindings(view.result.findings) : [];
  const hidden = findings.length - POPUP_FINDINGS;

  // Header, site, verdict and status scroll; the action buttons stay pinned at the bottom.
  return (
    <main className="popup-frame flex flex-col bg-canvas text-sm text-fg">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded-md bg-brand p-1.5 text-on-brand">
              <Icon name="mark" className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">{t('app.name')}</h1>
              <p className="text-xs text-fg-muted">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>
        {origin !== undefined && (
          <p
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
            title={origin}
          >
            <Icon name="globe" className="size-4 text-fg-muted" />
            <span className="sr-only">{t('popup.target')}</span>
            <span className="truncate font-mono text-xs">{origin}</span>
          </p>
        )}
        {view.kind === 'done' && (
          <VerdictCard
            verdict={view.result.verdict}
            counts={countSeverities(view.result.findings)}
            requestsUsed={view.result.requestsUsed}
            dataDate={dataDate(view.result.dataVersion)}
          />
        )}
        {findings.length > 0 && (
          <ul className="flex flex-col gap-2">
            {findings.slice(0, POPUP_FINDINGS).map((f, i) => (
              <FindingRow key={`${f.checkId}-${i}`} finding={f} showCheckId={false} />
            ))}
          </ul>
        )}
        {hidden > 0 && (
          <p className="text-center text-xs text-fg-muted">{t('popup.more', { count: hidden })}</p>
        )}
        {(view.kind === 'loading' || view.kind === 'blocked') && (
          <Card>
            <EmptyState
              message={t(view.kind === 'loading' ? 'popup.loading' : blockedKey[view.reason])}
            />
          </Card>
        )}
        {view.kind === 'ready' && (
          <>
            {!view.consented && <ConsentBox checked={checked} onChange={setChecked} />}
            {view.denied && (
              <p role="status" className="text-fg-muted">
                {t('popup.permissionDenied')}
              </p>
            )}
            {view.reason && (
              <p role="status" className="text-fg-muted">
                {t(reasonKey[view.reason])}
              </p>
            )}
          </>
        )}
        {view.kind === 'scanning' && (
          <Card>
            <div className="flex flex-col gap-3">
              <p className="text-fg-muted">{t('popup.loading')}</p>
              <ProgressBar done={view.done} total={view.total} />
            </div>
          </Card>
        )}
        {view.kind === 'done' && view.result.blocked && (
          <p role="status" className="text-fg-muted">
            {t('popup.blocked')}
          </p>
        )}
      </div>
      {(view.kind === 'ready' || view.kind === 'scanning' || view.kind === 'done') && (
        <footer className="flex shrink-0 gap-2 border-t border-border bg-canvas p-4">
          {view.kind === 'ready' && (
            <Button
              className="flex-1"
              disabled={!view.consented && !checked}
              onClick={() => handleCheck(view)}
            >
              {t('popup.checkThisSite')}
            </Button>
          )}
          {view.kind === 'scanning' && (
            <Button variant="secondary" className="flex-1" onClick={() => handleCancel(view)}>
              {t('popup.cancel')}
            </Button>
          )}
          {view.kind === 'done' && (
            <>
              <Button variant="secondary" onClick={() => handleAgain(view)}>
                {t('popup.checkAgain')}
              </Button>
              <Button className="flex-1" onClick={() => openReport(view)}>
                {t('popup.openReport')}
              </Button>
            </>
          )}
        </footer>
      )}
    </main>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <Popup />
    </ThemeProvider>
  );
}
