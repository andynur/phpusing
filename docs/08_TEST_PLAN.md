# 08 — Test plan

## Gates (`pnpm check`)

harness tests → lint → typecheck → unit tests → build → bundle URL allowlist test. All must pass before reporting a task done.

Runner regression tests use Node test (`pnpm check:harness`); see `10_AGENT_HARNESS.md` for compact output and logs.

## Unit tests (Vitest)

| Area | What | Location |
|---|---|---|
| Checks | Each check ID: one positive and one negative fixture, plus a soft-404 fixture where relevant | `tests/checks/<family>.test.ts`, `tests/fixtures/<checkId>/` |
| Secret redaction | Fixture `.env` with known values; assert no value substring in serialized `ScanResult` or copied message | `tests/redaction.test.ts` |
| Composer constraints | Table of real advisory constraints vs versions | `tests/composer-semver.test.ts` |
| PHP versions | Upstream, distro-suffixed and hidden versions vs PHP2Shell and EOL data | `tests/php-version.test.ts` |
| Verdict | Severity combinations → verdict | `tests/verdict.test.ts` |
| Budget | Never exceeds request cap; stops on 403/429 streak; cancel aborts | `tests/budget.test.ts` (mocked fetch) |
| i18n | Key parity, placeholders, no empty strings | `tests/i18n.test.ts` |
| Signature | Valid signature accepted, tampered data rejected | `tests/verify.test.ts` |
| Bundle | No URL literals outside the allowlist in `.output/` | `tests/bundle-urls.test.ts` |

## Fixtures

- Only synthetic data. Never copy real `.env`, logs or lock files from client sites.
- Real-world response shapes (Ignition page, phpinfo) are reduced to the minimal markers the signature needs.

## E2E (v0.2+, Playwright)

- A local fixture server (`tests/e2e/server.ts`) serves three sites: `clean`, `leaky` (exposed `.env`, `.git`, debug), `soft404` (200 for every path).
- Load the built extension, grant host permission, run a scan, assert verdict and finding IDs.
- `soft404` must produce zero exposure findings.

## Manual checks before release

- Scan a real site you own with WAF enabled; confirm no block and ≤ 60 requests (DevTools network log).
- EN/ID toggle on every screen; light and dark themes; keyboard-only run.
