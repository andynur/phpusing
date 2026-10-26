import type { AdvisoryData } from '../advisories/load';
import type { MessageKey } from '../shared/i18n';
import type { Finding, Fingerprint } from '../shared/types';
import { makeFinding } from './finding';

// VU-01: PHP core version vs PHP2Shell and end of life (04_CHECKS.md, 05_ADVISORY_DATA.md).

interface Version {
  major: number;
  minor: number;
  patch: number;
}

/** Upstream part of "8.1.2-1ubuntu2.14"; null without a patch number (cannot be judged). */
export function parsePhpVersion(raw: string): Version | null {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(raw);
  return m ? { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) } : null;
}

const cmpMinor = (a: Version, b: Version) => a.major - b.major || a.minor - b.minor;

function asVersion(s: string): Version {
  const [major = 0, minor = 0, patch = 0] = s.split('.').map(Number);
  return { major, minor, patch };
}

export interface VersionCheck {
  findings: Finding[];
  /** Version known, cycle known, not end of life and not affected by any PHP core advisory. */
  phpSupported: boolean;
}

const key = (part: string) => part as MessageKey;

export function checkPhpVersion(fp: Fingerprint, data: AdvisoryData, today: string): VersionCheck {
  if (!fp.phpDetected) return { findings: [], phpSupported: false };
  if (!fp.php) {
    const hidden = makeFinding('VU-01', 'info', 'version-hidden', ['X-Powered-By: no PHP version']);
    return {
      findings: [
        {
          ...hidden,
          titleKey: key('check.VU-01.hidden.title'),
          impactKey: key('check.VU-01.hidden.impact'),
          fixKey: key('check.VU-01.hidden.fix'),
        },
      ],
      phpSupported: false,
    };
  }
  const v = parsePhpVersion(fp.php);
  if (!v) return { findings: [], phpSupported: false };

  const findings: Finding[] = [];
  const header = `X-Powered-By: PHP/${fp.php}`;

  for (const adv of data.php) {
    const fixed = adv.fixed.map(asVersion).find((f) => cmpMinor(f, v) === 0);
    const affected =
      cmpMinor(v, asVersion(adv.unfixedBelow)) < 0 ||
      (fixed !== undefined && v.patch < fixed.patch);
    if (!affected) continue;
    const exploited = adv.cves.filter((cve) => data.kev.includes(cve));
    // Distributions backport fixes without changing the upstream version, hence "likely".
    const finding = makeFinding(
      'VU-01',
      'critical',
      'likely',
      [
        header,
        fixed
          ? `fixed in ${fixed.major}.${fixed.minor}.${fixed.patch}`
          : 'no upstream fix for this branch',
        ...(exploited.length ? [`exploited in the wild (CISA KEV): ${exploited.join(', ')}`] : []),
      ],
      adv.cves.map((cve) => ({ label: cve, url: `https://nvd.nist.gov/vuln/detail/${cve}` })),
    );
    findings.push(exploited.length ? { ...finding, kev: true } : finding);
  }

  const cycle = data.eol.php.find((c) => c.cycle === `${v.major}.${v.minor}`);
  const eol = cycle !== undefined && cycle.eol < today;
  if (cycle && eol) {
    findings.push({
      ...makeFinding('VU-01', 'high', 'likely', [header, `end of life: ${cycle.eol}`]),
      titleKey: key('check.VU-01.eol.title'),
      impactKey: key('check.VU-01.eol.impact'),
      fixKey: key('check.VU-01.eol.fix'),
    });
  }
  return { findings, phpSupported: cycle !== undefined && findings.length === 0 };
}
