// Scan target rules (PRD FR-1, FR-4). Pure; no chrome.* calls.

export type TargetCheck =
  { ok: true; origin: string } | { ok: false; reason: 'unsupported' | 'local' };

// Chrome blocks extensions on store pages; a scan there would only confuse.
const BLOCKED_HOSTS = ['chromewebstore.google.com', 'chrome.google.com'];

function isPrivateIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

// URL.hostname keeps IPv6 brackets and normalizes the address to lower-case hex.
function isPrivateIPv6(host: string): boolean {
  if (!host.startsWith('[')) return false;
  const ip = host.slice(1, -1);
  return (
    ip === '::' ||
    ip === '::1' ||
    /^f[cd]/.test(ip) ||
    /^fe[89ab]/.test(ip) ||
    // IPv4-mapped: treated as local, whatever the embedded address.
    ip.startsWith('::ffff:')
  );
}

// Special-use and private-use names that dev setups (Herd, Valet, Docker) point at local hosts.
const LOCAL_SUFFIXES = ['.localhost', '.local', '.test', '.internal', '.home.arpa'];

export function isLocalHost(host: string): boolean {
  return (
    host === 'localhost' ||
    LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix)) ||
    isPrivateIPv4(host) ||
    isPrivateIPv6(host)
  );
}

export function checkTarget(
  url: string | undefined,
  { allowLocalTargets = false }: { allowLocalTargets?: boolean } = {},
): TargetCheck {
  let parsed: URL;
  try {
    parsed = new URL(url ?? '');
  } catch {
    return { ok: false, reason: 'unsupported' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'unsupported' };
  }
  const host = parsed.hostname;
  if (BLOCKED_HOSTS.includes(host)) return { ok: false, reason: 'unsupported' };
  if (!allowLocalTargets && isLocalHost(host)) return { ok: false, reason: 'local' };
  return { ok: true, origin: parsed.origin };
}

// Host permission pattern for exactly one origin (D-003).
export function originPattern(origin: string): string {
  return `${origin}/*`;
}
