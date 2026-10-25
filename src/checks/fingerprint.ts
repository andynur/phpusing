import { safeText, type Baseline } from '../scanner/baseline';
import type { Fingerprint, Markers } from '../shared/types';

// FP-01..FP-05 (04_CHECKS.md). No extra requests: baseline responses and DOM markers only.

const LIST_CAP = 100;

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string').slice(0, LIST_CAP)
    : [];
}

// Markers come from the scanned page, so their shape is checked like any untrusted input.
export function parseMarkers(value: unknown, origin: string): Markers | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.origin !== origin) return null;
  return {
    origin,
    cookieNames: stringList(v.cookieNames).map((n) => safeText(n)),
    metaGenerator: typeof v.metaGenerator === 'string' ? safeText(v.metaGenerator) : '',
    assetPaths: stringList(v.assetPaths).map((p) => safeText(p, 200)),
    hasCsrfMeta: v.hasCsrfMeta === true,
  };
}

/**
 * Runs inside the page via scripting.executeScript, so it must stay self-contained.
 * Reads cookie names only; values are split off and dropped in the page.
 */
export function readMarkers(): Markers {
  const sameOrigin = (url: string) => {
    try {
      const u = new URL(url, location.href);
      return u.origin === location.origin ? u.pathname : null;
    } catch {
      return null;
    }
  };
  const urls = [
    ...Array.from(document.scripts, (s) => s.src),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]'), (l) => l.href),
  ];
  return {
    origin: location.origin,
    cookieNames: document.cookie
      .split(';')
      .map((c) => c.split('=')[0]?.trim() ?? '')
      .filter(Boolean)
      .slice(0, 50),
    metaGenerator:
      document.querySelector<HTMLMetaElement>('meta[name="generator" i]')?.content ?? '',
    assetPaths: urls
      .filter(Boolean)
      .map(sameOrigin)
      .filter((p): p is string => p !== null)
      .slice(0, 100),
    hasCsrfMeta: document.querySelector('meta[name="csrf-token"]') !== null,
  };
}

// FP-01: `X-Powered-By: PHP/8.3.1` (may carry a distro suffix, kept raw for VU-01).
export function phpFromHeader(value: string | undefined): string | undefined {
  const m = /\bPHP\/(\d+\.\d+(?:\.\d+)?[\w.+~-]*)/i.exec(value ?? '');
  return m?.[1] ? safeText(m[1], 40) : undefined;
}

// FP-04 fallback when markers are missing: the generator tag in the home page HTML.
function generatorFromHtml(html: string): string {
  const tag = /<meta[^>]+name=["']generator["'][^>]*>/i.exec(html)?.[0] ?? '';
  return safeText(/content=["']([^"']*)["']/i.exec(tag)?.[1] ?? '');
}

export function fingerprint(baseline: Baseline, markers: Markers | null): Fingerprint {
  const { root, missing } = baseline;
  const fp: Fingerprint = {};
  const powered = root.headers['x-powered-by'] ?? missing.headers['x-powered-by'];

  const php = phpFromHeader(powered);
  if (php) fp.php = php;

  // FP-02: server banner, info only.
  const server = root.headers['server'] ?? missing.headers['server'];
  if (server) fp.server = safeText(server, 60);

  const cookies = markers?.cookieNames ?? [];
  const assets = markers?.assetPaths ?? [];
  const html = root.bodyText;
  const phpSession = cookies.includes('PHPSESSID') || /\bPHP\b/i.test(powered ?? '');

  // FP-03: Laravel cookies. A csrf-token meta alone also matches Rails, so it needs a PHP signal.
  const laravelCookie = cookies.some((n) => n === 'XSRF-TOKEN' || /_session$/.test(n));
  if (laravelCookie || ((markers?.hasCsrfMeta ?? false) && phpSession)) fp.framework = 'laravel';

  // FP-04: WordPress generator or wp-content assets.
  const generator = markers?.metaGenerator || generatorFromHtml(html);
  const wpGenerator = /^WordPress\b\s*([\d.]+)?/i.exec(generator);
  const wpAssets =
    assets.some((p) => p.startsWith('/wp-content/') || p.startsWith('/wp-includes/')) ||
    /["'](?:https?:)?[^"']*\/wp-(?:content|includes)\//i.test(html);
  if (wpGenerator || wpAssets) fp.cms = 'wordpress';
  if (wpGenerator?.[1]) fp.cmsVersion = wpGenerator[1];

  // FP-05: Livewire script.
  if (
    assets.some((p) => /\/livewire(?:\.min)?\.js$/.test(p)) ||
    /livewire(?:\.min)?\.js/i.test(html)
  ) {
    fp.livewire = true;
  }

  if (php || phpSession || fp.framework || fp.cms || fp.livewire) fp.phpDetected = true;
  return fp;
}
