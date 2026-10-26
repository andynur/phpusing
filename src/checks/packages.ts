import { satisfies } from '../advisories/composer-semver';
import type { AdvisoryData, PackageAdvisory } from '../advisories/load';
import { safeText } from '../scanner/baseline';
import type { ScanContext } from '../scanner/scan';
import type { Finding, Severity } from '../shared/types';
import { makeFinding } from './finding';

// VU-02: packages in an exposed composer.lock vs Packagist advisories (04_CHECKS.md).
// Only `packages` is audited: `packages-dev` is usually not deployed (`--no-dev`).

export interface LockedPackage {
  name: string;
  version: string;
}

export interface ComposerLock {
  packages: LockedPackage[];
  /** False when the body was cut by the read cap before every production package was seen. */
  complete: boolean;
}

const NAME = /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/;
// In lock files "name" and "version" are the first two keys of each package entry.
const ENTRY = /"name"\s*:\s*"([^"\\]{1,200})"\s*,\s*"version"\s*:\s*"([^"\\]{1,64})"/g;

function clean(list: { name: unknown; version: unknown }[]): LockedPackage[] {
  return list.flatMap(({ name, version }) =>
    typeof name === 'string' && typeof version === 'string' && NAME.test(name.toLowerCase())
      ? [{ name: name.toLowerCase(), version: safeText(version, 40) }]
      : [],
  );
}

/** Parses a whole or truncated composer.lock; null when no package can be read. */
export function parseComposerLock(text: string): ComposerLock | null {
  try {
    const json: unknown = JSON.parse(text);
    const list = (json as { packages?: unknown }).packages;
    if (Array.isArray(list)) {
      const packages = clean(list.filter((p) => typeof p === 'object' && p !== null));
      return packages.length > 0 ? { packages, complete: true } : null;
    }
  } catch {
    // Truncated by the read cap: fall back to reading entries in order.
  }
  const dev = text.indexOf('"packages-dev"');
  const production = dev >= 0 ? text.slice(0, dev) : text;
  const packages = clean(
    Array.from(production.matchAll(ENTRY), (m) => ({ name: m[1], version: m[2] })),
  );
  return packages.length > 0 ? { packages, complete: dev >= 0 } : null;
}

const SEVERITY_RANK: Severity[] = ['critical', 'high', 'medium', 'low'];

/** Packagist label to severity. Advisories without a label count as medium. */
function severityOf(advisory: PackageAdvisory): Severity {
  const label = advisory.severity?.toLowerCase();
  return SEVERITY_RANK.find((s) => s === label) ?? 'medium';
}

const EVIDENCE_CAP = 5;
const REF_CAP = 5;

function refOf(a: PackageAdvisory): Finding['refs'][number] | null {
  if (a.cve) return { label: a.cve, url: `https://nvd.nist.gov/vuln/detail/${a.cve}` };
  return a.url?.startsWith('https://') ? { label: a.id, url: a.url } : null;
}

export interface LockAudit {
  findings: Finding[];
  /** Packages compared against the data. */
  checked: number;
}

/** One finding per affected package, at the severity of its worst advisory. */
export function auditPackages(packages: LockedPackage[], data: AdvisoryData): LockAudit {
  const findings: Finding[] = [];
  let checked = 0;
  for (const pkg of packages) {
    const advisories = Object.hasOwn(data.packages, pkg.name) ? data.packages[pkg.name] : [];
    const hits = (advisories ?? []).filter((a) => satisfies(pkg.version, a.affected) === true);
    if (satisfies(pkg.version, '*') !== null) checked++;
    if (hits.length === 0) continue;
    const severity = SEVERITY_RANK.find((s) => hits.some((a) => severityOf(a) === s)) ?? 'medium';
    const shown = hits.slice(0, EVIDENCE_CAP).map((a) => `${a.id}${a.cve ? ` (${a.cve})` : ''}`);
    const more = hits.length - shown.length;
    const refs = hits.map(refOf).filter((r): r is NonNullable<typeof r> => r !== null);
    // The lock may not match what is deployed, so "likely" rather than "confirmed".
    findings.push(
      makeFinding(
        'VU-02',
        severity,
        'likely',
        [
          `composer.lock: ${pkg.name} ${pkg.version}`,
          `advisories: ${shown.join(', ')}${more > 0 ? ` (+${more} more)` : ''}`,
        ],
        refs.slice(0, REF_CAP),
      ),
    );
  }
  return { findings, checked };
}

/**
 * Adds VU-02 findings when EX-04 found an exposed lock, and notes on the EX-04 finding how much
 * of the file was audited. The body never leaves this function.
 */
export function withLockAudit(
  findings: Finding[],
  context: ScanContext,
  data: AdvisoryData,
): Finding[] {
  const exposed = findings.findIndex((f) => f.checkId === 'EX-04');
  const res = context.responses.get('/composer.lock');
  const exposure = findings[exposed];
  if (!exposure || !res) return findings;
  const lock = parseComposerLock(res.bodyText);
  if (!lock) return findings;
  const audit = auditPackages(lock.packages, data);
  const note =
    Object.keys(data.packages).length === 0
      ? 'packages not audited: no package advisory data yet'
      : `packages audited: ${audit.checked}${lock.complete ? '' : ' (file larger than the 64 KB read limit, first part only)'}`;
  const out = [...findings];
  out[exposed] = { ...exposure, evidence: [...exposure.evidence, note] };
  return [...out, ...audit.findings];
}
