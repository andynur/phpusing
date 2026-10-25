import { useI18n } from '../i18n/I18nProvider';
import { SEVERITIES, type SeverityCounts, type Verdict } from '../types';
import { Icon } from './Icon';
import { SeverityBadge } from './SeverityBadge';

// Color sets from DESIGN.md §4.
const verdictStyle: Record<Verdict, string> = {
  calm: 'bg-sev-ok-bg text-sev-ok',
  mild: 'bg-sev-medium-bg text-sev-medium',
  major: 'bg-sev-critical-bg text-sev-critical',
  unknown: 'bg-sev-info-bg text-sev-info',
};

interface VerdictCardProps {
  verdict: Verdict;
  counts: SeverityCounts;
  requestsUsed: number;
  /** ISO date of the advisory data, e.g. "2026-10-25". */
  dataDate: string;
}

export function VerdictCard({ verdict, counts, requestsUsed, dataDate }: VerdictCardProps) {
  const { lang, t } = useI18n();
  const shown = SEVERITIES.filter((s) => (counts[s] ?? 0) > 0);
  const date = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(dataDate));

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span className={`rounded-md p-2 ${verdictStyle[verdict]}`}>
          <Icon name="lens" className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">{t(`verdict.${verdict}.title`)}</h2>
          <p className="text-fg-muted">{t(`verdict.${verdict}.body`)}</p>
        </div>
      </div>
      {shown.length > 0 && (
        <ul aria-label={t('verdict.counts')} className="flex flex-wrap gap-1.5">
          {shown.map((s) => (
            <li key={s}>
              <SeverityBadge severity={s} count={counts[s]} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-fg-subtle">{t('verdict.meta', { count: requestsUsed, date })}</p>
    </section>
  );
}
