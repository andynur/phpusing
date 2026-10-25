import type { ReactNode } from 'react';

// Inline stroke icons, 24 px grid, colored by currentColor. Decorative: labels carry the meaning.
export type IconName =
  | 'octagon-alert'
  | 'triangle-alert'
  | 'circle-alert'
  | 'info'
  | 'circle-dot'
  | 'circle-check'
  | 'chevron-down'
  | 'sun'
  | 'moon'
  | 'globe'
  | 'mark';

const paths: Record<IconName, ReactNode> = {
  'octagon-alert': (
    <>
      <path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9Z" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  'triangle-alert': (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  'circle-alert': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  'circle-dot': (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
  'circle-check': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a6.6 6.6 0 0 0 10.6 10.6Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
    </>
  ),
  // Logo mark at small size: head in profile + dot (DESIGN.md §7).
  mark: (
    <>
      <path d="M9 21v-3.5C6.5 16 5 13.5 5 10.5 5 6.4 8.4 3 12.5 3 16.2 3 19 5.6 19 9.2l1.6 3.2c.2.4-.1.9-.6.9h-1v2.2c0 1.1-.9 2-2 2h-1.5V21" />
      <circle cx="12.3" cy="10" r="1.5" fill="currentColor" />
    </>
  ),
};

export function Icon({ name, className = 'size-4' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={'shrink-0 ' + className}
    >
      {paths[name]}
    </svg>
  );
}
