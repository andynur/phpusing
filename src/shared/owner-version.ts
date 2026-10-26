import type { AdvisoryData } from '../advisories/load';
import { checkPhpVersion } from '../checks/versions';
import type { ScanResult } from './types';
import { computeVerdict } from './verdict';

// FR-19, D-013: re-judge a scan with the PHP version the owner entered. Memory only, never stored.

/** True when VU-01 could not see the PHP version. */
export function phpVersionHidden(result: ScanResult): boolean {
  return result.findings.some((f) => f.checkId === 'VU-01' && f.confidence === 'version-hidden');
}

export function withOwnerVersion(
  result: ScanResult,
  version: string,
  data: AdvisoryData,
  today: string,
): ScanResult {
  const fingerprint = { ...result.fingerprint, phpDetected: true, php: version };
  const vu = checkPhpVersion(fingerprint, data, today, 'owner');
  const findings = [...result.findings.filter((f) => f.checkId !== 'VU-01'), ...vu.findings];
  return {
    ...result,
    fingerprint,
    findings,
    verdict: computeVerdict({
      findings,
      fingerprint,
      blocked: result.blocked,
      phpSupported: vu.phpSupported,
    }),
    phpEnteredByOwner: version,
  };
}
