import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import snapshot from '../data/snapshot/advisories.json';
import { satisfies } from '../src/advisories/composer-semver';
import type { AdvisoryData } from '../src/advisories/load';
import { parseAdvisoryData } from '../src/advisories/verify';
import { makeFinding } from '../src/checks/finding';
import { auditPackages, parseComposerLock, withLockAudit } from '../src/checks/packages';
import type { ProbeResponse } from '../src/scanner/fetch';
import type { ScanContext } from '../src/scanner/scan';
import constraints from './fixtures/constraints.json';
import subset from './fixtures/VU-02/advisories.json';

const DATA: AdvisoryData = { ...snapshot, version: '2026-10-26.4', packages: subset.packages };

interface Entry {
  name: string;
  version: string;
}

/** A lock file shaped like Composer writes it, with padding so entries have realistic size. */
function lock(packages: Entry[], dev: Entry[] = []): string {
  const entry = (p: Entry) => ({
    name: p.name,
    version: p.version,
    source: { type: 'git', url: `https://github.com/${p.name}.git`, reference: 'abc' },
    authors: [{ name: 'Someone', email: 'someone@example.com' }],
    description: 'x'.repeat(1500),
  });
  return JSON.stringify(
    {
      _readme: ['This file locks the dependencies of your project to a known state'],
      'content-hash': '0123456789abcdef0123456789abcdef',
      packages: packages.map(entry),
      'packages-dev': dev.map(entry),
    },
    null,
    4,
  );
}

function response(body: string): ProbeResponse {
  return {
    path: '/composer.lock',
    method: 'GET',
    status: 200,
    redirected: false,
    headers: {},
    bodyText: body,
    bodyHash: '',
    contentType: 'application/json',
  };
}

function context(body: string): ScanContext {
  return {
    origin: 'https://shop.example.com',
    baseline: { root: response(''), missing: { ...response(''), status: 404 } },
    responses: new Map([['/composer.lock', response(body)]]),
  };
}

const exposed = () => [makeFinding('EX-04', 'critical', 'confirmed', ['GET /composer.lock → 200'])];

describe('composer constraints', () => {
  it.each(constraints.cases)('$constraint with $version', ({ constraint, version, expected }) => {
    expect(satisfies(version, constraint)).toBe(expected);
  });
});

describe('composer.lock parsing', () => {
  it('reads production packages and skips packages-dev', () => {
    const text = lock(
      [{ name: 'Guzzlehttp/Guzzle', version: '7.4.3' }],
      [{ name: 'phpunit/phpunit', version: '9.5.0' }],
    );
    expect(parseComposerLock(text)).toEqual({
      packages: [{ name: 'guzzlehttp/guzzle', version: '7.4.3' }],
      complete: true,
    });
  });

  it('reads the first part of a lock cut by the read cap', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ name: `vendor/p${i}`, version: '1.0.0' }));
    const cut = lock(many).slice(0, 64 * 1024);
    const parsed = parseComposerLock(cut);
    expect(parsed?.complete).toBe(false);
    expect(parsed?.packages.length).toBeGreaterThan(10);
    expect(parsed?.packages.length).toBeLessThan(80);
    // When the cut lands inside packages-dev, every production package was seen.
    const devCut = lock(many.slice(0, 2), many).slice(0, 64 * 1024);
    expect(parseComposerLock(devCut)).toMatchObject({ complete: true });
    expect(parseComposerLock(devCut)?.packages).toHaveLength(2);
  });

  it('ignores names that are not Composer package names', () => {
    const text = lock([
      { name: '<img src=x>/a', version: '1.0.0' },
      { name: '__proto__', version: '1.0.0' },
    ]);
    expect(parseComposerLock(text)).toBeNull();
    expect(parseComposerLock('{ "packages": "nope" }')).toBeNull();
  });
});

