// @vitest-environment node
import { describe, expect, it } from 'vitest';
import snapshot from '../data/snapshot/advisories.json';
import phpCore from '../tools/build-data/php-core.json';
import {
  buildBundle,
  canonicalJson,
  dataVersion,
  generateKeys,
  normalizeEol,
  normalizeKev,
  normalizePackages,
  parsePrivateKey,
  signBundle,
  validatePhpCore,
  verifyBundle,
} from '../tools/build-data/lib.mjs';

const eolRaw = [
  { cycle: '8.4', releaseDate: '2024-11-21', eol: '2028-12-31', latest: '8.4.27', lts: false },
  { cycle: '8.1', eol: '2025-12-31', latest: '8.1.34' },
];

const packagistRaw = {
  advisories: {
    'laravel/framework': [
      {
        advisoryId: 'PKSA-b',
        cve: 'CVE-2026-114509',
        affectedVersions: '<12.68.0|>=13.0.0,<13.29.0',
        severity: 'critical',
        link: 'https://github.com/advisories/GHSA-f9x3-7vq9-cph6',
        title: 'dropped',
      },
      {
        advisoryId: 'PKSA-a',
        cve: null,
        affectedVersions: '<1.0',
        link: 'http://insecure.example/',
      },
    ],
    'empty/package': [{ advisoryId: 'PKSA-c', affectedVersions: '' }],
  },
};

// Synthetic catalog: one CVE our packages name, one they do not, one malformed ID.
const kevRaw = {
  catalogVersion: '2026.10.23',
  vulnerabilities: [
    { cveID: 'CVE-2026-114509' },
    { cveID: 'CVE-2014-0001' },
    { cveID: 'not-a-cve' },
  ],
};

const input = {
  phpCore: phpCore.php,
  eolRaw,
  packagistRaw,
  kevRaw,
  generatedAt: '2026-10-27T03:17:00Z',
  serial: 4,
};

describe('advisory data pipeline', () => {
  it('serializes with sorted keys and no whitespace', () => {
    expect(canonicalJson({ b: 1, a: { d: [{ z: 1, y: 2 }], c: null } })).toBe(
      '{"a":{"c":null,"d":[{"y":2,"z":1}]},"b":1}',
    );
  });

  it('builds the bundle shape the extension loads', () => {
    const bundle = buildBundle(input);
    expect(bundle.version).toBe('2026-10-27.4');
    expect(bundle.eol.php).toEqual([
      { cycle: '8.4', eol: '2028-12-31', latest: '8.4.27' },
      { cycle: '8.1', eol: '2025-12-31', latest: '8.1.34' },
    ]);
    expect(bundle.packages).toEqual({
      'laravel/framework': [
        { id: 'PKSA-a', cve: null, affected: '<1.0', severity: null, url: null },
        {
          id: 'PKSA-b',
          cve: 'CVE-2026-114509',
          affected: '<12.68.0|>=13.0.0,<13.29.0',
          severity: 'critical',
          url: 'https://github.com/advisories/GHSA-f9x3-7vq9-cph6',
        },
      ],
    });
    expect(bundle.kev).toEqual(['CVE-2026-114509']);
  });

  it('keeps the bundled snapshot in step with the curated PHP core entries', () => {
    expect(snapshot.php).toEqual(validatePhpCore(phpCore.php));
  });

  it('rejects data it cannot trust', () => {
    const entry = phpCore.php[0]!;
    expect(() => validatePhpCore([{ ...entry, source: 'http://php.net/' }])).toThrow(/source/);
    expect(() => validatePhpCore([{ ...entry, cves: ['CVE-26-1'] }])).toThrow(/cves/);
    expect(() => normalizeEol([{ cycle: '8.4', eol: false, latest: '8.4.27' }])).toThrow(/EOL/);
    expect(() => normalizeEol([])).toThrow();
    expect(() => normalizePackages({})).toThrow();
    expect(() => normalizeKev({ vulnerabilities: [] }, [], {})).toThrow(/KEV/);
    expect(() => normalizeKev({ vulnerabilities: [{ cveID: 'x' }] }, [], {})).toThrow(/KEV/);
    expect(() => dataVersion('2026-10-27', 0)).toThrow();
  });

  it('finds the private key in a pasted secret without echoing it', () => {
    const keys = generateKeys();
    const pasted = `Public key (commit to src/advisories/config.ts):\n${keys.publicKey}\n\nPrivate key (GitHub secret PHPUSING_DATA_KEY, never commit):\n${keys.privateKey}\n`;
    const { body, signature } = signBundle(buildBundle(input), pasted);
    expect(verifyBundle(body, signature, keys.publicKey)).toBe(true);
    expect(() => parsePrivateKey(keys.publicKey)).toThrow(/found 0/);
    expect(() => parsePrivateKey(`${keys.privateKey}\n${generateKeys().privateKey}`)).toThrow(
      /found 2/,
    );
    try {
      parsePrivateKey('secret-material-xyz');
    } catch (error) {
      expect(String(error)).not.toContain('secret-material-xyz');
    }
  });

  it('signs bytes that verify with the raw public key, in Node and WebCrypto', async () => {
    const keys = generateKeys();
    const { body, signature, meta } = signBundle(buildBundle(input), keys.privateKey);
    expect(meta).toMatchObject({ version: '2026-10-27.4', bytes: body.length });
    expect(meta.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyBundle(body, signature, keys.publicKey)).toBe(true);

    const tampered = Buffer.from(body);
    tampered[10] = tampered[10]! ^ 1;
    expect(verifyBundle(tampered, signature, keys.publicKey)).toBe(false);
    expect(verifyBundle(body, signature, generateKeys().publicKey)).toBe(false);

    // The extension verifies with WebCrypto Ed25519 and a raw 32-byte public key (F-031).
    const bytes = (b64: string) => new Uint8Array(Buffer.from(b64, 'base64'));
    const key = await crypto.subtle.importKey(
      'raw',
      bytes(keys.publicKey),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      bytes(signature),
      new Uint8Array(body),
    );
    expect(ok).toBe(true);
  });
});
