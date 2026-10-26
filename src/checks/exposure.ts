import { isNotFound, isOk, safeText, type Baseline } from '../scanner/baseline';
import { LIMITS } from '../scanner/budget';
import type { ProbeMethod, ProbeResponse } from '../scanner/fetch';
import type { ProbeSpec } from '../scanner/scan';
import { makeFinding } from './finding';
import type { Confidence, Finding, Severity } from '../shared/types';

// Exposure checks EX-01..EX-12 (04_CHECKS.md). Pure: responses in, redacted findings out.

export interface PathCheck {
  id: string;
  severity: Severity;
  confidence: Confidence;
  paths: readonly string[];
  method?: ProbeMethod;
  readCapBytes?: number;
  refs?: Finding['refs'];
  /** Redacted evidence lines beyond the request line, or null when the signature does not match. */
  match: (res: ProbeResponse, baseline: Baseline) => string[] | null;
}

const nvd = (cve: string) => ({ label: cve, url: `https://nvd.nist.gov/vuln/detail/${cve}` });

const ENV_LINE = /^([A-Z][A-Z0-9_]*)=/gm;
const ENV_HIGHLIGHT = /^(APP_KEY|DB_PASSWORD|.*_SECRET)$/;
const KEY_CAP = 12;

// EX-01: key names only. Values never leave this function (D-007).
export function envKeys(body: string): string[] | null {
  const keys = [...new Set(Array.from(body.matchAll(ENV_LINE), (m) => m[1] ?? ''))];
  if (keys.length < 3) return null;
  const sorted = [
    ...keys.filter((k) => ENV_HIGHLIGHT.test(k)),
    ...keys.filter((k) => !ENV_HIGHLIGHT.test(k)),
  ];
  const shown = sorted.slice(0, KEY_CAP).map((k) => safeText(k, 40));
  const more = keys.length - shown.length;
  return [`keys: ${shown.join(', ')}${more > 0 ? ` (+${more} more)` : ''}`];
}

const titleOf = (body: string) => /<title[^>]*>([^<]*)<\/title>/i.exec(body)?.[1] ?? '';
const has = (marker: string) => (res: ProbeResponse) =>
  res.bodyText.includes(marker) ? [`marker: ${marker}`] : null;
const jsonStart = (body: string) => body.trimStart().startsWith('{');

