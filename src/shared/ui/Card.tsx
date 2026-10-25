import type { ReactNode } from 'react';

// Surface card: --r-lg, border, single card shadow (none in dark).
export function Card({
  as: Tag = 'section',
  children,
}: {
  as?: 'section' | 'div' | 'article';
  children: ReactNode;
}) {
  return (
    <Tag className="rounded-lg border border-border bg-surface p-4 shadow-card">{children}</Tag>
  );
}
