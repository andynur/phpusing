import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';

// One icon button that flips light/dark; the label names the action. Initial theme is light (PRD FR-16).
export function ThemeToggle() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';
  const label = t(next === 'dark' ? 'theme.toDark' : 'theme.toLight');

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
      className={
        'inline-flex size-7 items-center justify-center rounded-sm border border-border bg-surface text-fg-muted ' +
        'transition-colors duration-150 hover:bg-surface-muted hover:text-fg ' +
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
      }
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} />
    </button>
  );
}
