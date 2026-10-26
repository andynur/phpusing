import { describe, expect, it } from 'vitest';
import { dataDate, loadAdvisories } from '../src/advisories/load';
import { checkPhpVersion, parsePhpVersion } from '../src/checks/versions';
import en from '../src/shared/i18n/en.json';
import id from '../src/shared/i18n/id.json';

const data = loadAdvisories();
const TODAY = '2026-10-25';
const check = (php?: string) => checkPhpVersion({ phpDetected: true, php }, data, TODAY);
const titles = (php?: string) => check(php).findings.map((f) => f.titleKey);

describe('parsePhpVersion', () => {
  it('keeps the upstream part of distro versions', () => {
    expect(parsePhpVersion('8.1.2-1ubuntu2.14')).toEqual({ major: 8, minor: 1, patch: 2 });
    expect(parsePhpVersion('8.3')).toBeNull();
  });
});

describe('VU-01 PHP2Shell and end of life', () => {
  it('flags versions below the fixed patch of a supported line', () => {
    const r = check('8.3.35');
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({
      checkId: 'VU-01',
      severity: 'critical',
      confidence: 'likely',
      evidence: ['X-Powered-By: PHP/8.3.35', 'fixed in 8.3.36'],
    });
    expect(r.findings[0]?.refs.map((x) => x.label)).toEqual(['CVE-2026-109618', 'CVE-2026-109619']);
    expect(r.phpSupported).toBe(false);
  });

  it('marks a KEV-listed PHP advisory as exploited in the wild', () => {
    // Synthetic: no CISA KEV entry for PHP2Shell was found on 2026-10-26.
    const kev = { ...data, kev: ['CVE-2026-109619'] };
    const [finding] = checkPhpVersion({ phpDetected: true, php: '8.3.35' }, kev, TODAY).findings;
    expect(finding?.kev).toBe(true);
    expect(finding?.evidence.at(-1)).toBe('exploited in the wild (CISA KEV): CVE-2026-109619');
    expect(check('8.3.35').findings[0]?.kev).toBeUndefined();
  });

  it('passes fixed and newer versions', () => {
    for (const v of ['8.5.12', '8.4.27', '8.3.36', '8.2.40']) {
      expect(check(v)).toEqual({ findings: [], phpSupported: true });
    }
  });

  it('flags every 8.1 and older version as affected and end of life', () => {
    expect(titles('8.1.34')).toEqual(['check.VU-01.title', 'check.VU-01.eol.title']);
    expect(titles('7.4.33-1+deb11u5')).toEqual(['check.VU-01.title', 'check.VU-01.eol.title']);
    expect(check('8.1.34').findings[0]?.evidence[1]).toBe('no upstream fix for this branch');
  });

  it('uses the scan date for end of life', () => {
    expect(
      checkPhpVersion({ phpDetected: true, php: '8.2.35' }, data, '2027-01-01').findings.map(
        (f) => f.severity,
      ),
    ).toEqual(['high']);
  });

  it('reports a hidden version as info and never supported', () => {
    const r = check(undefined);
    expect(r.findings[0]).toMatchObject({ severity: 'info', confidence: 'version-hidden' });
    expect(r.phpSupported).toBe(false);
  });

  it('tells owners of a hidden version which releases are fixed, without a public phpinfo page', () => {
    const fixed = data.php.flatMap((a) => a.fixed);
    for (const strings of [en, id]) {
      const fix = strings['check.VU-01.hidden.fix'];
      for (const v of fixed) expect(fix).toContain(v);
      expect(fix).toMatch(/phpinfo/);
    }
  });

  it('says nothing when PHP is not detected or the cycle is unknown', () => {
    expect(checkPhpVersion({}, data, TODAY)).toEqual({ findings: [], phpSupported: false });
    expect(check('9.0.1')).toEqual({ findings: [], phpSupported: false });
  });

  it('has strings for every VU-01 variant and a dated data version', () => {
    for (const k of ['', '.eol', '.hidden']) {
      for (const part of ['title', 'impact', 'fix'])
        expect(en).toHaveProperty([`check.VU-01${k}.${part}`]);
    }
    expect(dataDate(data.version)).toBe('2026-10-25');
    expect(data.php.every((a) => a.source.startsWith('https://'))).toBe(true);
  });
});
