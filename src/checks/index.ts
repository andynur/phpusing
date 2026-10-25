import type { ScanContext } from '../scanner/scan';
import type { Finding, Fingerprint } from '../shared/types';
import { CONFIG_PATH_CHECKS, debugMode, plainHttp } from './config';
import { EXPOSURE_CHECKS, runPathChecks } from './exposure';

// Runs every check over the collected responses.
export function analyze(context: ScanContext, _fingerprint: Fingerprint): Finding[] {
  const { origin, baseline, responses } = context;
  return [
    ...runPathChecks(EXPOSURE_CHECKS, responses, baseline),
    ...runPathChecks(CONFIG_PATH_CHECKS, responses, baseline),
    debugMode(baseline),
    plainHttp(origin),
  ].filter((f): f is Finding => f !== null);
}
