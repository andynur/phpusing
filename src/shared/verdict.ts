import type { Finding, SeverityCounts } from './types';

export function countSeverities(findings: readonly Finding[]): SeverityCounts {
  const counts: SeverityCounts = {};
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  return counts;
}
