import { browser } from 'wxt/browser';
import { originPattern } from './target';

// Storage key `authorizedOrigins` in storage.local (docs/03_ARCHITECTURE.md, PRD FR-2).
const KEY = 'authorizedOrigins';

export async function loadAuthorizedOrigins(): Promise<string[]> {
  const stored = (await browser.storage.local.get(KEY))[KEY];
  return Array.isArray(stored) ? stored.filter((o): o is string => typeof o === 'string') : [];
}

export async function isAuthorized(origin: string): Promise<boolean> {
  return (await loadAuthorizedOrigins()).includes(origin);
}

export async function authorize(origin: string): Promise<void> {
  const origins = await loadAuthorizedOrigins();
  if (!origins.includes(origin)) {
    await browser.storage.local.set({ [KEY]: [...origins, origin] });
  }
}

// Revoking consent also drops the host permission for that origin.
export async function revoke(origin: string): Promise<void> {
  const origins = await loadAuthorizedOrigins();
  await browser.storage.local.set({ [KEY]: origins.filter((o) => o !== origin) });
  await browser.permissions.remove({ origins: [originPattern(origin)] });
}

export async function hasHostPermission(origin: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [originPattern(origin)] });
}

// Must run directly inside the click handler: Chrome needs the user gesture.
export function requestHostPermission(origin: string): Promise<boolean> {
  return browser.permissions.request({ origins: [originPattern(origin)] });
}
