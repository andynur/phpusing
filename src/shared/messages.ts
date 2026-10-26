import type { ScanResult } from './types';

// Typed, runtime-validated messages (docs/03_ARCHITECTURE.md, "Messages").

export type ScanErrorReason =
  'unsupported' | 'not-authorized' | 'rate-limited' | 'busy' | 'cancelled' | 'failed';

export type ScanPhase = 'baseline' | 'probe' | 'analyze';

export type ScanRequest =
  { type: 'scan/start'; tabId: number } | { type: 'scan/cancel'; tabId: number };

export type Request = ScanRequest | { type: 'data/update' };

export type StartReply = { ok: true } | { ok: false; reason: ScanErrorReason };

/** `data/update` reply: the background downloads, verifies and stores the data. */
export type DataReply =
  { ok: true; status: 'updated' | 'current'; version: string } | { ok: false; reason: 'failed' };

export type Reply = StartReply | DataReply;

export type Broadcast =
  | { type: 'scan/progress'; tabId: number; done: number; total: number; phase: ScanPhase }
  | { type: 'scan/result'; tabId: number; result: ScanResult }
  | { type: 'scan/error'; tabId: number; reason: ScanErrorReason };

const isTabId = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function parseRequest(value: unknown): Request | null {
  if (isRecord(value) && value.type === 'data/update') return { type: value.type };
  if (!isRecord(value) || !isTabId(value.tabId)) return null;
  if (value.type === 'scan/start' || value.type === 'scan/cancel') {
    return { type: value.type, tabId: value.tabId };
  }
  return null;
}

const REASONS: readonly ScanErrorReason[] = [
  'unsupported',
  'not-authorized',
  'rate-limited',
  'busy',
  'cancelled',
  'failed',
];
const PHASES: readonly ScanPhase[] = ['baseline', 'probe', 'analyze'];

export function parseBroadcast(value: unknown): Broadcast | null {
  if (!isRecord(value) || !isTabId(value.tabId)) return null;
  const { type, tabId } = value;
  if (
    type === 'scan/progress' &&
    Number.isInteger(value.done) &&
    Number.isInteger(value.total) &&
    PHASES.includes(value.phase as ScanPhase)
  ) {
    return {
      type,
      tabId,
      done: value.done as number,
      total: value.total as number,
      phase: value.phase as ScanPhase,
    };
  }
  if (type === 'scan/result' && isRecord(value.result) && typeof value.result.origin === 'string') {
    return { type, tabId, result: value.result as unknown as ScanResult };
  }
  if (type === 'scan/error' && REASONS.includes(value.reason as ScanErrorReason)) {
    return { type, tabId, reason: value.reason as ScanErrorReason };
  }
  return null;
}

// Only our own extension pages may talk to the background (no content scripts exist). The URL
// decides, not `sender.tab`: the report page runs in a tab, and code in a web page reports the
// page URL.
export function isTrustedSender(
  sender: { id?: string; url?: string; tab?: unknown },
  runtimeId: string,
  extensionOrigin: string,
): boolean {
  return sender.id === runtimeId && (sender.url ?? '').startsWith(extensionOrigin);
}

// storage.session key for one tab's result (docs/03_ARCHITECTURE.md, "Storage").
export function scanKey(tabId: number, origin: string): string {
  return `scan:${tabId}:${origin}`;
}
