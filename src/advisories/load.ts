import snapshot from '../../data/snapshot/advisories.json';

// Bundled advisory snapshot (05_ADVISORY_DATA.md). Signed downloads and updates arrive with F-030/F-031.

export interface PhpCoreAdvisory {
  id: string;
  cves: string[];
  /** Fixed patch per supported minor line, e.g. "8.3.36". */
  fixed: string[];
  /** Minor lines below this one have no upstream fix at all. */
  unfixedBelow: string;
  source: string;
}

export interface PhpCycle {
  cycle: string;
  eol: string;
  latest: string;
}

export interface AdvisoryData {
  version: string;
  php: PhpCoreAdvisory[];
  eol: { source: string; php: PhpCycle[] };
}

export function loadAdvisories(): AdvisoryData {
  return snapshot;
}

/** "2026-10-25.1" -> "2026-10-25", the date shown on reports. */
export function dataDate(version: string): string {
  return /^\d{4}-\d{2}-\d{2}/.exec(version)?.[0] ?? '';
}
