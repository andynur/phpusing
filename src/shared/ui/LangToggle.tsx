import { useI18n } from '../i18n/I18nProvider';
import { LANGS, type Lang, type MessageKey } from '../i18n';

// Segmented EN | ID control (DESIGN.md §6). Controls the UI language unless value/onChange are given.
export function LangToggle({
  value,
  onChange,
  labelKey = 'lang.label',
}: { value?: Lang; onChange?: (lang: Lang) => void; labelKey?: MessageKey } = {}) {
  const { lang: uiLang, setLang: setUiLang, t } = useI18n();
  const lang = value ?? uiLang;
  const setLang = onChange ?? setUiLang;

  return (
    <div
      role="group"
      aria-label={t(labelKey)}
      className="inline-flex h-7 items-center rounded-sm border border-border bg-surface p-0.5"
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
