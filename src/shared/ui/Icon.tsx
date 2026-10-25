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
  | 'lens';

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
  // Logo mark at small size: lens + dot (DESIGN.md §7).
  lens: (
    <>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m15.5 15.5 6 6" />
      <circle cx="10.5" cy="10.5" r="1.5" fill="currentColor" />
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
