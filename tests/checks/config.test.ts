import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONFIG_PATH_CHECKS, debugMode, plainHttp } from '../../src/checks/config';
import { runPathChecks } from '../../src/checks/exposure';
import en from '../../src/shared/i18n/en.json';
import { baseline, res } from '../helpers/responses';

const fixture = (id: string, name: string) =>
  readFileSync(resolve('tests/fixtures', id, name), 'latin1');

describe('CF-01 debug mode', () => {
  it.each(['positive-ignition.html', 'positive-trace.txt'])('matches %s', (name) => {
    const f = debugMode(baseline({ missing: { status: 500, bodyText: fixture('CF-01', name) } }));
    expect(f).toMatchObject({ checkId: 'CF-01', severity: 'critical' });
    expect(f?.evidence[0]).toBe('GET /phpusing-abc → 500');
  });

  it('ignores a normal 404 page', () => {
    expect(
      debugMode(baseline({ missing: { bodyText: fixture('CF-01', 'negative.html') } })),
    ).toBeNull();
  });
});

describe('CF-02 HTTPS', () => {
  it('flags a plain HTTP origin only', () => {
    expect(plainHttp('http://shop.example.com')).toMatchObject({
      checkId: 'CF-02',
      severity: 'medium',
      evidence: ['origin: http://shop.example.com'],
    });
    expect(plainHttp('https://shop.example.com')).toBeNull();
  });
});

describe('CF-04 directory listing', () => {
  const run = (body: string, base = baseline()) =>
    runPathChecks(
      CONFIG_PATH_CHECKS,
      new Map([['/uploads/', res('/uploads/', { bodyText: body })]]),
      base,
    );

  it('matches an index page', () => {
    expect(run(fixture('CF-04', 'positive.html'))[0]).toMatchObject({
      checkId: 'CF-04',
      evidence: ['GET /uploads/ → 200', 'marker: Index of /'],
    });
  });

  it('ignores a normal page and a soft-404 copy', () => {
    expect(run(fixture('CF-04', 'negative.html'))).toEqual([]);
    const body = fixture('CF-04', 'positive.html');
    expect(run(body, baseline({ missing: { status: 200, bodyText: body } }))).toEqual([]);
  });
});

it('has EN strings for every config check', () => {
  for (const id of ['CF-01', 'CF-02', 'CF-04']) {
    for (const part of ['title', 'impact', 'fix'])
      expect(en).toHaveProperty([`check.${id}.${part}`]);
  }
});
