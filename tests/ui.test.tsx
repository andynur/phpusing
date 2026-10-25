import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../src/shared/i18n/I18nProvider';
import type { Finding } from '../src/shared/types';
import { Button } from '../src/shared/ui/Button';
import { EmptyState } from '../src/shared/ui/EmptyState';
import { FindingRow } from '../src/shared/ui/FindingRow';
import { SeverityBadge } from '../src/shared/ui/SeverityBadge';
import { VerdictCard } from '../src/shared/ui/VerdictCard';

function wrap(node: ReactNode) {
  return render(<I18nProvider>{node}</I18nProvider>);
}

// Fixture reuses existing keys; real check keys arrive with F-013.
const finding: Finding = {
  checkId: 'EX-01',
  severity: 'critical',
  confidence: 'confirmed',
  titleKey: 'verdict.major.title',
  impactKey: 'verdict.major.body',
  fixKey: 'verdict.mild.body',
  evidence: ['GET /.env → 200', 'keys: APP_KEY, DB_PASSWORD'],
  refs: [
    { label: 'OWASP', url: 'https://owasp.org/' },
    { label: 'bad', url: 'http://example.com/' },
  ],
  kev: true,
};

describe('UI primitives', () => {
  it('Button defaults to type=button and primary style', () => {
    wrap(<Button>Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn.className).toContain('bg-brand');
  });

  it('SeverityBadge shows icon, label and severity colors', () => {
    const { container } = wrap(<SeverityBadge severity="high" count={2} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.firstElementChild?.className).toContain('text-sev-high');
  });

  it('VerdictCard shows title, body, only non-zero counts and meta', () => {
    wrap(
      <VerdictCard
        verdict="major"
        counts={{ critical: 1, medium: 0, low: 3 }}
        requestsUsed={41}
        dataDate="2026-10-25"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Major headache' })).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.queryByText('Medium')).toBeNull();
    expect(screen.getByText('41 requests · data 25 Oct 2026')).toBeInTheDocument();
  });

  it('FindingRow expands with evidence as text and links https refs only', async () => {
    wrap(
      <ul>
        <FindingRow finding={finding} />
      </ul>,
    );
    const toggle = screen.getByRole('button', { name: /Major headache/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Evidence')).toBeNull();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('GET /.env → 200')).toBeInTheDocument();
    expect(screen.getByText('Exploited in the wild')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'OWASP' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();
    expect(screen.getByText('bad')).toBeInTheDocument();
  });

  it('EmptyState renders message and action', () => {
    wrap(<EmptyState message="Nothing here" action={<Button>Retry</Button>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
