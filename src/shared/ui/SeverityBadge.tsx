import { useI18n } from '../i18n/I18nProvider';
import type { Severity } from '../types';
import { Icon, type IconName } from './Icon';

// Static class strings so Tailwind can see them.
export const severityStyle: Record<Severity, { icon: IconName; className: string }> = {
  critical: { icon: 'octagon-alert', className: 'bg-sev-critical-bg text-sev-critical' },
  high: { icon: 'triangle-alert', className: 'bg-sev-high-bg text-sev-high' },
  medium: { icon: 'circle-alert', className: 'bg-sev-medium-bg text-sev-medium' },
  low: { icon: 'info', className: 'bg-sev-low-bg text-sev-low' },
  info: { icon: 'circle-dot', className: 'bg-sev-info-bg text-sev-info' },
};

// Icon + label + color, never color alone (DESIGN.md §2 rule 2). Optional count for verdict summaries.
export function SeverityBadge({ severity, count }: { severity: Severity; count?: number }) {
  const { t } = useI18n();
  const { icon, className } = severityStyle[severity];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold ${className}`}
    >
      <Icon name={icon} className="size-3.5" />
      {count !== undefined && <span className="font-mono">{count}</span>}
      {t(`severity.${severity}`)}
    </span>
  );
}
