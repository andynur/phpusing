import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { I18nProvider } from '../src/shared/i18n/I18nProvider';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { ThemeToggle } from '../src/shared/ui/ThemeToggle';

function renderToggle() {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <ThemeToggle />
      </I18nProvider>
    </ThemeProvider>,
  );
}

describe('theme toggle', () => {
  it('defaults to light and persists a dark selection', async () => {
    renderToggle();
    expect(document.documentElement.dataset.theme).toBe('light');

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    await waitFor(async () => {
      expect((await fakeBrowser.storage.local.get('settings')).settings).toEqual({ theme: 'dark' });
    });
  });

  it('restores the stored theme', async () => {
    await fakeBrowser.storage.local.set({ settings: { theme: 'dark' } });
    renderToggle();
    expect(await screen.findByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
