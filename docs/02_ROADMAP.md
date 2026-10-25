# 02 — Roadmap and feature IDs

Work only on the current release (see `00_STATUS.md`). Tick items when done. Check IDs refer to `04_CHECKS.md`.

## v0.1 — MVP (target: as soon as possible, PHP2Shell window)

- [x] H-001 Agent harness: shared context routing, compact checks, Codex/Claude project setup (see `10_AGENT_HARNESS.md`)
- [x] F-000 Scaffold: WXT, React, Tailwind 4 tokens, Vitest, ESLint/Prettier, `pnpm check`
- [x] F-001 i18n core: `en.json`, `id.json`, `t()`, EN/ID toggle, parity test
- [x] F-002 Design tokens and primitives from `DESIGN.md` (Button, Card, SeverityBadge, VerdictCard, FindingRow)
- [x] F-010 Popup: Check this site, consent step, runtime permission request
- [x] F-011 Scanner core: budget, concurrency, timeout, read cap, cancel, soft-404 baseline
- [x] F-012 Fingerprint: FP-01..FP-05
- [x] F-013 Exposure checks: EX-01..EX-12
- [ ] F-014 Config checks: CF-01, CF-02, CF-04
- [ ] F-020 PHP core version check: VU-01 (PHP2Shell + EOL), bundled data
- [ ] F-021 Verdict and severity logic
- [ ] F-022 Report page with Copy message for developer (EN/ID)
- [ ] F-090 Store listing EN/ID, screenshots, `PRIVACY.md` final, license

## v0.2 — Composer depth

- [ ] F-030 Advisory data pipeline (`tools/build-data`), Ed25519 signing, static hosting
- [ ] F-031 In-extension data update with signature check
- [ ] F-032 VU-02: audit exposed `composer.lock`
- [ ] F-033 Drop `composer.lock` on report page (local parse)
- [ ] F-034 CISA KEV flag on matched advisories
- [ ] F-035 Markdown report export

## v0.3 — WordPress

- [ ] F-040 VU-03 WordPress core version
- [ ] F-041 VU-04 plugin versions from public `readme.txt` (top plugins only, budget-aware)
- [ ] F-042 WordPress exposure checks (debug.log, config backups)

## v0.4 — Reach

- [ ] F-050 Firefox build
- [ ] F-051 Livewire version via asset hash (if a reliable mapping exists)
- [ ] F-052 CodeIgniter and Symfony specific checks

## Later (not scheduled)

- Landing page on `phpusing.dev` (static, no analytics).
- Optional "share anonymized result" — rejected for now (D-006).
