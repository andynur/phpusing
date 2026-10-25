import { useI18n } from '../../shared/i18n/I18nProvider';
import { Card } from '../../shared/ui/Card';
import { EmptyState } from '../../shared/ui/EmptyState';
import { LangToggle } from '../../shared/ui/LangToggle';

// Popup shell: 380 px wide, max 600 px tall (DESIGN.md §3 Layout).
export function App() {
  const { t } = useI18n();

  return (
    <main className="popup-frame flex flex-col gap-4 bg-canvas p-4 text-sm text-fg">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t('app.name')}</h1>
          <p className="text-fg-muted">{t('app.tagline')}</p>
        </div>
        <LangToggle />
      </header>
      <Card>
        <EmptyState message={t('popup.empty')} />
      </Card>
    </main>
  );
}
