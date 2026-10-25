# 05 — Advisory data

## Sources

| Source | Used for | Notes |
|---|---|---|
| Packagist Security Advisories API | Composer package advisories (VU-02) | Aggregates FriendsOfPHP/security-advisories and GitHub advisories for Packagist |
| OSV.dev Packagist dump | CVSS vectors, CWE, aliases | Bulk zip, not per-package queries |
| endoflife.date API | PHP, Laravel, Symfony, WordPress cycles | EOL and latest patch per cycle |
| CISA KEV catalog (JSON) | "Exploited in the wild" flag | Match by CVE ID |
| php.net security releases | PHP core issues such as PHP2Shell | Curated by hand in `tools/build-data/php-core.json` with source URL per entry |
| Wordfence Intelligence | WordPress core and plugins (v0.3) | License check pending (Q-3) |

Do not use WPScan data: its license restricts redistribution.

## Pipeline (`tools/build-data`, Node, not shipped in the extension)

1. Download all sources in full.
2. Normalize into one compact JSON:
   ```json
   {
     "version": "2026-10-25.1",
     "generatedAt": "2026-10-25T00:00:00Z",
     "php": [{ "id": "PHP2SHELL", "cves": ["…"], "fixed": ["8.5.12", "8.4.27", "8.3.36", "8.2.35"], "unfixedBelow": "8.2", "source": "https://www.php.net/…" }],
     "eol": { "php": [{ "cycle": "8.1", "eol": "2025-12-31", "latest": "8.1.x" }] },
     "packages": { "laravel/framework": [{ "id": "PKSA-…", "cve": "CVE-…", "affected": ">=10.0,<10.48.29", "cvss": 9.8, "kev": false, "url": "…" }] }
   }
   ```
3. Sort keys, minify, compute SHA-256, sign with Ed25519 (private key in GitHub Actions secret only).
4. Publish `advisories.json` + `advisories.json.sig` + `meta.json` to static hosting (Q-5).
5. Copy the same files into `data/snapshot/` for the bundled snapshot at release time.

All values in `php` entries must carry a source URL. Never hand-type a CVE ID or version without one.

## In-extension use

- Bundled snapshot loads first, so scans work offline and on first run.
- Update: download the **whole** file (never per-package or sharded requests, so the host learns nothing about the user's stack). Verify the Ed25519 signature with the public key compiled into the extension (WebCrypto `Ed25519`; fallback to a vetted small library only if needed, with a decision entry). Reject on mismatch and keep the old data.
- Report always shows the data version date. Warn if older than 14 days.

## Composer constraint matching (`src/advisories/composer-semver.ts`)

Must support what advisories use: `|` / `||` (or), `,` and space (and), `>`, `>=`, `<`, `<=`, `=`, `!=`, exact versions, `x`/`*` wildcards, and normalization of `v` prefixes and 4-part versions (`1.2.3.4`). Stability suffixes (`-beta1`, `-RC2`) compare below the release. Dev branches (`dev-main`) are not matched; report as "cannot evaluate".

Test against a table of real advisory constraints (`tests/fixtures/constraints.json`) and compare results with `composer audit` output for a known lock file.

## PHP version matching

- Parse `X-Powered-By` `PHP/8.3.12` and distro forms (`8.1.2-1ubuntu2.18`). For distro forms keep the upstream part and set confidence `likely`, with an explanation that distributions backport fixes.
- A version is affected by PHP2Shell if it is below the fixed patch of its minor line, or its minor line is below `unfixedBelow`.
