// Mocked fetch for scanner tests: a synthetic site described as path -> response.

export interface FakeRoute {
  status?: number;
  body?: string;
  headers?: Record<string, string>;
  delayMs?: number;
}

export type FakeSite = (path: string) => FakeRoute | undefined;

export function fakeFetch(site: FakeSite, log: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    log.push(`${init?.method ?? 'GET'} ${url.pathname}`);
    const route = site(url.pathname) ?? { status: 404, body: '<title>Not found</title>' };
    if (route.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, route.delayMs);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(init.signal?.reason);
        });
      });
    }
    return new Response(init?.method === 'HEAD' ? null : (route.body ?? ''), {
      status: route.status ?? 200,
      headers: route.headers,
    });
  }) as typeof fetch;
}
