# Status

Single source of "where are we". Update at the end of every task. Keep it under 40 lines.

- **Current release:** v0.1 (MVP), see `02_ROADMAP.md`
- **Phase:** scaffold done, building v0.1 features
- **Last done:** 2026-10-25, F-012 fingerprint: `src/checks/fingerprint.ts` (FP-01..FP-05, `readMarkers`, `parseMarkers`), `scripting` permission, fingerprint in `ScanResult`; `pnpm check` green, 132 tests
- **Next task:** F-013, exposure checks EX-01..EX-12 in `src/checks/exposure.ts` plus their probes in `buildPlan`

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
- F-012: `buildPlan(fingerprint)` and `analyze(context, fingerprint)` get the fingerprint via a closure in `scan-service.ts`. FP-06 (CodeIgniter) not done: roadmap row says FP-01..FP-05.
- F-011: `buildPlan` and `analyze` (`src/checks/index.ts`) are empty stubs; F-012..F-014 fill them. Verdict is hard-coded `unknown` in `scan-service.ts` until F-021. `dataVersion` is empty until F-020; VerdictCard then shows only the request count. No `Range` header (03_ARCHITECTURE.md). Rate limiter is in memory per service worker.
- F-010: `revoke()` exists, its settings UI lands with the report page (F-022). `allowLocalTargets` setting has no UI yet, so localhost is refused for now. ConsentBox links to the GitHub `WHAT_WE_NEVER_DO.md`. Bundle URL check now skips `*` match patterns.
- Owner of the sibling projects uses WXT (suitelens) and the same doc layout (moodlens). Reuse their configs where it saves work.
- F-002 left for later: `CopyButton` + FindingRow "Copy message" (needs developer-message keys), `ProgressBar` (F-011), `ConsentBox` (F-010). Verdict icon uses a placeholder lens mark until the logo (§7) exists. `Finding.*Key` is now typed `MessageKey` (03_ARCHITECTURE.md updated).
