// Types for tests; the pipeline itself runs as plain Node ESM.
export const EOL_SOURCE: string;
export const EOL_URL: string;
export const PACKAGIST_URL: string;

export interface PackageAdvisory {
  id: string;
  cve: string | null;
  affected: string;
  severity: string | null;
  url: string | null;
}

export interface Bundle {
  version: string;
  generatedAt: string;
  php: { id: string; cves: string[]; fixed: string[]; unfixedBelow: string; source: string }[];
  eol: { source: string; php: { cycle: string; eol: string; latest: string }[] };
  packages: Record<string, PackageAdvisory[]>;
}

export function canonicalJson(value: unknown): string;
export function validatePhpCore(entries: unknown): Bundle['php'];
export function normalizeEol(raw: unknown): Bundle['eol']['php'];
export function normalizePackages(raw: unknown): Bundle['packages'];
export function dataVersion(date: string, serial: number): string;
export function buildBundle(input: {
  phpCore: unknown;
  eolRaw: unknown;
  packagistRaw: unknown;
  generatedAt: string;
  serial: number;
}): Bundle;
export function signBundle(
  bundle: Bundle,
  privateKeyBase64: string,
): {
  body: Buffer;
  signature: string;
  meta: { version: string; generatedAt: string; sha256: string; bytes: number };
};
export function verifyBundle(
  body: Uint8Array,
  signatureBase64: string,
  publicKeyBase64: string,
): boolean;
export function generateKeys(): { publicKey: string; privateKey: string };
