import type { Finding, Severity } from '../shared/types';
import type { ScanPhase } from '../shared/messages';
import { randomPath, type Baseline } from './baseline';
import { BlockTracker, Budget, LIMITS } from './budget';
import { probe, type ProbeMethod, type ProbeOptions, type ProbeResponse } from './fetch';

// Scan runner: baseline, probe plan, bounded probing, analysis. No chrome.* calls here.

export interface ProbeSpec {
  path: string;
  method?: ProbeMethod;
  /** Highest severity the probe can reveal; used to trim the plan to the budget. */
  severity: Severity;
}

export interface ScanContext {
  origin: string;
  baseline: Baseline;
  /** Probe responses keyed by path. */
  responses: Map<string, ProbeResponse>;
}

export interface ScanProgress {
  done: number;
  total: number;
  phase: ScanPhase;
}

export interface ScanRun {
  requestsUsed: number;
  blocked: boolean;
  context: ScanContext;
  findings: Finding[];
}

export interface RunScanOptions {
  origin: string;
  signal: AbortSignal;
  plan: (baseline: Baseline) => ProbeSpec[];
  analyze: (context: ScanContext) => Finding[];
  onProgress?: (progress: ScanProgress) => void;
  fetchImpl?: ProbeOptions['fetchImpl'];
  slotDelayMs?: number;
  random?: () => number;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

// Budget order when trimming: critical first, then high, medium, low (04_CHECKS.md).
export function trimPlan(plan: ProbeSpec[], remaining: number): ProbeSpec[] {
  const seen = new Set<string>();
  const unique = plan.filter((p) => !seen.has(p.path) && seen.add(p.path));
  return unique
    .map((p, i) => ({ p, i }))
    .sort((a, b) => SEVERITY_RANK[a.p.severity] - SEVERITY_RANK[b.p.severity] || a.i - b.i)
    .slice(0, Math.max(0, remaining))
    .map(({ p }) => p);
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/** Runs one scan. Rejects with the abort reason when `signal` aborts (user cancel). */
export async function runScan({
  origin,
  signal,
  plan,
  analyze,
  onProgress,
  fetchImpl,
  slotDelayMs = LIMITS.slotDelayMs,
  random,
}: RunScanOptions): Promise<ScanRun> {
  const budget = new Budget();
  const block = new BlockTracker();
  let blocked = false;
  // Stops the remaining probes when the scan is blocked; user cancel still flows through `signal`.
  const stop = new AbortController();
  const probeSignal = AbortSignal.any([signal, stop.signal]);

  const get = async (path: string, method: ProbeMethod = 'GET') => {
    budget.take();
    const res = await probe(origin, path, { method, signal, fetchImpl });
    if (block.record(res.status)) {
      blocked = true;
      stop.abort();
    }
    return res;
  };

  onProgress?.({ done: 0, total: 2, phase: 'baseline' });
  const root = await get('/');
  const missing = await get(randomPath(random));
  const baseline: Baseline = { root, missing };
  const responses = new Map<string, ProbeResponse>();

  const queue = blocked ? [] : trimPlan(plan(baseline), budget.remaining);
  const total = 2 + queue.length;
  let done = 2;
  onProgress?.({ done, total, phase: 'probe' });

  let next = 0;
  const slot = async (first: boolean) => {
    while (next < queue.length && !probeSignal.aborted) {
      const spec = queue[next++];
      if (!spec) return;
      if (!first) await wait(slotDelayMs, probeSignal);
      first = false;
      if (budget.remaining <= 0) return;
      responses.set(spec.path, await get(spec.path, spec.method));
      onProgress?.({ done: ++done, total, phase: 'probe' });
    }
  };
  const slots = await Promise.allSettled(
    Array.from({ length: LIMITS.concurrency }, () => slot(true)),
  );
  signal.throwIfAborted();
  for (const s of slots) {
    // A stopped slot rejects with the block abort; anything else is a real error.
    if (s.status === 'rejected' && !stop.signal.aborted) throw s.reason;
  }

  onProgress?.({ done, total, phase: 'analyze' });
  const context: ScanContext = { origin, baseline, responses };
  return { requestsUsed: budget.used, blocked, context, findings: analyze(context) };
}
