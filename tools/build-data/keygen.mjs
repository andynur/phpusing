// One-time Ed25519 key pair for the advisory data.
//   node tools/build-data/keygen.mjs        prints both keys (store the private key yourself)
//   node tools/build-data/keygen.mjs --gh   sends the private key straight to the GitHub secret
//                                           PHPUSING_DATA_KEY via `gh`, never printing it, and
//                                           writes the public key into src/advisories/config.ts
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { generateKeys } from './lib.mjs';

const { publicKey, privateKey } = generateKeys();

if (!process.argv.includes('--gh')) {
  console.log(`Public key (commit to src/advisories/config.ts):\n${publicKey}\n`);
  console.log(`Private key (GitHub secret PHPUSING_DATA_KEY, never commit):\n${privateKey}`);
  process.exit(0);
}

const config = new URL('../../src/advisories/config.ts', import.meta.url);
const source = readFileSync(config, 'utf8');
const updated = source.replace(
  /(DATA_PUBLIC_KEY = ')[^']*(')/,
  (_, open, close) => open + publicKey + close,
);
if (updated === source) {
  console.error('DATA_PUBLIC_KEY not found in src/advisories/config.ts');
  process.exit(1);
}
// Set the secret only after config.ts is known to be writable, so the two never disagree.
execFileSync('gh', ['secret', 'set', 'PHPUSING_DATA_KEY'], {
  input: privateKey,
  stdio: ['pipe', 'inherit', 'inherit'],
});
writeFileSync(config, updated);
console.log(
  `Secret PHPUSING_DATA_KEY set. Public key written to src/advisories/config.ts:\n${publicKey}`,
);
console.log('Commit and push config.ts; the push runs the advisory-data workflow.');
