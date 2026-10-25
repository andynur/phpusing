import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n';
import type { Confidence } from '../types';

const keys: Record<Confidence, MessageKey> = {
  confirmed: 'confidence.confirmed',
  likely: 'confidence.likely',
  'version-hidden': 'confidence.versionHidden',
};

// Text only, subtle (DESIGN.md §6).
export function ConfidenceTag({ confidence }: { confidence: Confidence }) {
  const { t } = useI18n();
  return <span className="text-xs text-fg-subtle">{t(keys[confidence])}</span>;
}
