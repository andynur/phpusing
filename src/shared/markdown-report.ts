import { dataDate } from '../advisories/load';
import { translate, type Lang, type MessageKey } from './i18n';
import { SEVERITIES, type Confidence, type Finding, type ScanResult } from './types';

// Markdown report export (PRD FR-13): the same redacted fields as the report page, EN or ID.

const confidenceKey: Record<Confidence, MessageKey> = {
  confirmed: 'confidence.confirmed',
  likely: 'confidence.likely',
  'version-hidden': 'confidence.versionHidden',
};

/** Evidence may echo scanned-site text: keep it inside a code fence it cannot close. */
function codeLine(text: string): string {
  return text.replace(/`/g, "'").replace(/[\r\n]+/g, ' ');
}

/** Text that goes into Markdown prose or link labels, with markup characters escaped. */
function plain(text: string): string {
  return text.replace(/[\\`*_[\]<>#|]/g, (c) => `\\${c}`);
}

function httpsUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href.replace(/[()\s]/g, encodeURIComponent) : null;
  } catch {
    return null;
  }
}

function findingSection(lang: Lang, f: Finding): string[] {
  const t = (key: MessageKey, vars?: Record<string, string>) => translate(lang, key, vars);
  const lines = [
    `#### ${f.checkId}: ${t(f.titleKey)}`,
    '',
    t('message.severity', {
      severity: t(`severity.${f.severity}`),
      confidence: t(confidenceKey[f.confidence]),
    }) + (f.kev ? ` · ${t('finding.kev')}` : ''),
    '',
    `**${t('message.impact')}** ${t(f.impactKey)}`,
  ];
  if (f.evidence.length) {
    lines.push(
      '',
      `**${t('message.evidence')}**`,
      '',
      '```text',
      ...f.evidence.map(codeLine),
      '```',
    );
  }
  lines.push('', `**${t('message.fix')}** ${t(f.fixKey)}`);
  const refs = f.refs.flatMap((r) => {
    const url = httpsUrl(r.url);
    return url ? [`- [${plain(r.label)}](${url})`] : [`- ${plain(r.label)}`];
  });
  if (refs.length) lines.push('', `**${t('message.refs')}**`, '', ...refs);
  return lines;
}

export function markdownReport(lang: Lang, result: ScanResult): string {
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
  const lines = [
    `# ${t('export.title', { origin: result.origin })}`,
    '',
    `**${t(`verdict.${result.verdict}.title`)}** · ${t(`verdict.${result.verdict}.body`)}`,
    '',
    t('export.meta', {
      date: result.startedAt.slice(0, 10),
      count: result.requestsUsed,
      data: dataDate(result.dataVersion) || '-',
    }),
  ];
  if (result.blocked) lines.push('', t('popup.blocked'));
  lines.push('', `## ${t('report.findings')}`);
  if (result.findings.length === 0) lines.push('', t('report.empty'));
  for (const severity of SEVERITIES) {
    const group = result.findings.filter((f) => f.severity === severity);
    if (group.length === 0) continue;
    lines.push(
      '',
      `### ${t('report.group', { severity: t(`severity.${severity}`), count: group.length })}`,
    );
    for (const f of group) lines.push('', ...findingSection(lang, f));
  }
  lines.push(
    '',
    '---',
    '',
    t('report.limits'),
    '',
    t('message.footer', { date: result.startedAt.slice(0, 10) }),
    '',
  );
  return lines.join('\n');
}

/** "https://shop.example.com" + "2026-10-25T…" -> "phpusing-shop.example.com-2026-10-25.md". */
export function reportFileName(result: ScanResult): string {
  let host = 'site';
  try {
    host = new URL(result.origin).host.replace(/[^a-z0-9.-]/gi, '-');
  } catch {
    // Keep the fallback name.
  }
  return `phpusing-${host}-${result.startedAt.slice(0, 10)}.md`;
}
