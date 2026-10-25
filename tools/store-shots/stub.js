// Screenshot harness only: fakes the extension APIs with fixed synthetic data.
(() => {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  const lang = q.get('lang') || 'en';
  const SITE = 'https://shop.example.com';
  const f = (checkId, severity, confidence, key, evidence, refs = []) => ({
    checkId,
    severity,
    confidence,
    titleKey: `check.${key}.title`,
    impactKey: `check.${key}.impact`,
    fixKey: `check.${key}.fix`,
    evidence,
    refs,
  });
  const result = {
    origin: SITE,
    startedAt: '2026-10-25T10:00:00.000Z',
    requestsUsed: 32,
    fingerprint: { phpDetected: true, php: '8.3.30', framework: 'laravel' },
    findings: [
      f('EX-01', 'critical', 'confirmed', 'EX-01', [
        'GET /.env → 200',
        'keys: APP_KEY, DB_PASSWORD, MAIL_PASSWORD, APP_NAME, APP_ENV, DB_HOST',
      ]),
      f(
        'VU-01',
        'critical',
        'likely',
        'VU-01',
        ['X-Powered-By: PHP/8.3.30', 'fixed in 8.3.36'],
        [
          { label: 'CVE-2026-109618', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-109618' },
          { label: 'CVE-2026-109619', url: 'https://nvd.nist.gov/vuln/detail/CVE-2026-109619' },
        ],
      ),
      f('CF-04', 'high', 'confirmed', 'CF-04', ['GET /storage/ → 200', 'marker: Index of /']),
      f('EX-05', 'medium', 'confirmed', 'EX-05', ['GET /composer.json → 200', 'marker: require']),
    ],
    verdict: 'major',
    dataVersion: '2026-10-25.1',
  };
  const local = {
    settings: { lang },
    authorizedOrigins: shot === '1' ? [] : [SITE, 'https://blog.example.org'],
  };
  const session =
    shot === '3' || shot === '4' || shot === '5' ? { [`scan:7:${SITE}`]: result } : {};
  const area = (data) => ({
    get: async (k) =>
      k == null
        ? { ...data }
        : typeof k === 'string'
          ? k in data
            ? { [k]: data[k] }
            : {}
          : Object.fromEntries(
              (Array.isArray(k) ? k : Object.keys(k))
                .filter((x) => x in data)
                .map((x) => [x, data[x]]),
            ),
    set: async (o) => Object.assign(data, o),
    remove: async () => {},
    onChanged: { addListener() {}, removeListener() {} },
  });
  const listeners = [];
  globalThis.chrome = {
    runtime: {
      id: 'phpusing-shots',
      getURL: (p) => p,
      sendMessage: async () => ({ ok: true }),
      onMessage: {
        addListener: (l) => listeners.push(l),
        removeListener() {},
        hasListener: () => false,
      },
      getManifest: () => ({ manifest_version: 3 }),
    },
    tabs: { query: async () => [{ id: 7, url: `${SITE}/` }], create: async () => ({}) },
    storage: {
      local: area(local),
      session: area(session),
      onChanged: { addListener() {}, removeListener() {} },
    },
    permissions: {
      contains: async () => shot !== '1',
      request: async () => true,
      remove: async () => true,
    },
    i18n: { getMessage: () => '' },
  };
  if (shot === '2') {
    setTimeout(
      () =>
        listeners.forEach((l) =>
          l({ type: 'scan/progress', tabId: 7, done: 14, total: 32, phase: 'probe' }, {}, () => {}),
        ),
      600,
    );
  }
  if (shot === '4') setTimeout(() => document.querySelector('button[aria-expanded]')?.click(), 800);
  if (shot === '5') setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 800);
  document.documentElement.dataset.theme = 'light';
  if (location.pathname.includes('popup')) {
    const s = document.createElement('style');
    s.textContent =
      'html,body{background:#ece9f6 !important}body{display:flex;justify-content:center;padding-top:32px}#root{box-shadow:0 8px 32px rgba(40,20,80,.18);border-radius:8px;overflow:hidden}';
    document.head.append(s);
  }
})();
