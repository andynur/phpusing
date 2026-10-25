import en from './en.json';
import id from './id.json';

// en.json is the source of truth; tests/i18n.test.ts keeps id.json in parity.
export type MessageKey = keyof typeof en;
export type Lang = 'en' | 'id';
export type Vars = Record<string, string | number>;

export const LANGS: readonly Lang[] = ['en', 'id'];

const catalogs: Record<Lang, Record<MessageKey, string>> = { en, id };

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const template = catalogs[lang][key] ?? catalogs.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function detectLang(browserLang: string | undefined): Lang {
  return browserLang?.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'id';
}
