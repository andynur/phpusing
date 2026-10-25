# 06 — Security, privacy and abuse limits (engineering)

User-facing promises live in `PRIVACY.md` and `WHAT_WE_NEVER_DO.md`. This file is the engineering contract behind them.

## Network allowlist

The extension makes exactly two kinds of requests:

1. **Scan probes** to the scanned origin, after consent and host permission for that origin.
2. **Advisory data** download from the single static host defined in `src/advisories/config.ts`.

Nothing else: no fonts, CDNs, analytics, error reporting, update pings, or link previews. A unit test scans the built bundle for URL literals and fails on anything outside this list. Reference links in findings (`https://nvd.nist.gov/vuln/detail/…`) are allowlisted because the user opens them in a tab; the extension never fetches them.

## Hard limits (constants in `src/scanner/budget.ts`)

| Limit | Value |
|---|---|
| Requests per scan | 60 |
| Concurrency | 3 |
| Delay between requests per slot | 150 ms |
| Timeout per request | 8 s |
| Body read cap | 64 KB |
| Consecutive 403/429 before stopping | 3 |
| Scans per origin per minute | 2 |

Changing a limit needs a decision entry.

## Abuse resistance

- Target is always the active tab's origin; there is no URL input field in v0.1. (A typed-URL mode would make bulk scanning trivial; rejected in D-005.)
- Per-origin consent checkbox plus Chrome's own permission prompt.
- No payloads: no query strings, no POST, no headers beyond defaults, no path traversal sequences.
- No exploitation or confirmation by attack; EX-09 uses HEAD only.

## Secret handling

- Bodies stay inside the fetch wrapper and the check functions.
- Checks emit evidence built from key names, markers and paths. A test feeds a fixture `.env` with known values and asserts no value substring appears anywhere in the `ScanResult` JSON.
- Never log bodies, headers with cookies, or evidence to the console in production builds.
- `Copy message for developer` uses the same redacted evidence.

## Untrusted content

- Scanned responses are never inserted as HTML. React text nodes only.
- Titles or markers shown as evidence are truncated to 80 characters and stripped of control characters.

## Extension hygiene

- MV3 CSP default; no `eval`, no remote scripts.
- Minimal dependencies; `pnpm audit` in CI.
- Release builds are reproducible from a tagged commit; store ZIP hash published in the GitHub release.

## Chrome Web Store policy notes

- Single purpose: "check your own PHP website for known security problems".
- Justify each permission in the listing in the words of the table in `03_ARCHITECTURE.md`.
- Privacy practices form: no data collected.
