import type { ReactNode } from 'react';
import { Icon } from './Icon';

// Small mark + one friendly line + one action (DESIGN.md §6). Pass translated text.
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <Icon name="lens" className="size-8 text-fg-subtle" />
      <p className="text-fg-muted">{message}</p>
      {action}
    </div>
  );
}
