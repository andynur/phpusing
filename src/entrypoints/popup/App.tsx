import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  authorize,
  hasHostPermission,
  isAuthorized,
  requestHostPermission,
} from '../../shared/consent';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { loadSettings } from '../../shared/settings';
import { checkTarget } from '../../shared/target';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ConsentBox } from '../../shared/ui/ConsentBox';
import { EmptyState } from '../../shared/ui/EmptyState';
import { LangToggle } from '../../shared/ui/LangToggle';

type View =
  | { kind: 'loading' }
  | { kind: 'blocked'; reason: 'unsupported' | 'local' | 'error' }
  | { kind: 'ready'; origin: string; consented: boolean; denied?: boolean }
  | { kind: 'allowed'; origin: string };

// activeTab exposes the URL of the tab the user clicked from; no `tabs` permission (D-003).
async function resolveView(): Promise<View> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const { allowLocalTargets } = await loadSettings();
  const target = checkTarget(tab?.url, { allowLocalTargets });
  if (!target.ok) return { kind: 'blocked', reason: target.reason };
  const consented = await isAuthorized(target.origin);
  if (consented && (await hasHostPermission(target.origin))) {
    return { kind: 'allowed', origin: target.origin };
  }
  return { kind: 'ready', origin: target.origin, consented };
}

const blockedKey = {
  unsupported: 'popup.unsupported',
  local: 'popup.localOff',
  error: 'popup.error',
} as const;

// Popup shell: 380 px wide, max 600 px tall (DESIGN.md §3 Layout).
export function App() {
  const { t } = useI18n();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    resolveView().then(setView, () => setView({ kind: 'blocked', reason: 'error' }));
  }, []);

  function handleCheck(origin: string) {
    // Request first, before any await, so the click still counts as a user gesture.
    requestHostPermission(origin)
      .then(async (granted) => {
        if (!granted) {
          setView({ kind: 'ready', origin, consented: true, denied: true });
          return;
        }
        await authorize(origin);
        setView({ kind: 'allowed', origin });
      })
      .catch(() => setView({ kind: 'blocked', reason: 'error' }));
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
      <Card>
        {view.kind === 'loading' && <EmptyState message={t('popup.loading')} />}
        {view.kind === 'blocked' && <EmptyState message={t(blockedKey[view.reason])} />}
        {(view.kind === 'ready' || view.kind === 'allowed') && (
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
                <Button
                  disabled={!view.consented && !checked}
                  onClick={() => handleCheck(view.origin)}
                >
                  {t('popup.checkThisSite')}
                </Button>
              </>
            )}
            {view.kind === 'allowed' && (
              <p role="status" className="text-fg-muted">
                {t('popup.allowed')}
              </p>
            )}
          </div>
        )}
      </Card>
    </main>
  );
}
