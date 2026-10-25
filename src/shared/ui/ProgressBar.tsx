import { useI18n } from '../i18n/I18nProvider';

// Determinate bar with "12 of 41 checks" label (DESIGN.md §6); announced through aria-live.
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const { t } = useI18n();
  const label = t('popup.progress', { done, total });
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-150 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p aria-live="polite" className="text-xs text-fg-muted">
        {label}
      </p>
    </div>
  );
}
