import { safeText, type Baseline } from '../scanner/baseline';
import type { Finding } from '../shared/types';
import type { PathCheck } from './exposure';
import { makeFinding } from './finding';

// Configuration checks CF-01, CF-02, CF-04 (04_CHECKS.md). CF-03 is not in v0.1.

const DEBUG_MARKERS: [RegExp, string][] = [
  [/Ignition|flareapp/, 'Ignition'],
  [/Whoops! There was an error/, 'Whoops'],
  [/Symfony Exception|sf-dump/, 'Symfony'],
];

// CF-01: the random missing path already went through the app's error handler.
export function debugMode(baseline: Baseline): Finding | null {
  const { missing } = baseline;
  const body = missing.bodyText;
  let marker = DEBUG_MARKERS.find(([re]) => re.test(body))?.[1];
  if (!marker && body.includes('Stack trace:') && /\.php:\d+/.test(body))
    marker = 'PHP stack trace';
  if (!marker) return null;
  return makeFinding('CF-01', 'critical', 'confirmed', [
    `GET ${safeText(missing.path)} → ${missing.status}`,
    `marker: ${marker}`,
  ]);
}

/**
 * CF-02: the tab loaded the site over plain HTTP without a redirect to HTTPS.
 * No https:// probe: that is a second origin outside the granted permission (D-003).
 */
export function plainHttp(origin: string): Finding | null {
  return origin.startsWith('http://')
    ? makeFinding('CF-02', 'medium', 'confirmed', [`origin: ${origin}`])
    : null;
}

// CF-04: directory listing in folders that usually hold uploads, logs or dependencies.
export const CONFIG_PATH_CHECKS: readonly PathCheck[] = [
  {
    id: 'CF-04',
    severity: 'high',
    confidence: 'confirmed',
    paths: ['/vendor/', '/storage/', '/uploads/', '/wp-content/uploads/'],
    match: (res) => (res.bodyText.includes('Index of /') ? ['marker: Index of /'] : null),
  },
];
