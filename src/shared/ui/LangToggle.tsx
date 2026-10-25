import { useI18n } from '../i18n/I18nProvider';
import { LANGS } from '../i18n';

// Segmented EN | ID control (DESIGN.md §6).
export function LangToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className="inline-flex rounded-sm border border-border bg-surface p-0.5"
    >
      {LANGS.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            title={t(code === 'en' ? 'lang.enName' : 'lang.idName')}
            onClick={() => setLang(code)}
            className={
              'rounded-sm px-2 py-0.5 text-xs font-semibold transition-colors duration-150 ' +
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
              (active ? 'bg-brand text-on-brand' : 'text-fg-muted hover:text-fg')
            }
          >
            {t(code === 'en' ? 'lang.en' : 'lang.id')}
          </button>
        );
      })}
    </div>
  );
}
