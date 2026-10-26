# 03 — Architecture

## Stack

| Concern | Choice | Why |
|---|---|---|
| Extension framework | WXT (MV3) | Same as suitelens; Chrome + Firefox from one codebase (D-001) |
| UI | React + Tailwind 4 with CSS-variable tokens | Matches sibling projects; tokens in `DESIGN.md` |
| Language | TypeScript strict | — |
| Tests | Vitest (unit), Playwright (e2e, v0.2+) | — |
| Lint/format | ESLint + Prettier | — |
| Package manager | pnpm | — |

No runtime dependencies beyond React unless a PRD row justifies it. Composer constraint matching is written in-house (small, testable).

## Components

```
popup (React)  ──msg──▶  background service worker  ──fetch──▶  scanned origin
     ▲                        │   │
     │                        │   └─ scripting.executeScript (activeTab) → DOM markers
     │                        ▼
report page (React) ◀── storage.session (scan result, memory only)
                              │
                     advisories (bundled snapshot + optional signed update)
```

- **popup** — start, consent, progress, verdict, top findings. No scan logic.
- **background** — owns the scan: permission check, budget, probes, check execution, result assembly. Validates every message sender is the extension itself.
- **report** — full findings, copy message, settings, data status, (v0.2) composer.lock drop.
- **checks** — pure functions over a normalized response; easy to unit-test with fixtures.

## Permissions (manifest)

| Permission | Why |
|---|---|
| `activeTab` | Read DOM markers on the page the user clicked from |
| `scripting` | Run the one marker-reading function in that tab (added with F-012, not before) |
| `storage` | `local`: language, theme, authorized origins, data version. `session`: scan results |
| `optional_host_permissions: ["https://*/*", "http://*/*"]` | Requested at runtime for one origin only (`origin/*`) |

Forbidden: `<all_urls>` as a static permission, `cookies`, `webRequest`, `tabs`, `history`, `declarativeNetRequest` (D-003).

## Scan pipeline

1. **Preflight:** origin from active tab; check consent flag and host permission; refuse forbidden schemes.
2. **Baseline:** fetch `/` and one random path (`/phpusing-<random>`). Record status, length, body hash, and title for soft-404 detection.
3. **Markers:** `executeScript` runs `readMarkers` (`src/checks/fingerprint.ts`) and returns `{ origin, cookieNames, metaGenerator, assetPaths (same-origin script/link paths, no query), hasCsrfMeta }`. Cookie names only; values are split off in the page. The background re-validates the shape and drops markers from another origin; the scan runs without markers if injection fails.
4. **Fingerprint:** FP checks over baseline + markers.
5. **Probe plan:** select EX/CF checks relevant to the fingerprint (WordPress paths only if WordPress is likely, etc.). Always include generic critical paths. Truncate to remaining budget by severity.
6. **Probe:** fetch wrapper (below), concurrency 3. Stop early on 3 consecutive 403/429 → finding "scan blocked".
7. **Match:** VU checks against advisory data.
8. **Assemble:** findings → verdict (`src/shared/verdict.ts`) → `storage.session` keyed by tab ID + origin.

## Fetch wrapper (`src/scanner/fetch.ts`)

- `credentials: "omit"`, `redirect: "manual"`, `cache: "no-store"`.
- `AbortSignal.timeout(8000)` combined with the scan's cancel signal.
- Read the body with a stream reader; stop at 64 KB. No `Range` header: it adds 206/416 handling and the stream cap already bounds the download.
- Return `{ url, status, headers (allowlisted), bodyText (≤64 KB), bodyHash, contentType }`.
- Never pass bodies outside `src/checks/`; checks return redacted evidence only.

## Messages (`src/shared/messages.ts`)

| Type | From → To | Payload |
|---|---|---|
| `scan/start` | popup → bg | `{ tabId }` |
| `scan/cancel` | popup → bg | `{ tabId }` |
| `scan/progress` | bg → popup | `{ tabId, done, total, phase }` |
| `scan/result` | bg → popup/report | `{ tabId, result: ScanResult }` |
| `scan/error` | bg → popup | `{ tabId, reason }` (cancelled, busy, rate-limited, not-authorized, unsupported, failed) |
| `data/update` | report → bg | — ; replies `{ ok, status: updated \| current, version }` or `{ ok: false, reason: failed }` |

All messages are typed and runtime-validated. `scan/start` replies `{ ok }` or `{ ok: false, reason }`; the background re-runs preflight and never trusts the popup.

## Core types (`src/shared/types.ts`)

```ts
type Severity = "critical" | "high" | "medium" | "low" | "info";
type Confidence = "confirmed" | "likely" | "version-hidden";

interface Finding {
  checkId: string;            // e.g. "EX-01"
  severity: Severity;
  confidence: Confidence;
  titleKey: MessageKey;       // i18n key, typed so missing strings fail typecheck
  impactKey: MessageKey;
  fixKey: MessageKey;
  evidence: string[];         // redacted, e.g. ["GET /.env → 200", "keys: APP_KEY, DB_PASSWORD"]
  refs: { label: string; url: string }[];
  kev?: boolean;
}

interface ScanResult {
  origin: string;
  startedAt: string;
  requestsUsed: number;
  fingerprint: { php?: string; server?: string; framework?: string; cms?: string };
  findings: Finding[];
  verdict: "calm" | "mild" | "major" | "unknown";
  dataVersion: string;
  blocked?: boolean;
}
```

## Storage

| Key | Area | Content |
|---|---|---|
| `settings` | local | `{ lang, theme, autoDataCheck, allowLocalTargets }` |
| `authorizedOrigins` | local | `string[]` |
| `advisoryMeta` | local | `{ version, date, sha256 }` |
| `advisoryData` | local (IndexedDB if > 5 MB) | verified advisory bundle |
| `scan:<tabId>:<origin>` | session | `ScanResult` |

No scan history in `local`. Ever (D-006).

## Directory layout

```
src/
  entrypoints/ background/ (index.ts, scan-service.ts), popup/, report/
  checks/      fingerprint.ts, exposure.ts, config.ts, versions.ts, packages.ts
  scanner/     fetch.ts, budget.ts, baseline.ts, plan.ts, scan.ts
  advisories/  load.ts, verify.ts, update.ts, composer-semver.ts
  shared/      types.ts, messages.ts, verdict.ts, i18n/{en,id}.json, ui/
tools/build-data/   advisory pipeline (Node, not shipped)
data/snapshot/      bundled, signed advisory snapshot (generated)
tests/              unit + fixtures (sanitized)
```
