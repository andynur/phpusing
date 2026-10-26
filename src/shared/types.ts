import type { MessageKey } from './i18n';

// Core types (docs/03_ARCHITECTURE.md). Text keys are typed MessageKey so a missing string fails typecheck.
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'confirmed' | 'likely' | 'version-hidden';
export type Verdict = 'calm' | 'mild' | 'major' | 'unknown';

export const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

export interface Finding {
  checkId: string;
  severity: Severity;
  confidence: Confidence;
  titleKey: MessageKey;
  impactKey: MessageKey;
  fixKey: MessageKey;
  evidence: string[];
  refs: { label: string; url: string }[];
  kev?: boolean;
}

export type SeverityCounts = Partial<Record<Severity, number>>;

// Stack guess from baseline responses and DOM markers (04_CHECKS.md, FP rows).
export interface Fingerprint {
  /** True when any PHP signal was seen, even without a version. */
  phpDetected?: boolean;
  /** Raw version from `X-Powered-By: PHP/...`, e.g. "8.1.2-1ubuntu2.14". */
  php?: string;
  server?: string;
  framework?: 'laravel';
  cms?: 'wordpress';
  cmsVersion?: string;
  livewire?: boolean;
}

// Read from the page by scripting.executeScript (docs/03_ARCHITECTURE.md, step 3). Untrusted.
export interface Markers {
  origin: string;
  cookieNames: string[];
  metaGenerator: string;
  /** Same-origin script and stylesheet paths, without query strings. */
  assetPaths: string[];
  hasCsrfMeta: boolean;
}

export interface ScanResult {
  origin: string;
  startedAt: string;
  requestsUsed: number;
  fingerprint: Fingerprint;
  findings: Finding[];
  verdict: Verdict;
  /** Advisory data version, e.g. "2026-10-25.1" (05_ADVISORY_DATA.md). */
  dataVersion: string;
  blocked?: boolean;
  /** PHP version the owner entered on the report page (FR-19, D-013). Never stored. */
  phpEnteredByOwner?: string;
}
