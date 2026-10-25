import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { App } from '../src/entrypoints/popup/App';
import { I18nProvider } from '../src/shared/i18n/I18nProvider';

function renderPopup() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}

describe('popup EN/ID toggle', () => {
  it('switches language instantly and stores the choice', async () => {
    renderPopup();
    expect(screen.getByText('Does your PHP site have a headache?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'ID' }));

    expect(screen.getByText('Apakah situs PHP Anda bikin pusing?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ID' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.lang).toBe('id');
    await waitFor(async () => {
      expect((await fakeBrowser.storage.local.get('settings')).settings).toEqual({ lang: 'id' });
    });
  });

  it('restores the stored language', async () => {
    await fakeBrowser.storage.local.set({ settings: { lang: 'id' } });
    renderPopup();
    expect(await screen.findByText('Apakah situs PHP Anda bikin pusing?')).toBeInTheDocument();
  });
});
