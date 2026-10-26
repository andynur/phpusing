import { describe, expect, it } from 'vitest';
import { checkTarget, isLocalHost, originPattern } from '../src/shared/target';

describe('checkTarget', () => {
  it('returns the origin for http and https pages', () => {
    expect(checkTarget('https://shop.example.com/cart?x=1#top')).toEqual({
      ok: true,
      origin: 'https://shop.example.com',
    });
    expect(checkTarget('http://example.com:8080/a')).toEqual({
      ok: true,
      origin: 'http://example.com:8080',
    });
  });

  it.each([
    undefined,
    '',
    'not a url',
    'chrome://extensions',
    'chrome-extension://abc/popup.html',
    'file:///etc/passwd',
    'about:blank',
    'ftp://example.com/',
    'https://chromewebstore.google.com/detail/x',
  ])('refuses %s as unsupported', (url) => {
    expect(checkTarget(url)).toEqual({ ok: false, reason: 'unsupported' });
  });

  it.each([
    'http://localhost:3000/',
    'http://app.localhost/',
    'http://printer.local/',
    'http://esetda-new.test/login',
    'http://api.internal/',
    'http://nas.home.arpa/',
    'http://127.0.0.1/',
    'http://10.1.2.3/',
    'http://172.20.0.1/',
    'http://192.168.1.10/',
    'http://169.254.169.254/',
    'http://[::1]/',
    'http://[fd00::1]/',
    'http://[fe80::1]/',
    'http://[::ffff:127.0.0.1]/',
  ])('refuses local target %s unless allowed', (url) => {
    expect(checkTarget(url)).toEqual({ ok: false, reason: 'local' });
    expect(checkTarget(url, { allowLocalTargets: true }).ok).toBe(true);
  });

  it('keeps public IP literals and look-alike hosts', () => {
    expect(isLocalHost('8.8.8.8')).toBe(false);
    expect(isLocalHost('172.32.0.1')).toBe(false);
    expect(isLocalHost('localhost.example.com')).toBe(false);
    expect(isLocalHost('test.example.com')).toBe(false);
    expect(isLocalHost('latest')).toBe(false);
    expect(isLocalHost('[2001:db8::1]')).toBe(false);
  });

  it('builds a single-origin permission pattern', () => {
    expect(originPattern('https://example.com')).toBe('https://example.com/*');
  });
});
