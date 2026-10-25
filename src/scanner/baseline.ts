import type { ProbeResponse } from './fetch';

// Soft-404 baseline (docs/03_ARCHITECTURE.md, scan pipeline step 2).

export interface Baseline {
  root: ProbeResponse;
  missing: ProbeResponse;
}

export function randomPath(random: () => number = Math.random): string {
  const id = Array.from({ length: 12 }, () => Math.floor(random() * 36).toString(36)).join('');
  return `/phpusing-${id}`;
}

// Evidence-safe text: control characters stripped, at most 80 characters (06_SECURITY_PRIVACY.md).
export function safeText(text: string, max = 80): string {
  const clean = text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function extractTitle(bodyText: string): string {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(bodyText);
  return m ? safeText(m[1] ?? '') : '';
}

export function isOk(res: ProbeResponse): boolean {
  return res.status >= 200 && res.status < 300 && !res.redirected;
}

/**
 * True when a response should count as "not found": not a 2xx, a redirect, or a copy of what
 * the site serves for the random missing path or the home page (same body hash or same title).
 */
export function isNotFound(res: ProbeResponse, baseline: Baseline): boolean {
  if (!isOk(res)) return true;
  for (const ref of [baseline.missing, baseline.root]) {
    if (!isOk(ref)) continue;
    if (res.bodyHash && res.bodyHash === ref.bodyHash) return true;
    const title = extractTitle(res.bodyText);
    if (title && title === extractTitle(ref.bodyText)) return true;
  }
  return false;
}
