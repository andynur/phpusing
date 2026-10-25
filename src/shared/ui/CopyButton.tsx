import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';

// Shows "Copied" for 2 s, announced via aria-live (DESIGN.md §6).
export function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(text).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        {t('finding.copy')}
      </Button>
      <span aria-live="polite" className="text-xs text-fg-muted">
        {copied ? t('finding.copied') : ''}
      </span>
    </div>
  );
}