describe('VU-02 audit', () => {
  it('reports affected packages at the worst advisory severity', () => {
    const { findings, checked } = auditPackages(
      [
        { name: 'guzzlehttp/guzzle', version: '7.4.3' },
        { name: 'monolog/monolog', version: '1.11.0' },
        { name: 'league/commonmark', version: 'dev-main' },
        { name: 'vendor/unknown', version: '1.0.0' },
      ],
      DATA,
    );
    expect(checked).toBe(3);
    expect(findings.map((f) => [f.evidence[0], f.severity])).toEqual([
      ['composer.lock: guzzlehttp/guzzle 7.4.3', 'high'],
      ['composer.lock: monolog/monolog 1.11.0', 'low'],
    ]);
    const guzzle = findings[0];
    expect(guzzle?.confidence).toBe('likely');
    expect(guzzle?.evidence[1]).toMatch(/^advisories: PKSA-.*\(\+\d+ more\)$/);
    expect(guzzle?.refs.length).toBeLessThanOrEqual(5);
    expect(guzzle?.refs.every((r) => r.url.startsWith('https://'))).toBe(true);
  });

  it('raises a KEV-listed advisory to critical and marks it', () => {
    const jquery = [{ name: 'components/jquery', version: '3.4.1' }];
    const [finding] = auditPackages(jquery, { ...DATA, kev: subset.kev }).findings;
    expect(finding).toMatchObject({ severity: 'critical', kev: true });
    expect(finding?.evidence.at(-1)).toBe('exploited in the wild (CISA KEV): CVE-2020-11023');
    // Same package without the KEV list keeps the Packagist label.
    expect(auditPackages(jquery, DATA).findings[0]).toMatchObject({ severity: 'medium' });
    expect(auditPackages(jquery, DATA).findings[0]?.kev).toBeUndefined();
  });

  it('reports nothing for patched versions', () => {
    const { findings } = auditPackages([{ name: 'guzzlehttp/guzzle', version: '7.15.2' }], DATA);
    expect(findings).toEqual([]);
  });

  it('adds the audit to an EX-04 finding and says how much was read', () => {
    const body = lock([{ name: 'guzzlehttp/guzzle', version: '6.5.0' }]);
    const out = withLockAudit(exposed(), context(body), DATA);
    expect(out.map((f) => f.checkId)).toEqual(['EX-04', 'VU-02']);
    expect(out[0]?.evidence.at(-1)).toBe('packages audited: 1');

    const many = Array.from({ length: 80 }, (_, i) => ({ name: `vendor/p${i}`, version: '1.0.0' }));
    const cut = withLockAudit(exposed(), context(lock(many).slice(0, 64 * 1024)), DATA);
    expect(cut[0]?.evidence.at(-1)).toMatch(/first part only/);

    const empty = withLockAudit(exposed(), context(body), { ...DATA, packages: {} });
    expect(empty.map((f) => f.checkId)).toEqual(['EX-04']);
    expect(empty[0]?.evidence.at(-1)).toMatch(/no package advisory data yet/);
  });

  it('does nothing without an EX-04 finding', () => {
    const body = lock([{ name: 'guzzlehttp/guzzle', version: '6.5.0' }]);
    expect(withLockAudit([], context(body), DATA)).toEqual([]);
  });
});

describe('package advisory data', () => {
  it('parses the live data shape and rejects bad entries', () => {
    expect(parseAdvisoryData(DATA)?.packages).toEqual(subset.packages);
    const bad = { ...DATA, packages: { 'a/b': [{ id: 'X', affected: 1 }] } };
    expect(parseAdvisoryData(bad)).toBeNull();
    // Bundles from before F-034 have no kev list; a malformed one is rejected.
    const { kev: _kev, ...noKev } = { ...DATA, kev: subset.kev };
    expect(parseAdvisoryData(noKev)?.kev).toEqual([]);
    expect(parseAdvisoryData({ ...DATA, kev: subset.kev })?.kev).toEqual(['CVE-2020-11023']);
    expect(parseAdvisoryData({ ...DATA, kev: [1] })).toBeNull();
    const { packages: _, ...noPackages } = DATA;
    expect(parseAdvisoryData(noPackages)).toBeNull();
    const packages: unknown = JSON.parse('{"__proto__": []}');
    const proto = parseAdvisoryData({ ...DATA, packages });
    expect(Object.getPrototypeOf(proto?.packages)).toBe(Object.prototype);
    expect(Object.hasOwn(proto?.packages ?? {}, '__proto__')).toBe(true);
  });

  it('keeps the bundled snapshot loadable', () => {
    expect(readFileSync(resolve('data/snapshot/advisories.json'), 'utf8')).toContain('"packages"');
    expect(parseAdvisoryData(snapshot)).not.toBeNull();
  });
});
