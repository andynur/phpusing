import type { ScanContext } from '../scanner/scan';
import type { Finding, Fingerprint } from '../shared/types';
import { EXPOSURE_CHECKS, runPathChecks } from './exposure';

// Runs every check over the collected responses. Config checks join with F-014.
export function analyze(context: ScanContext, _fingerprint: Fingerprint): Finding[] {
  return runPathChecks(EXPOSURE_CHECKS, context.responses, context.baseline);
}
