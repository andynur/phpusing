import { useId, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { Finding } from '../types';
import { ConfidenceTag } from './ConfidenceTag';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';
import { SeverityBadge } from './SeverityBadge';

// Refs come from bundled advisory data; still link https only.
function isSafeUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

// Renders an <li>; place inside a <ul> grouped by severity (DESIGN.md §8).
export function FindingRow({
  finding,
  defaultOpen = false,
  copyText,
  showCheckId = true,
}: {
  finding: Finding;
  /** Hide the check ID where space is tight and readers are non-technical (popup). */
  showCheckId?: boolean;
  defaultOpen?: boolean;
  /** Developer message; shows the Copy button when given (report page). */
  copyText?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <li className="rounded-md border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={
          'flex w-full items-center gap-2 rounded-md p-3 text-left transition-colors duration-150 hover:bg-surface-muted ' +
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
        }
      >
        <SeverityBadge severity={finding.severity} />
        <span className="min-w-0 flex-1 font-semibold">{t(finding.titleKey)}</span>
        {showCheckId && <span className="font-mono text-xs text-fg-subtle">{finding.checkId}</span>}
        <Icon
          name="chevron-down"
          className={
            'size-4 text-fg-muted transition-transform duration-150 ' + (open ? 'rotate-180' : '')
          }
        />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-3 border-t border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <ConfidenceTag confidence={finding.confidence} />
            {finding.kev && (
              <span className="rounded-sm bg-sev-critical-bg px-1.5 py-0.5 text-xs font-semibold text-sev-critical">
                {t('finding.kev')}
              </span>
            )}
          </div>
          <section>
            <h4 className="text-xs font-semibold text-fg-muted">{t('finding.impact')}</h4>
            <p>{t(finding.impactKey)}</p>
          </section>
          {finding.evidence.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-fg-muted">{t('finding.evidence')}</h4>
              {/* Evidence may echo scanned-site text: plain text, mono, truncated (DESIGN.md §2 rule 6). */}
              <ul className="mt-1 flex flex-col gap-0.5 rounded-sm bg-surface-muted p-2 font-mono text-xs">
                {finding.evidence.map((line, i) => (
                  <li key={i} title={line} className="truncate">
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h4 className="text-xs font-semibold text-fg-muted">{t('finding.fix')}</h4>
            <p>{t(finding.fixKey)}</p>
          </section>
          {finding.refs.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-fg-muted">{t('finding.refs')}</h4>
              <ul className="flex flex-wrap gap-x-3 font-mono text-xs">
                {finding.refs.map((ref) => (
                  <li key={ref.url + ref.label}>
                    {isSafeUrl(ref.url) ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand underline hover:text-brand-hover"
                      >
                        {ref.label}
                      </a>
                    ) : (
                      ref.label
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {copyText && <CopyButton text={copyText} />}
        </div>
      )}
    </li>
  );
}
