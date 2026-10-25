import { describe, expect, it } from 'vitest';
import {
  fingerprint,
  parseMarkers,
  phpFromHeader,
  readMarkers,
} from '../../src/checks/fingerprint';
import type { Markers } from '../../src/shared/types';
import { baseline } from '../helpers/responses';

const ORIGIN = 'https://shop.example.com';

function markers(over: Partial<Markers> = {}): Markers {
  return {
    origin: ORIGIN,
    cookieNames: [],
    metaGenerator: '',
    assetPaths: [],
    hasCsrfMeta: false,
    ...over,
  };
}

describe('FP-01 PHP version', () => {
  it('reads upstream and distro-suffixed versions', () => {
    expect(phpFromHeader('PHP/8.3.1')).toBe('8.3.1');
    expect(phpFromHeader('PHP/8.1.2-1ubuntu2.14')).toBe('8.1.2-1ubuntu2.14');
    expect(phpFromHeader('ASP.NET')).toBeUndefined();
    expect(phpFromHeader(undefined)).toBeUndefined();
  });

  it('sets php and phpDetected from the baseline header', () => {
    const fp = fingerprint(baseline({ root: { headers: { 'x-powered-by': 'PHP/8.2.10' } } }), null);
    expect(fp).toMatchObject({ php: '8.2.10', phpDetected: true });
  });

  it('detects nothing on a plain static site', () => {
    expect(fingerprint(baseline(), markers())).toEqual({});
  });
});

describe('FP-02 server', () => {
  it('records the server banner only', () => {
    const fp = fingerprint(baseline({ root: { headers: { server: 'nginx/1.24.0' } } }), null);
    expect(fp).toEqual({ server: 'nginx/1.24.0' });
  });
});

describe('FP-03 Laravel', () => {
  it('matches XSRF-TOKEN or *_session cookie names', () => {
    expect(fingerprint(baseline(), markers({ cookieNames: ['XSRF-TOKEN'] })).framework).toBe(
      'laravel',
    );
    expect(fingerprint(baseline(), markers({ cookieNames: ['shop_session'] })).framework).toBe(
      'laravel',
    );
  });

  it('does not treat a lone csrf-token meta (Rails) as Laravel', () => {
    expect(fingerprint(baseline(), markers({ hasCsrfMeta: true })).framework).toBeUndefined();
    expect(
      fingerprint(baseline(), markers({ hasCsrfMeta: true, cookieNames: ['PHPSESSID'] })).framework,
    ).toBe('laravel');
  });
});

describe('FP-04 WordPress', () => {
  it('reads the generator version from markers', () => {
    const fp = fingerprint(baseline(), markers({ metaGenerator: 'WordPress 6.6.2' }));
    expect(fp).toMatchObject({ cms: 'wordpress', cmsVersion: '6.6.2', phpDetected: true });
  });

  it('falls back to the home page HTML when markers are missing', () => {
    const html =
      '<meta name="generator" content="WordPress 6.5" /><link href="/wp-content/themes/x.css">';
    const fp = fingerprint(baseline({ root: { bodyText: html } }), null);
    expect(fp).toMatchObject({ cms: 'wordpress', cmsVersion: '6.5' });
  });

  it('detects wp-content assets without a generator', () => {
    const fp = fingerprint(baseline(), markers({ assetPaths: ['/wp-content/plugins/a/b.js'] }));
    expect(fp.cms).toBe('wordpress');
    expect(fp.cmsVersion).toBeUndefined();
  });

  it('ignores other generators', () => {
    expect(fingerprint(baseline(), markers({ metaGenerator: 'Hugo 0.120' })).cms).toBeUndefined();
  });
});

describe('FP-05 Livewire', () => {
  it('matches livewire.js and livewire.min.js', () => {
    expect(
      fingerprint(baseline(), markers({ assetPaths: ['/livewire/livewire.min.js'] })).livewire,
    ).toBe(true);
    expect(
      fingerprint(baseline(), markers({ assetPaths: ['/js/app.js'] })).livewire,
    ).toBeUndefined();
  });
});

describe('markers', () => {
  it('reads cookie names only, never values', () => {
    document.cookie = 'XSRF-TOKEN=secret-value-123';
    const add = (tag: string, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      document.head.append(el);
    };
    add('meta', { name: 'generator', content: 'WordPress 6.6' });
    add('meta', { name: 'csrf-token', content: 'tok' });
    add('link', { rel: 'stylesheet', href: '/wp-content/a.css?ver=1' });
    add('link', { href: 'https://cdn.example/x.css' });
    const m = readMarkers();
    expect(m.cookieNames).toEqual(['XSRF-TOKEN']);
    expect(JSON.stringify(m)).not.toContain('secret-value-123');
    expect(m).toMatchObject({
      metaGenerator: 'WordPress 6.6',
      hasCsrfMeta: true,
      assetPaths: ['/wp-content/a.css'],
    });
  });

  it('rejects markers from another origin or with a bad shape', () => {
    expect(parseMarkers(markers({ origin: 'https://evil.example' }), ORIGIN)).toBeNull();
    expect(parseMarkers('nope', ORIGIN)).toBeNull();
    expect(parseMarkers({ origin: ORIGIN, cookieNames: [1, 'a'] }, ORIGIN)).toEqual(
      markers({ cookieNames: ['a'] }),
    );
  });
});
