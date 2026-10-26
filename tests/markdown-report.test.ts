import { describe, expect, it } from 'vitest';
import { makeFinding } from '../src/checks/finding';
import { markdownReport, reportFileName } from '../src/shared/markdown-report';
import type { ScanResult } from '../src/shared/types';

const env = makeFinding('EX-01', 'critical', 'confirmed', [
  'GET /.env → 200',
  'keys: APP_KEY, DB_PASSWORD',
]);
const lock = {
  ...makeFinding(
    'VU-02',
    'critical',
    'likely',
    ['composer.lock: components/jquery 3.4.1', 'title: ```](javascript:alert(1))'],
    [
      { label: 'CVE-2020-11023', url: 'https://nvd.nist.gov/vuln/detail/CVE-2020-11023' },
      { label: '[x](javascript:alert(1))', url: ['javascript', 'alert(1)'].join(':') },
    ],
  ),
  kev: true,
};

const RESULT: ScanResult = {
  origin: 'https://shop.example.com',
  startedAt: '2026-10-25T10:00:00.000Z',
  requestsUsed: 32,
  fingerprint: { phpDetected: true },
  findings: [env, lock],
  verdict: 'major',
  dataVersion: '2026-10-25.1',
};

describe('markdown report', () => {
  it('lists the verdict, findings by severity, evidence, fixes and limits', () => {
    const md = markdownReport('en', RESULT);
    expect(md).toContain('# phpusing report for https://shop.example.com');
    expect(md).toContain('**Major headache**');
    expect(md).toContain(
      'Checked on 2026-10-25 with 32 read-only requests · advisory data 2026-10-25',
    );
    expect(md).toContain('### Critical (2)');
    expect(md).toContain('#### EX-01: Your .env file is public');
    expect(md).toContain('Severity: Critical (likely) · Exploited in the wild');
    expect(md).toContain('keys: APP_KEY, DB_PASSWORD');
    expect(md).toContain('- [CVE-2020-11023](https://nvd.nist.gov/vuln/detail/CVE-2020-11023)');
    expect(md).toContain('cannot see logic bugs');
    expect(md).toContain('No attack was attempted.');
    expect(markdownReport('id', RESULT)).toContain('Tingkat bahaya: Kritis');
    expect(md).not.toContain('PHP version you entered');
    expect(markdownReport('en', { ...RESULT, phpEnteredByOwner: '8.3.35' })).toContain(
      'Verdict and findings use the PHP version you entered (8.3.35).',
    );
  });

  it('keeps scanned-site text and odd refs from becoming markup or links', () => {
    const md = markdownReport('en', RESULT);
    const fences = md.split('\n').filter((l) => l.startsWith('```'));
    expect(fences).toEqual(['```text', '```', '```text', '```']);
    // Inside the fence the text is inert; outside it, no link may point anywhere but https.
    expect(md).toContain("title: '''](javascript:alert(1))");
    const prose = md.replace(/```text[\s\S]*?```/g, '');
    expect(prose).not.toMatch(/(?<!\\)\]\((?!https:)/);
    expect(md).toContain('- \\[x\\](javascript:alert(1))');
  });

  it('says when nothing was found and names the file after host and date', () => {
    const empty = { ...RESULT, findings: [], verdict: 'calm' as const };
    expect(markdownReport('en', empty)).toContain('No findings in what we could see.');
    expect(reportFileName(RESULT)).toBe('phpusing-shop.example.com-2026-10-25.md');
    expect(reportFileName({ ...RESULT, origin: 'http://localhost:8080' })).toBe(
      'phpusing-localhost-8080-2026-10-25.md',
    );
  });
});
