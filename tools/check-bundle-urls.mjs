// Fails when the built extension contains a URL literal outside the allowlist
// (docs/06_SECURITY_PRIVACY.md, "Network allowlist").
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '.output/chrome-mv3';

// Prefixes that are not network calls (specs, namespaces) or are allowed hosts.
// The advisory data host joins this list with F-030.
const ALLOWED = [
  'http://www.w3.org/',
  'https://www.w3.org/',
  'https://react.dev/',
  'https://reactjs.org/',
  'https://tailwindcss.com', // license banner in CSS
  'https://github.com/andynur/phpusing',
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(js|html|css|json)$/.test(name)) yield path;
  }
}

const bad = [];
for (const file of files(ROOT)) {
  const text = readFileSync(file, 'utf8');
  for (const [url] of text.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
    if (!ALLOWED.some((prefix) => url.startsWith(prefix))) bad.push(`${file}: ${url}`);
  }
}

if (bad.length) {
  console.error(`Bundle contains ${bad.length} URL(s) outside the allowlist:\n${bad.join('\n')}`);
  process.exit(1);
}
console.log('Bundle URL allowlist: ok');
