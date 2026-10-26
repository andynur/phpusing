import { useId, useState, type DragEvent } from 'react';
import { dataDate } from '../../advisories/load';
import { currentAdvisories } from '../../advisories/update';
import { auditPackages, parseComposerLock } from '../../checks/packages';
import { safeText } from '../../scanner/baseline';
import { developerMessage } from '../../shared/developer-message';
import { useI18n } from '../../shared/i18n/I18nProvider';
import type { Finding } from '../../shared/types';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { FindingRow } from '../../shared/ui/FindingRow';

/** Bigger files are refused unread so the page does not stall (lock files are rarely over 2 MB). */
export const LOCK_FILE_MAX_BYTES = 16 * 1024 * 1024;

type Outcome =
  | { kind: 'idle' | 'reading' | 'invalid' | 'tooLarge' | 'noData' }
  | { kind: 'done'; name: string; checked: number; date: string; findings: Finding[] };

/** Audits a lock file the owner picked. The text stays in this function: nothing is stored or sent. */
async function auditFile(file: File): Promise<Outcome> {
  if (file.size > LOCK_FILE_MAX_BYTES) return { kind: 'tooLarge' };
  const lock = parseComposerLock(await file.text());
  if (!lock) return { kind: 'invalid' };
  const data = await currentAdvisories();
  if (Object.keys(data.packages).length === 0) return { kind: 'noData' };
  const { findings, checked } = auditPackages(lock.packages, data);
  return {
    kind: 'done',
    name: safeText(file.name, 80),
    checked,
    date: dataDate(data.version),
    findings,
  };
}

const MESSAGE_KEY = {
  reading: 'lock.reading',
  invalid: 'lock.invalid',
  tooLarge: 'lock.tooLarge',
  noData: 'lock.noData',
} as const;

// PRD FR-9: the owner drops or picks a composer.lock; parsed locally, never uploaded.
export function LockCheck() {
  const { lang, t } = useI18n();
  const inputId = useId();
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const [over, setOver] = useState(false);

  function check(file: File | undefined) {
    if (!file) return;
    setOutcome({ kind: 'reading' });
    auditFile(file).then(setOutcome, () => setOutcome({ kind: 'invalid' }));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    check(e.dataTransfer.files[0]);
  }

  return (
    <Card>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('lock.title')}</h2>
        <p className="text-fg-muted">{t('lock.hint')}</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={
            'flex flex-wrap items-center gap-2 rounded-md border border-dashed p-4 ' +
            (over ? 'border-brand bg-surface-muted' : 'border-border')
          }
        >
          <label
            htmlFor={inputId}
            className="cursor-pointer rounded-md border border-border px-3 py-1.5 font-semibold hover:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
          >
            {t('lock.pick')}
            <input
              id={inputId}
              type="file"
              accept=".lock,application/json"
              className="sr-only"
              onChange={(e) => {
                check(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <span className="text-fg-muted">{t('lock.drop')}</span>
        </div>
        {outcome.kind !== 'idle' && outcome.kind !== 'done' && (
          <p role="status" className="text-fg-muted">
            {t(MESSAGE_KEY[outcome.kind])}
          </p>
        )}
        {outcome.kind === 'done' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p role="status">
                {t('lock.checked', {
                  name: outcome.name,
                  count: outcome.checked,
                  date: outcome.date,
                })}
              </p>
              <Button variant="secondary" size="sm" onClick={() => setOutcome({ kind: 'idle' })}>
                {t('lock.clear')}
              </Button>
            </div>
            {outcome.findings.length === 0 ? (
              <p className="text-fg-muted">{t('lock.none')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {outcome.findings.map((f, i) => (
                  <FindingRow
                    key={`${f.checkId}-${i}`}
                    finding={f}
                    copyText={developerMessage(lang, 'composer.lock', f, new Date().toISOString())}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </Card>
  );
}
