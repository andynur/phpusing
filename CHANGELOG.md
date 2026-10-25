# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

- docs: MIT license, final privacy policy for v0.1 and Chrome Web Store listing in EN/ID (F-090).
- feat: report page with findings by severity, Copy message for developer (EN/ID), stale-data warning, limits note and settings (allowed sites, local targets); popup shows top three findings and opens the report (F-022).
- feat: PHP version check VU-01 for PHP2Shell (CVE-2026-109618, CVE-2026-109619) and end-of-life branches, with bundled advisory snapshot `2026-10-25.1` (F-020).
- chore: add shared phpusing check/review skills and an optional bounded reviewer for Codex and Claude.

- feat: verdict from findings (major, mild, calm, unknown) and toolbar badge `!`/`?` (F-021).
- feat: config checks for debug mode, plain HTTP and directory listing (CF-01, CF-02, CF-04) (F-014).
- feat: exposure checks EX-01..EX-12 (.env, .git, composer files, Laravel log, phpinfo, Ignition, PHPUnit eval-stdin, Telescope/Horizon, DB admin tools, backups) with redacted evidence (F-013).
- chore: audit Codex/Claude harness, add compact fail-fast verification with local logs and runner regression tests, and tighten context routing.

- feat: fingerprint PHP version, server, Laravel, WordPress and Livewire from baseline headers and DOM markers; adds `scripting` permission (F-012).
- feat: scanner core with request budget, concurrency 3, 8 s timeout, 64 KB read cap, cancel, 403/429 stop, per-origin rate limit and soft-404 baseline; background service and popup progress (F-011).
- feat: popup "Check this site" with per-origin consent, runtime host permission request and target rules for browser pages and local addresses (F-010).
- feat: UI primitives Button, Card, SeverityBadge, ConfidenceTag, VerdictCard, FindingRow, EmptyState with EN/ID strings (F-002).
- feat: WXT + React + Tailwind 4 scaffold with design tokens, popup shell and EN/ID toggle (F-000, F-001).
- chore: `pnpm check` gate with lint, typecheck, Vitest, build and bundle URL allowlist.
- docs: initial product, design, architecture, checks catalog and agent harness.
