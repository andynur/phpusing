import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { authorize, isAuthorized, requestHostPermission } from '../../shared/consent';
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
import { ProgressBar } from '../../shared/ui/ProgressBar';
import { VerdictCard } from '../../shared/ui/VerdictCard';
import { countSeverities } from '../../shared/verdict';

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

function send(request: Request): Promise<StartReply> {
  return browser.runtime.sendMessage(request) as Promise<StartReply>;
}

// Popup shell: 380 px wide, max 600 px tall (DESIGN.md §3 Layout).
export function App() {
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

  function handleAgain(target: Target) {
    startScan(target).catch(() => setView({ kind: 'blocked', reason: 'error' }));
  }

  return (
    <main className="popup-frame flex flex-col gap-4 bg-canvas p-4 text-sm text-fg">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t('app.name')}</h1>
          <p className="text-fg-muted">{t('app.tagline')}</p>
        </div>
        <LangToggle />
      </header>
      {view.kind === 'done' && (
        <VerdictCard
          verdict={view.result.verdict}
          counts={countSeverities(view.result.findings)}
          requestsUsed={view.result.requestsUsed}
          dataDate={view.result.dataVersion}
        />
      )}
      <Card>
        {view.kind === 'loading' && <EmptyState message={t('popup.loading')} />}
        {view.kind === 'blocked' && <EmptyState message={t(blockedKey[view.reason])} />}
        {view.kind !== 'loading' && view.kind !== 'blocked' && (
          <div className="flex flex-col gap-3">
            <p className="flex flex-col">
              <span className="text-xs text-fg-muted">{t('popup.target')}</span>
              <span className="truncate font-mono" title={view.origin}>
                {view.origin}
              </span>
            </p>
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
                <Button disabled={!view.consented && !checked} onClick={() => handleCheck(view)}>
                  {t('popup.checkThisSite')}
                </Button>
              </>
            )}
            {view.kind === 'scanning' && (
              <>
                <p className="text-fg-muted">{t('popup.loading')}</p>
                <ProgressBar done={view.done} total={view.total} />
                <Button variant="secondary" onClick={() => handleCancel(view)}>
                  {t('popup.cancel')}
                </Button>
              </>
            )}
            {view.kind === 'done' && (
              <>
                {view.result.blocked && (
                  <p role="status" className="text-fg-muted">
                    {t('popup.blocked')}
                  </p>
                )}
                <Button variant="secondary" onClick={() => handleAgain(view)}>
                  {t('popup.checkAgain')}
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </main>
  );
}
