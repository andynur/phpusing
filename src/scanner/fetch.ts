import { LIMITS } from './budget';

// Fetch wrapper (docs/03_ARCHITECTURE.md). Bodies leave this module only towards src/checks/.

export type ProbeMethod = 'GET' | 'HEAD';

export interface ProbeResponse {
  path: string;
  method: ProbeMethod;
  /** 0 when the request failed, timed out, or was a redirect (opaque with `redirect: manual`). */
  status: number;
  redirected: boolean;
  error?: 'network' | 'timeout';
  /** Allowlisted, lower-case header names. */
  headers: Record<string, string>;
  /** First 64 KB of the body (2 MB for `/composer.lock`), decoded as UTF-8. Never log or store it. */
  bodyText: string;
  /** SHA-256 hex of the bytes read; empty for HEAD and failed requests. */
  bodyHash: string;
  contentType: string;
}

// Only what fingerprint and config checks need. Set-Cookie is never readable by fetch anyway.
const HEADER_ALLOWLIST = [
  'server',
  'x-powered-by',
  'content-type',
  'content-length',
  'location',
  'strict-transport-security',
  'x-content-type-options',
  'content-security-policy',
];

export interface ProbeOptions {
  method?: ProbeMethod;
  signal?: AbortSignal;
  timeoutMs?: number;
  readCapBytes?: number;
  fetchImpl?: typeof fetch;
}

async function readCapped(res: Response, cap: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < cap) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
  } finally {
    // Stop the download as soon as the cap is reached.
    reader.cancel().catch(() => {});
  }
  const out = new Uint8Array(Math.min(size, cap));
  let offset = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, out.length - offset);
    out.set(part, offset);
    offset += part.length;
    if (offset >= out.length) break;
  }
  return out;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function failed(path: string, method: ProbeMethod, error?: 'network' | 'timeout'): ProbeResponse {
  return {
    path,
    method,
    status: 0,
    redirected: false,
    error,
    headers: {},
    bodyText: '',
    bodyHash: '',
    contentType: '',
  };
}

/**
 * GET or HEAD one path on the scanned origin. No credentials, no redirects followed, no payloads.
 * Throws only when `signal` (the scan's cancel signal) aborts.
 */
export async function probe(
  origin: string,
  path: string,
  {
    method = 'GET',
    signal,
    timeoutMs = LIMITS.timeoutMs,
    readCapBytes = LIMITS.readCapBytes,
    fetchImpl = fetch,
  }: ProbeOptions = {},
): Promise<ProbeResponse> {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error(`probe outside origin: ${path}`);
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const res = await fetchImpl(url.href, {
      method,
      credentials: 'omit',
      redirect: 'manual',
      cache: 'no-store',
      signal: combined,
    });
    if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
      res.body?.cancel().catch(() => {});
      return { ...failed(path, method), status: res.status, redirected: true };
    }
    const headers: Record<string, string> = {};
    for (const name of HEADER_ALLOWLIST) {
      const value = res.headers.get(name);
      if (value !== null) headers[name] = value;
    }
    const bytes = method === 'HEAD' ? new Uint8Array() : await readCapped(res, readCapBytes);
    return {
      path,
      method,
      status: res.status,
      redirected: false,
      headers,
      bodyText: new TextDecoder('utf-8').decode(bytes),
      bodyHash: bytes.length ? await sha256Hex(bytes) : '',
      contentType: headers['content-type'] ?? '',
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    return failed(path, method, timeout.aborted ? 'timeout' : 'network');
  }
}
