import { useId } from 'react';
import { useI18n } from '../i18n/I18nProvider';

const NEVER_DO_URL = 'https://github.com/andynur/phpusing/blob/main/WHAT_WE_NEVER_DO.md';

// Checkbox + one-line legal text + link to WHAT_WE_NEVER_DO.md (DESIGN.md §6).
export function ConsentBox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useI18n();
  const id = useId();

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-muted p-3">
      <label htmlFor={id} className="flex items-start gap-2 font-semibold">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
        {t('consent.label')}
      </label>
      <p className="pl-6 text-xs text-fg-muted">
        {t('consent.legal')}{' '}
        <a
          href={NEVER_DO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline hover:text-brand-hover"
        >
          {t('consent.link')}
        </a>
      </p>
    </div>
  );
}
