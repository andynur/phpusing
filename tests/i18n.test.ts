import { describe, expect, it } from 'vitest';
import en from '../src/shared/i18n/en.json';
import id from '../src/shared/i18n/id.json';
import { detectLang, translate } from '../src/shared/i18n';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('catalog parity (docs/07_I18N.md)', () => {
  const enKeys = Object.keys(en).sort();
  const idKeys = Object.keys(id).sort();

  it('id.json has exactly the keys of en.json', () => {
    expect(idKeys).toEqual(enKeys);
  });

  it.each(enKeys)('%s is non-empty with matching placeholders', (key) => {
    const enText = en[key as keyof typeof en];
    const idText = (id as Record<string, string>)[key] ?? '';
    expect(enText.trim()).not.toBe('');
    expect(idText.trim()).not.toBe('');
    expect(placeholders(idText)).toEqual(placeholders(enText));
  });
});

describe('translate', () => {
  it('returns the string for the chosen language', () => {
    expect(translate('en', 'popup.loading')).toBe('Checking for headaches…');
    expect(translate('id', 'popup.loading')).toBe('Mencari sumber pusing…');
  });
});

describe('detectLang', () => {
  it.each([
    ['id', 'id'],
    ['id-ID', 'id'],
    ['en-US', 'en'],
    ['ms-MY', 'en'],
    [undefined, 'en'],
  ] as const)('%s -> %s', (input, expected) => {
    expect(detectLang(input)).toBe(expected);
  });
});
