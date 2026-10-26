# Status

Single source of "where are we". Update at the end of every task. Keep it under 40 lines.

- **Current release:** v0.2 (Composer depth), see `02_ROADMAP.md`. v0.1.0 tagged 2026-10-26
- **Phase:** building v0.2; v0.1.0 Chrome Web Store upload deferred to the end (owner)
- **Last done:** 2026-10-26, F-035 Markdown report export (`src/shared/markdown-report.ts`, Download button on the report page). `pnpm check` green. Before: F-034 CISA KEV flag (`7490757`); F-033 composer.lock check (`770dd5c`); D-015; F-032; F-031 (not tried against the live Pages host from a real Chrome yet); v0.1.0 tagged (`cc506e1`). Nothing pushed.
- **Next task:** v0.2 F-036 owner-entered PHP version when VU-01 is hidden (FR-19, D-013). Owner: push, then run the advisory-data workflow so the live bundle gets `kev`; manual Update now on the live host in Chrome 137+; try the composer.lock check with a real project lock. Chrome Web Store upload last (owner).

## Blockers and open questions

| ID | Question | Owner | Needed by |
|---|---|---|---|
| Q-3 | Wordfence Intelligence data license allows bundling in an open-source extension? | Andy | v0.3 |
| Q-4 | Register `phpusing.dev` and GitHub org `phpusing` (both free on 2026-10-25). Deferred: v0.1 links use `github.com/andynur/phpusing`. | Andy | landing page |

## Notes for the next session

- F-031: `vitest.setup.ts` stubs global `fetch` to reject, so code must take an injected fetch (`dataFetchImpl` in scan service).
- F-032: bundled snapshot still has `packages: {}`, so VU-02 finds nothing until data is downloaded (Update now, or auto-check after 7 days). Copying the live bundle into the snapshot at release adds 1.3 MB and many advisory URL literals, which `tools/check-bundle-urls.mjs` will reject unless data URLs are exempted. D-015 (owner-approved): `/composer.lock` is read up to 2 MB; larger locks are audited in part. Constraint matching not yet compared with `composer audit`. F-033: the lock check says "no package advisory data yet" until data is downloaded; its results are not part of the scan verdict. F-034: snapshot `kev` is empty; the live bundle on 2026-10-26.4 predates `kev` and reads as an empty list until the workflow runs again.
- Product handoff before H-002: F-020 VU-01: `src/checks/versions.ts`, `src/advisories/load.ts`, `data/snapshot/advisories.json` (hand-curated, sources inside); verdict can now be calm; `pnpm check` green

- README states v0.1 only: Composer package matching and signed advisory updates remain v0.2; it does not claim publication before the Chrome Web Store release.
- F-090: upload assets and reproduction steps in `docs/marketing/README.md`; raw screenshots preserved. Synthetic UI captures do not replace manual real-site checks. Review packaged 128 px icon padding before publishing.

- pnpm comes from corepack (`corepack enable pnpm`). Tokens are Tailwind utilities: `bg-canvas`, `text-fg-muted`, `bg-sev-critical-bg text-sev-critical`; the default palette is removed, so `bg-red-500` does not compile.
- Manifest: `storage`, `activeTab`, `scripting`, `optional_host_permissions`.
- F-020: Q-2 resolved on php.net (CVE-2026-109618/109619; fixed 8.5.12, 8.4.27, 8.3.36, 8.2.35; 8.1 and older no upstream release, treated as affected). Unverified single-vendor claim (Abstract Security) that patched 8.2.35 is still exploitable: not reflected in data. KEV flag not set: no CISA KEV entry verified. Refresh `advisories.json` by hand until F-030.
- F-022: manual light/dark override (FR-16) is done. Data "Update now" (FR-17) done in F-031. Report reads `scan:<tab>:<origin>` from `storage.session` via `?tab=&origin=`.
- F-021: `calm` needs `phpSupported: true` from VU-01.
- F-014: CF-02 deviates from the catalog's https probe (see 04_CHECKS.md row). `analyze` ignores the fingerprint so far; VU-01 will use `fingerprint.php`.
- F-013: `PathCheck` + `runPathChecks` in `exposure.ts` are reusable for CF-04. Fixtures are excluded from Prettier (raw bytes matter). All 26 paths are always planned; budget trims by severity.
- F-012: `buildPlan(fingerprint)` and `analyze(context, fingerprint)` get the fingerprint via a closure in `scan-service.ts`. FP-06 (CodeIgniter) not done: roadmap row says FP-01..FP-05.
- F-011: `buildPlan` and `analyze` (`src/checks/index.ts`) are empty stubs; F-012..F-014 fill them. `dataVersion` is empty until F-020; VerdictCard then shows only the request count. No `Range` header (03_ARCHITECTURE.md). Rate limiter is in memory per service worker.
- F-010: `revoke()` exists, its settings UI lands with the report page (F-022). `allowLocalTargets` setting has no UI yet, so localhost is refused for now. ConsentBox links to the GitHub `WHAT_WE_NEVER_DO.md`. Bundle URL check now skips `*` match patterns.
- Owner of the sibling projects uses WXT (suitelens) and the same doc layout (moodlens). Reuse their configs where it saves work.
- F-002 left for later: `CopyButton` + FindingRow "Copy message" (needs developer-message keys), `ProgressBar` (F-011), `ConsentBox` (F-010). Verdict icon is the logo mark (`Icon name="mark"`, §7). `Finding.*Key` is now typed `MessageKey` (03_ARCHITECTURE.md updated).
