import { CONFIG_PATH_CHECKS } from '../checks/config';
import { EXPOSURE_CHECKS, planFor } from '../checks/exposure';
import type { Fingerprint } from '../shared/types';
import type { ProbeSpec } from './scan';

// Probe plan (scan pipeline step 5). Generic critical paths always run; runScan trims by severity.
export function buildPlan(_fingerprint: Fingerprint): ProbeSpec[] {
  return [...planFor(EXPOSURE_CHECKS), ...planFor(CONFIG_PATH_CHECKS)];
}
