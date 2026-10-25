import { describe, expect, it } from 'vitest';
import { makeFinding } from '../src/checks/finding';
import type { Severity } from '../src/shared/types';
import { computeVerdict } from '../src/shared/verdict';

const f = (severity: Severity) => makeFinding('EX-01', severity, 'confirmed', []);
const known = { phpDetected: true, php: '8.3.14' };

describe('computeVerdict', () => {
  it('any critical is major, even when blocked', () => {
    expect(computeVerdict({ findings: [f('low'), f('critical')], fingerprint: {} })).toBe('major');
    expect(computeVerdict({ findings: [f('critical')], fingerprint: {}, blocked: true })).toBe(
      'major',
    );
  });

  it('high or medium without critical is mild', () => {
    expect(computeVerdict({ findings: [f('high')], fingerprint: known })).toBe('mild');
    expect(computeVerdict({ findings: [f('medium'), f('info')], fingerprint: {} })).toBe('mild');
  });

  it('calm needs a known, supported PHP version and only low/info findings', () => {
    expect(
      computeVerdict({ findings: [f('low'), f('info')], fingerprint: known, phpSupported: true }),
    ).toBe('calm');
    expect(computeVerdict({ findings: [], fingerprint: known, phpSupported: true })).toBe('calm');
  });

  it('is unknown when blocked, PHP not detected, version hidden or support unknown', () => {
    expect(
      computeVerdict({ findings: [], fingerprint: known, phpSupported: true, blocked: true }),
    ).toBe('unknown');
    expect(computeVerdict({ findings: [], fingerprint: {}, phpSupported: true })).toBe('unknown');
    expect(
      computeVerdict({
        findings: [f('info')],
        fingerprint: { phpDetected: true },
        phpSupported: true,
      }),
    ).toBe('unknown');
    expect(computeVerdict({ findings: [], fingerprint: known })).toBe('unknown');
  });
});
