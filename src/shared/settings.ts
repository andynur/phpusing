import { browser } from 'wxt/browser';
import { isLang, type Lang } from './i18n';

// Storage key `settings` in storage.local (docs/03_ARCHITECTURE.md).
export interface Settings {
  lang?: Lang;
  // PRD FR-4: localhost and private ranges are refused unless the user opts in.
  allowLocalTargets?: boolean;
}

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  const stored = (await browser.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
  return {
    lang: isLang(stored?.lang) ? stored.lang : undefined,
    allowLocalTargets: stored?.allowLocalTargets === true ? true : undefined,
  };
}

export async function saveSettings(patch: Settings): Promise<void> {
  const current = await loadSettings();
  await browser.storage.local.set({ [KEY]: { ...current, ...patch } });
}
