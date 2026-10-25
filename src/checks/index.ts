import type { ScanContext } from '../scanner/scan';
import type { Finding } from '../shared/types';

// Runs every check over the collected responses. Check families join with F-012 to F-014.
export function analyze(_context: ScanContext): Finding[] {
  return [];
}
