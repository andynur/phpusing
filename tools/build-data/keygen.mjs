// One-time Ed25519 key pair for the advisory data. Prints to the terminal only; writes no files.
// Private key: GitHub Actions secret PHPUSING_DATA_KEY. Public key: compiled into the extension (F-031).
import { generateKeys } from './lib.mjs';

const { publicKey, privateKey } = generateKeys();
console.log(`Public key (commit to src/advisories/config.ts):\n${publicKey}\n`);
console.log(`Private key (GitHub secret PHPUSING_DATA_KEY, never commit):\n${privateKey}`);
