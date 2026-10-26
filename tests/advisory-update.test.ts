import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import snapshot from '../data/snapshot/advisories.json';
import { DATA_PUBLIC_KEY } from '../src/advisories/config';
import {
  advisoriesForScan,
  currentAdvisories,
  DATA_MAX_BYTES,
  updateAdvisories,
} from '../src/advisories/update';
import { compareVersions, parseAdvisoryData, verifySignature } from '../src/advisories/verify';
import { generateKeys, signBundle, type Bundle } from '../tools/build-data/lib.mjs';
import { fakeFetch, type FakeRoute } from './helpers/fake-site';

const keys = generateKeys();
const DAY = 86_400_000;
const NOW = Date.parse('2026-11-10T00:00:00Z');

function bundle(version: string): Bundle {
  return { ...snapshot, version, generatedAt: `${version.slice(0, 10)}T00:00:00Z`, packages: {} };
}

/** The static host: advisories.json, its signature and meta.json, as the pipeline writes them. */
function host(version: string, override: Record<string, FakeRoute> = {}, log: string[] = []) {
  const { body, signature, meta } = signBundle(bundle(version), keys.privateKey);
  const files: Record<string, FakeRoute> = {
    '/phpusing/v1/advisories.json': { body: body.toString() },
    '/phpusing/v1/advisories.json.sig': { body: signature },
    '/phpusing/v1/meta.json': { body: JSON.stringify(meta) },
    ...override,
  };
  return fakeFetch((path) => files[path], log);
}

const deps = (fetchImpl: typeof fetch) => ({
  fetchImpl,
  now: () => NOW,
  publicKey: keys.publicKey,
});

describe('advisory signature', () => {
  it('accepts the pipeline signature and rejects changed bytes or another key', async () => {
    const { body, signature } = signBundle(bundle('2026-11-09.3'), keys.privateKey);
    const bytes = new Uint8Array(body);
    expect(await verifySignature(bytes, signature, keys.publicKey)).toBe(true);
    expect(await verifySignature(bytes, `${signature}\n`, keys.publicKey)).toBe(true);
    const changed = new Uint8Array(bytes);
    changed[10] = (changed[10] ?? 0) ^ 1;
    expect(await verifySignature(changed, signature, keys.publicKey)).toBe(false);
    expect(await verifySignature(bytes, signature, DATA_PUBLIC_KEY)).toBe(false);
    expect(await verifySignature(bytes, 'not base64!', keys.publicKey)).toBe(false);
  });

  it('orders versions by date, then serial', () => {
    expect(compareVersions('2026-10-26.12', '2026-10-26.9')).toBeGreaterThan(0);
    expect(compareVersions('2026-10-25.99', '2026-10-26.1')).toBeLessThan(0);
    expect(compareVersions('2026-10-26.1', '2026-10-26.1')).toBe(0);
    expect(compareVersions('junk', '2026-10-26.1')).toBeLessThan(0);
  });

  it('rejects bundles with the wrong shape', () => {
    expect(parseAdvisoryData(bundle('2026-11-09.3'))?.php).toEqual(snapshot.php);
    expect(parseAdvisoryData({ ...bundle('2026-11-09.3'), php: [{ id: 1 }] })).toBeNull();
    expect(parseAdvisoryData({ ...bundle('bad'), version: 'bad' })).toBeNull();
    expect(parseAdvisoryData('[]')).toBeNull();
  });
});

describe('advisory update', () => {
  it('stores newer signed data and uses it afterwards', async () => {
    const log: string[] = [];
    expect(await updateAdvisories(deps(host('2026-11-09.3', {}, log)))).toEqual({
      ok: true,
      status: 'updated',
      version: '2026-11-09.3',
    });
    expect(log).toEqual([
      'GET /phpusing/v1/meta.json',
      'GET /phpusing/v1/advisories.json',
      'GET /phpusing/v1/advisories.json.sig',
    ]);
    expect((await currentAdvisories()).version).toBe('2026-11-09.3');
    const { advisoryMeta } = await fakeBrowser.storage.local.get('advisoryMeta');
    expect(advisoryMeta).toMatchObject({ version: '2026-11-09.3', date: '2026-11-09' });
    expect((advisoryMeta as { sha256: string }).sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('keeps the old data when the signature does not match', async () => {
    const forged = host('2026-11-09.3', {
      '/phpusing/v1/advisories.json': { body: JSON.stringify(bundle('2026-11-09.4')) },
    });
    expect(await updateAdvisories(deps(forged))).toEqual({ ok: false, reason: 'failed' });
    expect((await currentAdvisories()).version).toBe(snapshot.version);
  });

  it('never rolls back to an older signed file, even when meta.json claims it is new', async () => {
    const old = host('2026-10-20.1', {
      '/phpusing/v1/meta.json': { body: JSON.stringify({ version: '2026-12-01.1' }) },
    });
    expect(await updateAdvisories(deps(old))).toEqual({
      ok: true,
      status: 'current',
      version: snapshot.version,
    });
    expect(await fakeBrowser.storage.local.get('advisoryData')).toEqual({});
  });

  it('skips the download when meta.json shows nothing newer', async () => {
    const log: string[] = [];
    await updateAdvisories(deps(host(snapshot.version, {}, log)));
    expect(log).toEqual(['GET /phpusing/v1/meta.json']);
  });

  it('fails on HTTP errors, redirects and oversized files', async () => {
    const missing = host('2026-11-09.3', { '/phpusing/v1/advisories.json.sig': { status: 404 } });
    expect(await updateAdvisories(deps(missing))).toEqual({ ok: false, reason: 'failed' });
    const huge = host('2026-11-09.3', {
      '/phpusing/v1/advisories.json': { body: 'x'.repeat(DATA_MAX_BYTES + 1) },
    });
    expect(await updateAdvisories(deps(huge))).toEqual({ ok: false, reason: 'failed' });
    const inits: RequestInit[] = [];
    await updateAdvisories(
      deps((async (_input: RequestInfo | URL, init?: RequestInit) => {
        inits.push(init ?? {});
        throw new TypeError('redirect');
      }) as typeof fetch),
    );
    expect(inits[0]).toMatchObject({ credentials: 'omit', redirect: 'error', cache: 'no-store' });
  });
});

describe('automatic check on scan', () => {
  it('checks once data is older than 7 days, at most once per interval', async () => {
    const log: string[] = [];
    const fetchImpl = host(snapshot.version, {}, log);
    await advisoriesForScan(true, deps(fetchImpl));
    await advisoriesForScan(true, deps(fetchImpl));
    expect(log).toEqual(['GET /phpusing/v1/meta.json']);
  });

  it('returns newer data from the check', async () => {
    const data = await advisoriesForScan(true, deps(host('2026-11-09.3')));
    expect(data.version).toBe('2026-11-09.3');
  });

  it('does not ask the host when disabled or when data is fresh', async () => {
    const log: string[] = [];
    const fetchImpl = host('2026-11-09.3', {}, log);
    await advisoriesForScan(false, deps(fetchImpl));
    const fresh = {
      ...deps(fetchImpl),
      now: () => Date.parse(snapshot.version.slice(0, 10)) + DAY,
    };
    await advisoriesForScan(true, fresh);
    expect(log).toEqual([]);
  });
});
