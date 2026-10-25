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
