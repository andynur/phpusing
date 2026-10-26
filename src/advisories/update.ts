import { browser } from 'wxt/browser';
import { DATA_BASE_URL } from './config';
import { dataDate, loadAdvisories, type AdvisoryData } from './load';
import { compareVersions, parseAdvisoryData, verifySignature } from './verify';

// Signed advisory data update (docs/05_ADVISORY_DATA.md, "In-extension use"). The whole file
// is downloaded, never per-package parts, so the host learns nothing about the user's stack.

const DATA_KEY = 'advisoryData';
const META_KEY = 'advisoryMeta';
/** Whole-file download cap; the bundle was 1.3 MB on 2026-10-26. */
export const DATA_MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
/** PRD FR-17: a scan checks for newer data once ours is older than this. */
export const AUTO_CHECK_AGE_DAYS = 7;
/** At most one automatic check per this interval, however many scans run. */
const AUTO_CHECK_INTERVAL_MS = 6 * 3_600_000;

export interface AdvisoryMeta {
  version: string;
  date: string;
  sha256: string;
  checkedAt: number;
}

export type UpdateOutcome =
  { ok: true; status: 'updated' | 'current'; version: string } | { ok: false; reason: 'failed' };

/** Verified downloaded data when it is newer than the bundled snapshot, else the snapshot. */
export async function currentAdvisories(): Promise<AdvisoryData> {
  const snapshot = loadAdvisories();
  const stored = parseAdvisoryData((await browser.storage.local.get(DATA_KEY))[DATA_KEY]);
  return stored && compareVersions(stored.version, snapshot.version) > 0 ? stored : snapshot;
}

async function loadMeta(): Promise<Partial<AdvisoryMeta>> {
  const meta = (await browser.storage.local.get(META_KEY))[META_KEY];
  return typeof meta === 'object' && meta !== null ? meta : {};
}

async function download(
  file: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetchImpl(new URL(file, DATA_BASE_URL), {
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    signal,
  });
  if (!response.ok || !response.body) throw new Error(`data: HTTP ${response.status}`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > DATA_MAX_BYTES) {
      await reader.cancel();
      throw new Error('data: too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface UpdateDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  publicKey?: string;
}

/**
 * Downloads and verifies the data. On any failure the old data stays. Data that is not newer
 * than what we have is ignored, so a replayed old signed file cannot roll the data back.
 */
async function runUpdate({
  fetchImpl = fetch,
  now = Date.now,
  publicKey,
}: UpdateDeps): Promise<UpdateOutcome> {
  const current = await currentAdvisories();
  const decoder = new TextDecoder();
  try {
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    // meta.json is an unsigned hint: it can only make us skip the download, never accept data.
    const hint = JSON.parse(decoder.decode(await download('meta.json', fetchImpl, signal))) as {
      version?: unknown;
    };
    const meta = await loadMeta();
    if (typeof hint.version === 'string' && compareVersions(hint.version, current.version) <= 0) {
      await browser.storage.local.set({ [META_KEY]: { ...meta, checkedAt: now() } });
      return { ok: true, status: 'current', version: current.version };
    }
    const [body, signature] = await Promise.all([
      download('advisories.json', fetchImpl, signal),
      download('advisories.json.sig', fetchImpl, signal),
    ]);
    if (!(await verifySignature(body, decoder.decode(signature), publicKey))) {
      return { ok: false, reason: 'failed' };
    }
    const data = parseAdvisoryData(JSON.parse(decoder.decode(body)));
    if (!data) return { ok: false, reason: 'failed' };
    if (compareVersions(data.version, current.version) <= 0) {
      await browser.storage.local.set({ [META_KEY]: { ...meta, checkedAt: now() } });
      return { ok: true, status: 'current', version: current.version };
    }
    const next: AdvisoryMeta = {
      version: data.version,
      date: dataDate(data.version),
      sha256: await sha256(body),
      checkedAt: now(),
    };
    await browser.storage.local.set({ [DATA_KEY]: data, [META_KEY]: next });
    return { ok: true, status: 'updated', version: data.version };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

let inflight: Promise<UpdateOutcome> | null = null;

/** "Update now" and the automatic check share one download at a time. */
export function updateAdvisories(deps: UpdateDeps = {}): Promise<UpdateOutcome> {
  inflight ??= runUpdate(deps).finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Data for a scan, checking the host first when ours is old and the user allows it. */
export async function advisoriesForScan(
  autoCheck: boolean,
  deps: UpdateDeps = {},
): Promise<AdvisoryData> {
  const now = deps.now ?? Date.now;
  const current = await currentAdvisories();
  const age = now() - Date.parse(dataDate(current.version));
  const meta = await loadMeta();
  const checkedAt = typeof meta.checkedAt === 'number' ? meta.checkedAt : 0;
  if (
    autoCheck &&
    !(age <= AUTO_CHECK_AGE_DAYS * 86_400_000) &&
    now() - checkedAt >= AUTO_CHECK_INTERVAL_MS
  ) {
    // Recorded before the request, so a failing host is not asked again on every scan.
    await browser.storage.local.set({ [META_KEY]: { ...meta, checkedAt: now() } });
    const outcome = await updateAdvisories(deps);
    if (outcome.ok && outcome.status === 'updated') return currentAdvisories();
  }
  return current;
}
