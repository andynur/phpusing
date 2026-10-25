import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'border border-border bg-surface text-fg hover:bg-surface-muted',
  ghost: 'text-brand hover:bg-surface-muted',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
};

// Variants and sizes from DESIGN.md §6; focus ring is brand, 2 px, offset 2 px.
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 ' +
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
        'disabled:cursor-not-allowed disabled:opacity-50 ' +
        `${variants[variant]} ${sizes[size]} ${className}`
      }
      {...rest}
    />
  );
}
