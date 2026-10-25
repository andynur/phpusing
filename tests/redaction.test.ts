// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyze } from '../src/checks';
import { buildPlan } from '../src/scanner/plan';
import { runScan } from '../src/scanner/scan';
import { fakeFetch } from './helpers/fake-site';

const ENV = readFileSync(resolve('tests/fixtures/EX-01/positive.env'), 'utf8');
// Every value in the fixture .env; none may appear in the result.
const VALUES = ENV.split('\n')
  .map((l) => l.split('=').slice(1).join('='))
  .filter((v) => v.length > 3);

describe('secret redaction', () => {
  it('keeps .env values out of the serialized scan result', async () => {
    const run = await runScan({
      origin: 'https://shop.example.com',
      signal: new AbortController().signal,
      plan: () => buildPlan({}),
      analyze: (ctx) => analyze(ctx, {}),
      fetchImpl: fakeFetch((p) =>
        p === '/' ? { body: '<title>Shop</title>' } : p === '/.env' ? { body: ENV } : undefined,
      ),
      slotDelayMs: 0,
    });
    const json = JSON.stringify(run.findings);
    expect(run.findings.map((f) => f.checkId)).toEqual(['EX-01']);
    expect(VALUES.length).toBeGreaterThan(3);
    for (const value of VALUES) expect(json).not.toContain(value);
  });
});
