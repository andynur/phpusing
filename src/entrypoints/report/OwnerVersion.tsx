import { useId, useState } from 'react';
import { currentAdvisories } from '../../advisories/update';
import { parseOwnerPhpVersion } from '../../checks/versions';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { withOwnerVersion } from '../../shared/owner-version';
import type { ScanResult } from '../../shared/types';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';

interface OwnerVersionProps {
  scanned: ScanResult;
  entered: string | undefined;
  onChange: (result: ScanResult | null) => void;
}

// PRD FR-19, D-013: the owner types the hidden PHP version; matched locally, kept in memory only.
export function OwnerVersion({ scanned, entered, onChange }: OwnerVersionProps) {
  const { t } = useI18n();
  const inputId = useId();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);

  async function check() {
    const version = parseOwnerPhpVersion(text);
    setInvalid(!version);
    if (!version) return;
    const data = await currentAdvisories();
    onChange(withOwnerVersion(scanned, version, data, new Date().toISOString().slice(0, 10)));
  }

  return (
    <Card>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('owner.title')}</h2>
        <p className="text-fg-muted">{t('owner.hint')}</p>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void check();
          }}
        >
          <label htmlFor={inputId} className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted">{t('owner.label')}</span>
            <input
              id={inputId}
              type="text"
              value={text}
              maxLength={2000}
              autoComplete="off"
              spellCheck={false}
              placeholder="8.3.12"
              onChange={(e) => setText(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 font-mono focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </label>
          <Button type="submit" size="sm">
            {t('owner.check')}
          </Button>
          {entered && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setText('');
                onChange(null);
              }}
            >
              {t('owner.clear')}
            </Button>
          )}
        </form>
        {invalid && (
          <p role="status" className="text-fg-muted">
            {t('owner.invalid')}
          </p>
        )}
      </section>
    </Card>
  );
}
