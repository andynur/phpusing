import { browser } from 'wxt/browser';
import { isLang, type Lang } from './i18n';

// Storage key `settings` in storage.local (docs/03_ARCHITECTURE.md).
export type Theme = 'light' | 'dark';

export interface Settings {
  lang?: Lang;
  theme?: Theme;
  // PRD FR-4: localhost and private ranges are refused unless the user opts in.
  allowLocalTargets?: boolean;
  // PRD FR-17: check for newer advisory data on scan; on unless the user turns it off.
  autoDataCheck?: boolean;
}

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  const stored = (await browser.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
  return {
    lang: isLang(stored?.lang) ? stored.lang : undefined,
    theme: isTheme(stored?.theme) ? stored.theme : undefined,
    allowLocalTargets: stored?.allowLocalTargets === true ? true : undefined,
    autoDataCheck: stored?.autoDataCheck === false ? false : undefined,
  };
}

export async function saveSettings(patch: Settings): Promise<void> {
  const current = await loadSettings();
  await browser.storage.local.set({ [KEY]: { ...current, ...patch } });
}

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}
