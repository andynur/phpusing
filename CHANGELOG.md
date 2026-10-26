# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

## [0.2.0] - 2026-10-26

- docs: privacy policy 0.2.0 describes the signed vulnerability-data download, the local `composer.lock` check and the typed PHP version; README status updated.
- fix: **Update now** on the report page always failed: the background ignored messages whose sender has `sender.tab`, which Chrome sets for the report page because it runs in a tab. Trust now depends on the extension ID and the extension URL only.
- feat: enter the PHP version by hand when the scan could not see it (F-036, FR-19, D-013): parsed from a version or `php -v` output, matched in the browser, kept in memory only; the verdict, findings, copied message and Markdown report say it was entered by the owner.
- feat: download the report as a Markdown file (F-035), in the developer message language, with redacted evidence only.
- feat: flag advisories in the CISA KEV catalog as exploited in the wild (F-034): the data pipeline adds a `kev` list, VU-02 findings with a KEV CVE become critical, and VU-01 and VU-02 show the KEV badge.
- feat: check a `composer.lock` on the report page (F-033): pick or drop the file, it is audited in the browser against package advisories and never uploaded or stored.
- feat: read up to 2 MB of an exposed `composer.lock` so VU-02 audits the whole file (D-015); other responses stay at 64 KB.
- feat: VU-02 audits an exposed `composer.lock` against Packagist advisories (F-032): one finding per affected package at its worst advisory severity, Composer constraint matching in `src/advisories/composer-semver.ts`, and a note on the EX-04 finding saying how many packages were audited.
- feat: in-extension advisory data update (F-031): report page shows the data date, **Update now** and an auto-check switch; scans check for newer data when ours is older than 7 days. Downloads the whole file, verifies Ed25519 with WebCrypto, rejects older versions and keeps the old data on any failure.
- fix: advisory-data workflow no longer fails on setup-node's pnpm cache; build retries source downloads, refuses a signing key that does not match `DATA_PUBLIC_KEY` in `src/advisories/config.ts`, and runs on pushes that touch the pipeline.
- feat: advisory data pipeline `tools/build-data` (php.net core entries, endoflife.date, Packagist), Ed25519 signing and a daily GitHub Pages workflow (F-030, D-014).

## [0.1.0] - 2026-10-26

- feat: clearer "PHP version hidden" finding (EN/ID): says hiding is good, how to check the version, which releases have the PHP2Shell fix, and warns against a public phpinfo page.
- docs: plan owner-entered PHP version for hidden-version sites (FR-19, F-036, D-013) and log the verification-file idea.
- fix: background replies via `sendResponse` + `return true`, so the popup no longer shows "Something went wrong" on Chrome builds that ignore a Promise returned from `onMessage` (seen on Chromium 141).
- fix: treat `.test`, `.internal` and `.home.arpa` hosts as local targets (FR-4); they need the developer setting like `localhost`.
- docs: add EN/ID branding and marketing kit with actual-UI demo screenshots, README banners, social cards, store promo tiles, logo lockups, copy and a reproducible renderer; remove unverified timing claims from store copy.

- feat: clearer popup for non-technical owners: logo header, compact language toggle plus a one-tap theme icon, site shown at the top, check IDs hidden, "+N more" hint, action buttons pinned at the bottom.
- feat: extension icon set (16–128 px): outline dizzy head with spiral on the brand violet tile; in-app verdict mark matches; store screenshots refreshed.
- feat: add a persisted light/dark theme toggle to popup and report; light is the default (FR-16).
- docs: refresh the GitHub README with developer setup, validation, architecture, privacy boundaries, contribution, and security reporting guidance.
- docs: MIT license, final privacy policy for v0.1, Chrome Web Store listing and screenshots in EN/ID (F-090).
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
