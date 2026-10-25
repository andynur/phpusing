import { translate, type Lang, type MessageKey } from './i18n';
import type { Confidence, Finding } from './types';

// Copy message for developer (PRD FR-12): plain text, redacted evidence only, EN or ID.

const confidenceKey: Record<Confidence, MessageKey> = {
  confirmed: 'confidence.confirmed',
  likely: 'confidence.likely',
  'version-hidden': 'confidence.versionHidden',
};

export function developerMessage(
  lang: Lang,
  origin: string,
  finding: Finding,
  scannedAt: string,
): string {
  const t = (key: MessageKey, vars?: Record<string, string>) => translate(lang, key, vars);
  const lines = [
    t('message.header', { origin }),
    '',
    `${finding.checkId}: ${t(finding.titleKey)}`,
    t('message.severity', {
      severity: t(`severity.${finding.severity}`),
      confidence: t(confidenceKey[finding.confidence]),
    }),
    '',
    t('message.impact'),
    t(finding.impactKey),
  ];
  if (finding.evidence.length)
    lines.push('', t('message.evidence'), ...finding.evidence.map((e) => `- ${e}`));
  lines.push('', t('message.fix'), t(finding.fixKey));
  if (finding.refs.length) {
    lines.push('', t('message.refs'), ...finding.refs.map((r) => `- ${r.label}: ${r.url}`));
  }
  lines.push('', t('message.footer', { date: scannedAt.slice(0, 10) }));
  return lines.join('\n');
}
