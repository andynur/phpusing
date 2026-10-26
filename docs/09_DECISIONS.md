# 09 — Decisions

Accepted decisions are binding. Add new ones at the end; never edit an accepted one, supersede it.

| ID | Date | Decision | Why |
|---|---|---|---|
| D-001 | 2026-10-25 | Chrome MV3 extension built with WXT, React, Tailwind 4 tokens, TypeScript, pnpm. | Same stack as suitelens; Firefox later from one codebase. |
| D-002 | 2026-10-25 | No backend, no account, no telemetry. | Privacy-first is the product's main difference from StackShield and Scan.now. |
| D-003 | 2026-10-25 | Host access only through `optional_host_permissions`, requested per origin at scan time. | Least privilege; store review; user trust. |
| D-004 | 2026-10-25 | Name **phpusing** ("PHP" + *pusing*). Brand stays lowercase in text; descriptor "PHP site security check" always next to it. | All domains and handles free on 2026-10-25; descriptor compensates for weak SEO of "php using". |
| D-005 | 2026-10-25 | Scan only the active tab's origin; no typed-URL mode, no bulk, no schedule. | Limits abuse; target users are owners looking at their own site. |
| D-006 | 2026-10-25 | Scan results kept in `storage.session` only; no history persisted. | Nothing sensitive at rest. |
| D-007 | 2026-10-25 | Secret contents never leave the check function; evidence is key names and markers. | A leaked `.env` must not become a second leak through our tool. |
| D-008 | 2026-10-25 | Advisory data downloaded whole and Ed25519-signed; bundled snapshot for first run. | Per-package or sharded queries reveal the user's stack to the host. |
| D-009 | 2026-10-25 | English is the default for code, docs and UI; Indonesian UI via in-app toggle. | Global contributors; strong local differentiator. |
| D-010 | 2026-10-25 | No "safe" verdict. Best verdict is "calm": no critical issues found in what we can see. | External scanning cannot prove absence of vulnerabilities. |
| D-011 | 2026-10-25 | Keep agent context avoidance in AGENTS.md; Claude Read denies cover secret files, while generated files may be inspected for a relevant task. Remove blanket formatting preapproval. | Align tool settings with task-specific inspection and preserve unrelated edits; these rules are not a shell sandbox. |
| D-012 | 2026-10-25 | Share repository skills through `.agents/skills` and Claude symlinks; allow one bounded reviewer under the review skill while the parent owns writes and verification. | Independent security review when useful, without duplicated skill bodies, concurrent writers or recursive review loops. |
| D-013 | 2026-10-26 | When the PHP version is hidden, the owner may enter it by hand (FR-19, v0.2); it is matched locally and labeled "entered by you" in findings, verdict and developer message. phpusing never asks the owner to publish a `phpinfo()` page. | Hidden-version sites otherwise get no PHP2Shell answer; a public phpinfo page leaks server settings and is itself EX-07 (High). |
| D-014 | 2026-10-26 | Host the signed advisory data on GitHub Pages (`https://andynur.github.io/phpusing/v1/`), built and deployed by a GitHub Actions workflow; resolves Q-5. | Pages serves `Access-Control-Allow-Origin: *` (checked 2026-10-26), so the extension downloads it without a host permission; release assets redirect to a second host. One stable URL; `v1/` leaves room for format changes and a later landing page. |