export const EXPOSURE_CHECKS: readonly PathCheck[] = [
  {
    id: 'EX-01',
    severity: 'critical',
    confidence: 'confirmed',
    paths: ['/.env', '/.env.backup', '/.env.bak', '/.env.old', '/.env.production'],
    match: (res) => envKeys(res.bodyText),
  },
  {
    id: 'EX-02',
    severity: 'critical',
    confidence: 'confirmed',
    paths: ['/.git/HEAD'],
    match: (res) => {
      const body = res.bodyText.trimStart();
      if (body.startsWith('ref: refs/')) return ['marker: ref: refs/'];
      return /^[0-9a-f]{40}\s*$/.test(body) ? ['marker: commit SHA'] : null;
    },
  },
  {
    id: 'EX-03',
    severity: 'critical',
    confidence: 'confirmed',
    paths: ['/.git/config'],
    match: has('[core]'),
  },
  {
    id: 'EX-04',
    severity: 'critical',
    confidence: 'confirmed',
    paths: ['/composer.lock'],
    readCapBytes: LIMITS.lockReadCapBytes,
    // Markers, not JSON.parse: a lock larger than the cap arrives cut off.
    match: (res) =>
      jsonStart(res.bodyText) &&
      /"content-hash"\s*:/.test(res.bodyText) &&
      /"packages"\s*:\s*\[/.test(res.bodyText)
        ? ['marker: content-hash, packages']
        : null,
  },
  {
    id: 'EX-05',
    severity: 'medium',
    confidence: 'confirmed',
    paths: ['/composer.json'],
    match: (res) =>
      jsonStart(res.bodyText) && /"require"\s*:\s*\{/.test(res.bodyText)
        ? ['marker: require']
        : null,
  },
  {
    id: 'EX-06',
    severity: 'critical',
    confidence: 'confirmed',
    paths: ['/storage/logs/laravel.log'],
    match: (res) =>
      /^\[\d{4}-\d{2}-\d{2} [\d:]+\] \w+\.(ERROR|INFO|DEBUG)/m.test(res.bodyText)
        ? ['marker: Laravel log line']
        : null,
  },
  {
    id: 'EX-07',
    severity: 'high',
    confidence: 'confirmed',
    paths: ['/phpinfo.php', '/info.php', '/php_info.php'],
    match: (res) =>
      res.bodyText.includes('phpinfo()') && res.bodyText.includes('PHP Version')
        ? ['marker: phpinfo()']
        : null,
  },
  {
    id: 'EX-08',
    severity: 'critical',
    confidence: 'confirmed',
    paths: ['/_ignition/health-check'],
    refs: [nvd('CVE-2021-3129')],
    match: (res) =>
      jsonStart(res.bodyText) && /"can_execute_commands"\s*:/.test(res.bodyText)
        ? ['marker: can_execute_commands']
        : null,
  },
  {
    id: 'EX-09',
    severity: 'critical',
    // Status only (HEAD, no body), so never stronger than likely.
    confidence: 'likely',
    paths: ['/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php'],
    method: 'HEAD',
    refs: [nvd('CVE-2017-9841')],
    // A site that answers 200 for missing paths gives no signal here.
    match: (res, baseline) => (res.status === 200 && !isOk(baseline.missing) ? [] : null),
  },
  {
    id: 'EX-10',
    severity: 'high',
    confidence: 'confirmed',
    paths: ['/telescope', '/horizon'],
    match: (res) => {
      const title = titleOf(res.bodyText);
      return /Telescope|Horizon/.test(title) ? [`title: ${safeText(title)}`] : null;
    },
  },
  {
    id: 'EX-11',
    severity: 'high',
    confidence: 'confirmed',
    paths: ['/adminer.php', '/phpmyadmin/', '/pma/'],
    match: (res) => {
      const title = titleOf(res.bodyText);
      return /Adminer|phpMyAdmin/.test(title) ? [`title: ${safeText(title)}`] : null;
    },
  },
  {
    id: 'EX-12',
    severity: 'critical',
    confidence: 'confirmed',
    paths: ['/backup.zip', '/backup.sql', '/db.sql', '/database.sql', '/dump.sql', '/site.zip'],
    match: (res) => {
      const head = res.bodyText.slice(0, 512);
      if (head.startsWith('PK\u0003\u0004')) return ['marker: ZIP archive'];
      const sql = /-- MySQL dump|-- MariaDB dump|CREATE TABLE/.exec(head);
      return sql ? [`marker: ${sql[0]}`] : null;
    },
  },
];

export function planFor(checks: readonly PathCheck[]): ProbeSpec[] {
  return checks.flatMap((c) =>
    c.paths.map((path) => ({
      path,
      severity: c.severity,
      ...(c.method ? { method: c.method } : {}),
      ...(c.readCapBytes ? { readCapBytes: c.readCapBytes } : {}),
    })),
  );
}

/** One finding per check, with evidence from every path that matched. */
export function runPathChecks(
  checks: readonly PathCheck[],
  responses: ReadonlyMap<string, ProbeResponse>,
  baseline: Baseline,
): Finding[] {
  const findings: Finding[] = [];
  for (const check of checks) {
    const evidence: string[] = [];
    for (const path of check.paths) {
      const res = responses.get(path);
      if (!res) continue;
      // HEAD has no body to compare, so EX-09 handles the baseline itself.
      if (check.method !== 'HEAD' && isNotFound(res, baseline)) continue;
      if (check.method === 'HEAD' && !isOk(res)) continue;
      const lines = check.match(res, baseline);
      if (lines) evidence.push(`${check.method ?? 'GET'} ${path} → ${res.status}`, ...lines);
    }
    if (evidence.length === 0) continue;
    findings.push(makeFinding(check.id, check.severity, check.confidence, evidence, check.refs));
  }
  return findings;
}
