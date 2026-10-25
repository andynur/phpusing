import { browser } from 'wxt/browser';
import { analyze } from '../../checks';
import { fingerprint, parseMarkers, readMarkers } from '../../checks/fingerprint';
import { ScanRateLimiter } from '../../scanner/budget';
import { buildPlan } from '../../scanner/plan';
import { runScan } from '../../scanner/scan';
import { hasHostPermission, isAuthorized } from '../../shared/consent';
import {
  scanKey,
  type Broadcast,
  type Request,
  type ScanErrorReason,
  type StartReply,
} from '../../shared/messages';
import { loadSettings } from '../../shared/settings';
import { checkTarget } from '../../shared/target';
import type { Fingerprint, Markers, ScanResult } from '../../shared/types';
import { computeVerdict } from '../../shared/verdict';

// Owns scans: preflight, one scan per tab, cancel, result storage (docs/03_ARCHITECTURE.md).

export interface ScanServiceDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  slotDelayMs?: number;
}

export function createScanService({
  fetchImpl,
  now = Date.now,
  slotDelayMs,
}: ScanServiceDeps = {}) {
  const running = new Map<number, AbortController>();
  const limiter = new ScanRateLimiter();

  function broadcast(message: Broadcast) {
    // No popup open is normal; the result also lands in storage.session.
    browser.runtime.sendMessage(message).catch(() => {});
  }

  // Preflight runs again here: the popup is never trusted to have checked.
  async function preflight(tabId: number): Promise<{ origin: string } | ScanErrorReason> {
    const tab = await browser.tabs.get(tabId).catch(() => undefined);
    const { allowLocalTargets } = await loadSettings();
    const target = checkTarget(tab?.url, { allowLocalTargets });
    if (!target.ok) return 'unsupported';
    if (!(await isAuthorized(target.origin)) || !(await hasHostPermission(target.origin))) {
      return 'not-authorized';
    }
    return { origin: target.origin };
  }

  // DOM markers (scan pipeline step 3). Optional: a scan still runs if the page refuses.
  async function markersFor(tabId: number, origin: string): Promise<Markers | null> {
    try {
      const [frame] = await browser.scripting.executeScript({
        target: { tabId },
        func: readMarkers,
      });
      return parseMarkers(frame?.result, origin);
    } catch {
      return null;
    }
  }

  async function scan(tabId: number, origin: string, controller: AbortController) {
    const startedAt = new Date(now()).toISOString();
    try {
      const markers = await markersFor(tabId, origin);
      let fp: Fingerprint = {};
      const run = await runScan({
        origin,
        signal: controller.signal,
        plan: (baseline) => {
          fp = fingerprint(baseline, markers);
          return buildPlan(fp);
        },
        analyze: (context) => analyze(context, fp),
        fetchImpl,
        slotDelayMs,
        onProgress: (p) => broadcast({ type: 'scan/progress', tabId, ...p }),
      });
      const result: ScanResult = {
        origin,
        startedAt,
        requestsUsed: run.requestsUsed,
        fingerprint: fp,
        findings: run.findings,
        // phpSupported comes from VU-01 (F-020); until then a scan is never calm.
        verdict: computeVerdict({ findings: run.findings, fingerprint: fp, blocked: run.blocked }),
        dataVersion: '',
        ...(run.blocked ? { blocked: true } : {}),
      };
      await browser.storage.session.set({ [scanKey(tabId, origin)]: result });
      // Toolbar badge (DESIGN.md §7): no badge for calm or mild, to avoid false reassurance.
      const badge = result.verdict === 'major' ? '!' : result.verdict === 'unknown' ? '?' : '';
      browser.action.setBadgeText({ tabId, text: badge }).catch(() => {});
      broadcast({ type: 'scan/result', tabId, result });
    } catch {
      broadcast({
        type: 'scan/error',
        tabId,
        reason: controller.signal.aborted ? 'cancelled' : 'failed',
      });
    } finally {
      if (running.get(tabId) === controller) running.delete(tabId);
    }
  }

  async function start(tabId: number): Promise<StartReply> {
    if (running.has(tabId)) return { ok: false, reason: 'busy' };
    const checked = await preflight(tabId);
    if (typeof checked === 'string') return { ok: false, reason: checked };
    if (running.has(tabId)) return { ok: false, reason: 'busy' };
    if (!limiter.allow(checked.origin, now())) return { ok: false, reason: 'rate-limited' };
    const controller = new AbortController();
    running.set(tabId, controller);
    void scan(tabId, checked.origin, controller);
    return { ok: true };
  }

  function cancel(tabId: number): StartReply {
    running.get(tabId)?.abort();
    return { ok: true };
  }

  return {
    handle(request: Request): Promise<StartReply> | StartReply {
      return request.type === 'scan/start' ? start(request.tabId) : cancel(request.tabId);
    },
    isRunning: (tabId: number) => running.has(tabId),
  };
}
