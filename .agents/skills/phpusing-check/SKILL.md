---
name: phpusing-check
description: Implement or repair a phpusing detection check, probe plan, or version matcher with fixtures and redacted evidence. Use for a specified FP, EX, CF, or VU check; not general UI or repository tooling.
---

# Implement one check family

Work from the repository root. Follow `AGENTS.md`; this skill adds check-specific implementation guidance.

- Select the requested check IDs and current-release roadmap row. If the request says only "next", use `docs/00_STATUS.md`; do not infer that a later catalog entry is in scope.
- Read only those rows in `docs/04_CHECKS.md`, their PRD requirements, and the applicable test/privacy sections. Inspect `src/checks/index.ts`, `src/scanner/plan.ts` and the closest existing check/test for integration points.
- For path signatures, consider the existing `PathCheck`, `runPathChecks` and `planFor` helpers in `src/checks/exposure.ts`. Verify their current contracts before reuse. Baseline and fingerprint checks should avoid extra probes when the required evidence already exists.
- Keep response matching pure and register it in `analyze`; add probes only when required. Verify the resulting total request budget, not just the count added by this change.
- Add synthetic positive, negative and relevant soft-404 cases. Include misleading HTTP 200 responses, empty/truncated input and redaction assertions when applicable. Raw fixtures are intentionally excluded from formatting.
- Add EN/ID keys and connect finding metadata. Test the public analysis/plan path as well as the matcher so an unregistered check cannot silently pass.

## Version/advisory checks

Read the relevant section of `docs/05_ADVISORY_DATA.md`. Verify CVE identity, affected ranges, fixed releases and EOL dates against primary upstream sources; record source URL and verification date with the data or its documentation. Treat Q-2 and existing catalog claims as unverified until checked. If sources are unavailable or disagree, do not ship an invented affected range: report the unresolved fact and keep the verdict honest. Cover range boundaries, hidden versions and distribution suffix/backport uncertainty.

## Verification and optional review

Run focused tests during implementation. The parent runs the final full gate and handoff from `AGENTS.md`.
For a nontrivial change to redaction, origin/permission enforcement, budget enforcement or advisory/verdict logic, use `phpusing-review` once after the patch is stable if an independent review can run alongside useful parent work. Otherwise review locally. No delegation for a simple string/fixture edit; no child writers or recursive delegation. Review does not authorize live-site scans.
