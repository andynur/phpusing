// Builds, signs and writes the advisory data for static hosting (docs/05_ADVISORY_DATA.md).
// Usage: PHPUSING_DATA_KEY=<pkcs8 base64> node tools/build-data/build.mjs [--out data/dist] [--serial N]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { EOL_URL, PACKAGIST_URL, buildBundle, signBundle } from './lib.mjs';

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'data/dist' },
    serial: { type: 'string', default: '1' },
  },
});

const key = process.env.PHPUSING_DATA_KEY;
if (!key) {
  console.error('PHPUSING_DATA_KEY is not set. Run `node tools/build-data/keygen.mjs` once.');
  process.exit(1);
}

async function getJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'phpusing-build-data' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

const [eolRaw, packagistRaw] = await Promise.all([getJson(EOL_URL), getJson(PACKAGIST_URL)]);
const phpCore = JSON.parse(readFileSync(new URL('./php-core.json', import.meta.url), 'utf8')).php;
const bundle = buildBundle({
  phpCore,
  eolRaw,
  packagistRaw,
  generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  serial: Number(values.serial),
});
const { body, signature, meta } = signBundle(bundle, key);

// Versioned path, so the format can change later without breaking installed extensions.
const dir = join(values.out, 'v1');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'advisories.json'), body);
writeFileSync(join(dir, 'advisories.json.sig'), signature);
writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta));
console.log(
  `advisory data ${meta.version}: ${Object.keys(bundle.packages).length} packages, ${meta.bytes} bytes, sha256 ${meta.sha256}`,
);
