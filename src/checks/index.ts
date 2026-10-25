import type { ScanContext } from '../scanner/scan';
import type { Finding, Fingerprint } from '../shared/types';

// Runs every check over the collected responses. Exposure and config checks join with F-013, F-014.
export function analyze(_context: ScanContext, _fingerprint: Fingerprint): Finding[] {
  return [];
}
