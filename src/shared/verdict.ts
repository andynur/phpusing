import {
  SEVERITIES,
  type Finding,
  type Fingerprint,
  type SeverityCounts,
  type Verdict,
} from './types';

export function countSeverities(findings: readonly Finding[]): SeverityCounts {
  const counts: SeverityCounts = {};
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  return counts;
}

export interface VerdictInput {
  findings: readonly Finding[];
  fingerprint: Fingerprint;
  blocked?: boolean;
  /** True only when the PHP version is known and matched as supported and unaffected (VU-01). */
  phpSupported?: boolean;
}

// Verdict mapping (04_CHECKS.md). Never "calm" from absence of evidence alone (D-010, PRD FR-10).
export function computeVerdict({
  findings,
  fingerprint,
  blocked,
  phpSupported,
}: VerdictInput): Verdict {
  const counts = countSeverities(findings);
  if (counts.critical) return 'major';
  if (counts.high || counts.medium) return 'mild';
  if (blocked || !fingerprint.phpDetected || !fingerprint.php || !phpSupported) return 'unknown';
  return 'calm';
}

/** Most severe first; stable within a severity. */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity),
  );
}
