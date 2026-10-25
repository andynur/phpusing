import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXPOSURE_CHECKS, envKeys, planFor, runPathChecks } from '../../src/checks/exposure';
import type { ProbeResponse } from '../../src/scanner/fetch';
import en from '../../src/shared/i18n/en.json';
import { baseline, res } from '../helpers/responses';

const fixture = (id: string, name: string) =>
  readFileSync(resolve('tests/fixtures', id, name), 'latin1');

function run(path: string, over: Partial<ProbeResponse>, base = baseline()) {
  return runPathChecks(EXPOSURE_CHECKS, new Map([[path, res(path, over)]]), base);
}

// [check, path, positive fixture, negative fixture]
const CASES: [string, string, string, string][] = [
  ['EX-01', '/.env', 'positive.env', 'negative.html'],
  ['EX-02', '/.git/HEAD', 'positive.txt', 'negative.html'],
  ['EX-03', '/.git/config', 'positive.txt', 'negative.html'],
  ['EX-04', '/composer.lock', 'positive.json', 'negative.json'],
  ['EX-05', '/composer.json', 'positive.json', 'negative.json'],
  ['EX-06', '/storage/logs/laravel.log', 'positive.log', 'negative.log'],
  ['EX-07', '/info.php', 'positive.html', 'negative.html'],
  ['EX-08', '/_ignition/health-check', 'positive.json', 'negative.json'],
  ['EX-10', '/telescope', 'positive.html', 'negative.html'],
  ['EX-11', '/adminer.php', 'positive.html', 'negative.html'],
  ['EX-12', '/dump.sql', 'positive.sql', 'negative.html'],
  ['EX-12', '/backup.zip', 'positive.zip', 'negative.html'],
];

describe.each(CASES)('%s %s', (id, path, positive, negative) => {
  it('matches the positive fixture', () => {
    const [finding] = run(path, { bodyText: fixture(id, positive) });
    expect(finding).toMatchObject({ checkId: id, titleKey: `check.${id}.title` });
    expect(finding?.evidence[0]).toBe(`GET ${path} → 200`);
  });

  it('ignores the negative fixture', () => {
    expect(run(path, { bodyText: fixture(id, negative) })).toEqual([]);
  });

  it('ignores a soft-404 copy of the missing page', () => {
    const body = fixture(id, positive);
    const soft = baseline({ missing: { status: 200, bodyText: body } });
    expect(run(path, { bodyText: body }, soft)).toEqual([]);
  });

  it('ignores redirects and error statuses', () => {
    const body = fixture(id, positive);
    expect(run(path, { bodyText: body, status: 302, redirected: true })).toEqual([]);
    expect(run(path, { bodyText: body, status: 403 })).toEqual([]);
  });
});

describe('EX-09 PHPUnit eval-stdin (HEAD)', () => {
  const path = '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php';

  it('reports a 200 when missing paths return 404', () => {
    const [finding] = run(path, { method: 'HEAD', status: 200 });
    expect(finding).toMatchObject({ checkId: 'EX-09', confidence: 'likely' });
    expect(finding?.evidence).toEqual([`HEAD ${path} → 200`]);
    expect(finding?.refs[0]?.label).toBe('CVE-2017-9841');
  });

  it('stays silent on a soft-404 site or a 404', () => {
    const soft = baseline({ missing: { status: 200, bodyText: '<title>Shop</title>' } });
    expect(run(path, { method: 'HEAD', status: 200 }, soft)).toEqual([]);
    expect(run(path, { method: 'HEAD', status: 404 })).toEqual([]);
  });
});

describe('EX-01 redaction', () => {
  it('lists key names, highlights secrets first, never values', () => {
    const lines = envKeys(fixture('EX-01', 'positive.env'));
    expect(lines).toEqual([
      'keys: APP_KEY, DB_PASSWORD, STRIPE_SECRET, APP_NAME, APP_ENV, DB_HOST',
    ]);
    expect(lines?.join()).not.toMatch(/fixture|FIXTURE|127\.0\.0\.1|base64/);
  });

  it('needs at least 3 key lines', () => {
    expect(envKeys('A=1\nB=2\n')).toBeNull();
  });
});

describe('exposure plan', () => {
  it('probes every catalog path once, HEAD only for EX-09', () => {
    const plan = planFor(EXPOSURE_CHECKS);
    expect(plan).toHaveLength(26);
    expect(plan.filter((p) => p.method === 'HEAD').map((p) => p.path)).toEqual([
      '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php',
    ]);
    expect(plan.every((p) => p.path.startsWith('/') && !p.path.includes('?'))).toBe(true);
  });

  it('has EN strings for every check', () => {
    for (const c of EXPOSURE_CHECKS) {
      for (const part of ['title', 'impact', 'fix']) {
        expect(en).toHaveProperty([`check.${c.id}.${part}`]);
      }
    }
  });
});
