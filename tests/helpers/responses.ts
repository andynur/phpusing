import type { Baseline } from '../../src/scanner/baseline';
import type { ProbeResponse } from '../../src/scanner/fetch';

// Synthetic ProbeResponse builder for check tests.
export function res(path: string, over: Partial<ProbeResponse> = {}): ProbeResponse {
  const bodyText = over.bodyText ?? '';
  return {
    path,
    method: 'GET',
    status: 200,
    redirected: false,
    headers: {},
    bodyText,
    // Distinct bodies get distinct hashes; good enough for soft-404 comparisons in tests.
    bodyHash: bodyText ? `h:${bodyText.length}:${bodyText.slice(0, 64)}` : '',
    contentType: '',
    ...over,
  };
}

export function baseline(
  over: { root?: Partial<ProbeResponse>; missing?: Partial<ProbeResponse> } = {},
): Baseline {
  return {
    root: res('/', { bodyText: '<title>Home</title><p>hello</p>', ...over.root }),
    missing: res('/phpusing-abc', {
      status: 404,
      bodyText: '<title>Not Found</title>',
      ...over.missing,
    }),
  };
}
