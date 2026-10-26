// Advisory data pipeline helpers (docs/05_ADVISORY_DATA.md). Pure functions plus Node crypto;
// no network and no dependencies, so the GitHub Actions job runs without `pnpm install`.
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from 'node:crypto';

export const EOL_SOURCE = 'https://endoflife.date/php';
export const EOL_URL = 'https://endoflife.date/api/php.json';
export const PACKAGIST_URL = 'https://packagist.org/api/security-advisories/?updatedSince=0';

const CVE = /^CVE-\d{4}-\d{4,}$/;
const PATCH = /^\d+\.\d+\.\d+$/;
const MINOR = /^\d+\.\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS = /^https:\/\//;

function fail(message) {
  throw new Error(`build-data: ${message}`);
}

/** JSON with object keys sorted at every level and no whitespace: the exact bytes we sign. */
export function canonicalJson(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort(v[k])]),
      );
    }
    return v;
  };
  return JSON.stringify(sort(value));
}

/** Hand-curated PHP core entries: every value needs a source URL (05_ADVISORY_DATA.md). */
export function validatePhpCore(entries) {
  if (!Array.isArray(entries) || entries.length === 0) fail('php-core.json has no entries');
  for (const e of entries) {
    if (!e.id) fail('php entry without id');
    if (!e.cves?.length || !e.cves.every((c) => CVE.test(c))) fail(`${e.id}: bad cves`);
    if (!e.fixed?.length || !e.fixed.every((v) => PATCH.test(v))) fail(`${e.id}: bad fixed`);
    if (!MINOR.test(e.unfixedBelow)) fail(`${e.id}: bad unfixedBelow`);
    if (!HTTPS.test(e.source ?? '')) fail(`${e.id}: source must be an https URL`);
  }
  return entries.map(({ id, cves, fixed, unfixedBelow, source }) => ({
    id,
    cves,
    fixed,
    unfixedBelow,
    source,
  }));
}

/** endoflife.date PHP cycles; a cycle without an explicit EOL date is a data error. */
export function normalizeEol(raw) {
  if (!Array.isArray(raw) || raw.length === 0) fail('endoflife.date returned no cycles');
  return raw.map((c) => {
    if (!MINOR.test(c.cycle)) fail(`eol: bad cycle ${c.cycle}`);
    if (typeof c.eol !== 'string' || !DATE.test(c.eol)) fail(`eol: ${c.cycle} has no EOL date`);
    if (typeof c.latest !== 'string') fail(`eol: ${c.cycle} has no latest version`);
    return { cycle: c.cycle, eol: c.eol, latest: c.latest };
  });
}

/** Packagist security advisories, keyed by package and sorted for stable output. */
export function normalizePackages(raw) {
  const advisories = raw?.advisories;
  if (!advisories || typeof advisories !== 'object') fail('Packagist returned no advisories');
  const out = {};
  for (const name of Object.keys(advisories).sort()) {
    const list = Object.values(advisories[name])
      .filter((a) => typeof a.affectedVersions === 'string' && a.affectedVersions.trim())
      .map((a) => {
        if (!a.advisoryId) fail(`${name}: advisory without id`);
        if (a.cve && !CVE.test(a.cve)) fail(`${name}: bad cve ${a.cve}`);
        return {
          id: a.advisoryId,
          cve: a.cve || null,
          affected: a.affectedVersions,
          severity: a.severity || null,
          url: HTTPS.test(a.link ?? '') ? a.link : null,
        };
      })
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (list.length) out[name] = list;
  }
  if (Object.keys(out).length === 0) fail('Packagist returned no usable advisories');
  return out;
}

/** "2026-10-27" + serial 12 -> "2026-10-27.12"; reports show the date part. */
export function dataVersion(date, serial) {
  if (!DATE.test(date)) fail(`bad date ${date}`);
  if (!Number.isInteger(serial) || serial < 1) fail(`bad serial ${serial}`);
  return `${date}.${serial}`;
}

export function buildBundle({ phpCore, eolRaw, packagistRaw, generatedAt, serial }) {
  return {
    version: dataVersion(generatedAt.slice(0, 10), serial),
    generatedAt,
    php: validatePhpCore(phpCore),
    eol: { source: EOL_SOURCE, php: normalizeEol(eolRaw) },
    packages: normalizePackages(packagistRaw),
  };
}

/** advisories.json bytes, its detached Ed25519 signature and meta.json. */
export function signBundle(bundle, privateKeyBase64) {
  const body = Buffer.from(canonicalJson(bundle));
  const key = createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
  if (key.asymmetricKeyType !== 'ed25519') fail('signing key is not Ed25519');
  const signature = sign(null, body, key).toString('base64');
  const meta = {
    version: bundle.version,
    generatedAt: bundle.generatedAt,
    sha256: createHash('sha256').update(body).digest('hex'),
    bytes: body.length,
  };
  return { body, signature, meta };
}

/** Public key as 32 raw bytes in base64: the form compiled into the extension (F-031). */
export function verifyBundle(body, signatureBase64, publicKeyBase64) {
  const x = Buffer.from(publicKeyBase64, 'base64').toString('base64url');
  const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x }, format: 'jwk' });
  return verify(null, body, key, Buffer.from(signatureBase64, 'base64'));
}

export function generateKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKey: Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url').toString('base64'),
    privateKey: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
  };
}
