# Status

Single source of "where are we". Update at the end of every task. Keep it under 40 lines.

- **Current release:** v0.1 (MVP), see `02_ROADMAP.md`
- **Phase:** scaffold done, building v0.1 features
- **Last done:** 2026-10-25, F-021 verdict: `computeVerdict` in `src/shared/verdict.ts` (04_CHECKS.md mapping), toolbar badge in `scan-service.ts`; `pnpm check` green
- **Next task:** F-020, PHP core version check VU-01 (PHP2Shell + EOL) with bundled data; resolve Q-2 first (verify CVE IDs and fixed versions on php.net, else mark unverified). VU-01 must pass `phpSupported` to `computeVerdict`. Then F-022 report page, F-090 store listing

## Blockers and open questions

| ID | Question | Owner | Needed by |
|---|---|---|---|
| Q-1 | License: MIT proposed. Confirm. | Andy | v0.1 publish |
| Q-2 | Verify PHP2Shell CVE IDs and fixed versions on php.net (secondary source said CVE-2026-109618/109619; fixed 8.5.12, 8.4.27, 8.3.36, 8.2.35; 8.1 and older unfixed). | agent | F-020 |
| Q-3 | Wordfence Intelligence data license allows bundling in an open-source extension? | Andy | v0.3 |
| Q-4 | Register `phpusing.dev` and GitHub org `phpusing` (both free on 2026-10-25). | Andy | v0.1 publish |
| Q-5 | Advisory data host: GitHub Releases vs GitHub Pages. | agent | F-030 |

## Notes for the next session

- pnpm comes from corepack (`corepack enable pnpm`). Tokens are Tailwind utilities: `bg-canvas`, `text-fg-muted`, `bg-sev-critical-bg text-sev-critical`; the default palette is removed, so `bg-red-500` does not compile.
- Manifest: `storage`, `activeTab`, `scripting`, `optional_host_permissions`.
- F-021: `calm` needs `phpSupported: true`, which nothing sets until F-020, so scans are never calm yet (safe default).
- F-014: CF-02 deviates from the catalog's https probe (see 04_CHECKS.md row). `analyze` ignores the fingerprint so far; VU-01 will use `fingerprint.php`.
- F-013: `PathCheck` + `runPathChecks` in `exposure.ts` are reusable for CF-04. Fixtures are excluded from Prettier (raw bytes matter). All 26 paths are always planned; budget trims by severity.
- F-012: `buildPlan(fingerprint)` and `analyze(context, fingerprint)` get the fingerprint via a closure in `scan-service.ts`. FP-06 (CodeIgniter) not done: roadmap row says FP-01..FP-05.
- F-011: `buildPlan` and `analyze` (`src/checks/index.ts`) are empty stubs; F-012..F-014 fill them. `dataVersion` is empty until F-020; VerdictCard then shows only the request count. No `Range` header (03_ARCHITECTURE.md). Rate limiter is in memory per service worker.
- F-010: `revoke()` exists, its settings UI lands with the report page (F-022). `allowLocalTargets` setting has no UI yet, so localhost is refused for now. ConsentBox links to the GitHub `WHAT_WE_NEVER_DO.md`. Bundle URL check now skips `*` match patterns.
- Owner of the sibling projects uses WXT (suitelens) and the same doc layout (moodlens). Reuse their configs where it saves work.
- F-002 left for later: `CopyButton` + FindingRow "Copy message" (needs developer-message keys), `ProgressBar` (F-011), `ConsentBox` (F-010). Verdict icon uses a placeholder lens mark until the logo (§7) exists. `Finding.*Key` is now typed `MessageKey` (03_ARCHITECTURE.md updated).
