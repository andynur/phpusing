import { DATA_PUBLIC_KEY } from './config';
import type { AdvisoryData } from './load';

// Signature and shape checks for downloaded advisory data (docs/05_ADVISORY_DATA.md).

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Ed25519 over the exact bytes of advisories.json. Any error counts as a mismatch. */
export async function verifySignature(
  body: Uint8Array<ArrayBuffer>,
  signatureBase64: string,
  publicKeyBase64: string = DATA_PUBLIC_KEY,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      fromBase64(publicKeyBase64),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, fromBase64(signatureBase64), body);
  } catch {
    return false;
  }
}

const VERSION = /^(\d{4}-\d{2}-\d{2})\.(\d+)$/;

/** Orders "2026-10-26.12" style versions; an unparsable version sorts first. */
export function compareVersions(a: string, b: string): number {
  const pa = VERSION.exec(a);
  const pb = VERSION.exec(b);
  if (!pa || !pb) return pa ? 1 : pb ? -1 : 0;
  const [, dateA = '', serialA] = pa;
  const [, dateB = '', serialB] = pb;
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return Number(serialA) - Number(serialB);
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Keeps only the fields the checks read; returns null when the bundle has the wrong shape. */
export function parseAdvisoryData(value: unknown): AdvisoryData | null {
  if (!isRecord(value) || !isString(value.version) || !VERSION.test(value.version)) return null;
  const { php, eol } = value;
  if (!Array.isArray(php) || !isRecord(eol) || !Array.isArray(eol.php) || !isString(eol.source)) {
    return null;
  }
  const phpOk = php.every(
    (e) =>
      isRecord(e) &&
      isString(e.id) &&
      isStrings(e.cves) &&
      isStrings(e.fixed) &&
      isString(e.unfixedBelow) &&
      isString(e.source),
  );
  const eolOk = eol.php.every(
    (c) => isRecord(c) && isString(c.cycle) && isString(c.eol) && isString(c.latest),
  );
  if (!phpOk || !eolOk) return null;
  return {
    version: value.version,
    php: php.map(({ id, cves, fixed, unfixedBelow, source }) => ({
      id,
      cves,
      fixed,
      unfixedBelow,
      source,
    })),
    eol: {
      source: eol.source,
      php: eol.php.map(({ cycle, eol: date, latest }) => ({ cycle, eol: date, latest })),
    },
  };
}
