# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

- feat: exposure checks EX-01..EX-12 (.env, .git, composer files, Laravel log, phpinfo, Ignition, PHPUnit eval-stdin, Telescope/Horizon, DB admin tools, backups) with redacted evidence (F-013).
- chore: audit Codex/Claude harness, add compact fail-fast verification with local logs and runner regression tests, and tighten context routing.

- feat: fingerprint PHP version, server, Laravel, WordPress and Livewire from baseline headers and DOM markers; adds `scripting` permission (F-012).
- feat: scanner core with request budget, concurrency 3, 8 s timeout, 64 KB read cap, cancel, 403/429 stop, per-origin rate limit and soft-404 baseline; background service and popup progress (F-011).
- feat: popup "Check this site" with per-origin consent, runtime host permission request and target rules for browser pages and local addresses (F-010).
- feat: UI primitives Button, Card, SeverityBadge, ConfidenceTag, VerdictCard, FindingRow, EmptyState with EN/ID strings (F-002).
- feat: WXT + React + Tailwind 4 scaffold with design tokens, popup shell and EN/ID toggle (F-000, F-001).
- chore: `pnpm check` gate with lint, typecheck, Vitest, build and bundle URL allowlist.
- docs: initial product, design, architecture, checks catalog and agent harness.
