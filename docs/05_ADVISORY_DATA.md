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
     "packages": { "laravel/framework": [{ "id": "PKSA-…", "cve": "CVE-… or null", "affected": ">=10.0,<10.48.29", "severity": "critical or null", "url": "https://… or null" }] }
   }
   ```
   Built by `tools/build-data/build.mjs` (Node built-ins only) from `tools/build-data/php-core.json` (hand-curated), endoflife.date `api/php.json` and Packagist `api/security-advisories/?updatedSince=0`. Package entries carry Packagist's `severity` label; OSV CVSS vectors are not merged yet, and the KEV flag arrives with F-034. Version is `<UTC date>.<workflow run number>`. The build fails on any entry that breaks the rules in `tools/build-data/lib.mjs` (CVE format, https source, explicit EOL date).
3. Sort keys, minify, compute SHA-256, sign with Ed25519 (private key in GitHub Actions secret `PHPUSING_DATA_KEY` only; create the pair once with `node tools/build-data/keygen.mjs`). The signature covers the exact bytes of `advisories.json`; `meta.json` is an unsigned hint.
4. Publish `advisories.json` + `advisories.json.sig` + `meta.json` to GitHub Pages under `https://andynur.github.io/phpusing/v1/` (D-014) from `.github/workflows/advisory-data.yml`, daily and on demand. Size on 2026-10-26: 1.3 MB, 254 KB gzipped.
5. Copy the same files into `data/snapshot/` for the bundled snapshot at release time. Not automated yet: the snapshot keeps `packages` empty until VU-02 (F-032) needs them, and a test keeps its `php` entries equal to `php-core.json`.

All values in `php` entries must carry a source URL. Never hand-type a CVE ID or version without one.

## In-extension use

- Snapshot: `data/snapshot/advisories.json` is curated by hand (PHP2Shell from the php.net advisory of 21 Oct 2026, PHP cycles from endoflife.date on 2026-10-25), with `packages` empty. It ships inside the extension package, so it is not separately signed; the pipeline and signatures arrive with F-030.

- Bundled snapshot loads first, so scans work offline and on first run.
- Update: download the **whole** file (never per-package or sharded requests, so the host learns nothing about the user's stack). Verify the Ed25519 signature with the public key compiled into the extension (WebCrypto `Ed25519`; fallback to a vetted small library only if needed, with a decision entry). Reject on mismatch and keep the old data.
- Report always shows the data version date. Warn if older than 14 days.
- F-031 (`src/advisories/update.ts`, `verify.ts`): the background fetches `meta.json` first (unsigned hint; it can only skip the download), then `advisories.json` and `.sig`. Fetches omit credentials, refuse redirects, time out after 15 s and stop at 8 MB. Verified data is stored in `storage.local` (`advisoryData`: `version`, `php`, `eol` and `packages`) with `advisoryMeta`. A signed file whose version is not newer than the current data is ignored, so an old file cannot roll data back. Auto-check (FR-17) runs on scan when the data is older than 7 days, at most once per 6 h, and can be disabled on the report page.
- WebCrypto `Ed25519` ships in Chrome 137 and later. On older Chrome, verification fails closed and the bundled snapshot stays in use; no fallback library was added.

## Composer constraint matching (`src/advisories/composer-semver.ts`)

Must support what advisories use: `|` / `||` (or), `,` and space (and), `>`, `>=`, `<`, `<=`, `=`, `!=`, exact versions, `x`/`*` wildcards, and normalization of `v` prefixes and 4-part versions (`1.2.3.4`). Stability suffixes (`-beta1`, `-RC2`) compare below the release. Dev branches (`dev-main`) are not matched; report as "cannot evaluate".

Test against a table of real advisory constraints (`tests/fixtures/constraints.json`) and compare results with `composer audit` output for a known lock file.

F-032: `satisfies(installed, constraint)` returns `true`, `false` or `null` (cannot evaluate). As in composer/semver, `<X` and `>=X` without a stability mean `<X-dev` and `>=X-dev`, so `7.15.2-beta1` is not `<7.15.2`. Date versions (`2020-09-14`) are read as dotted versions. `~` and `^` give `null`; Packagist advisory constraints in the 2026-10-26 data do not use them. Not yet compared with `composer audit` output (unverified).

## PHP version matching

- Parse `X-Powered-By` `PHP/8.3.12` and distro forms (`8.1.2-1ubuntu2.18`). For distro forms keep the upstream part and set confidence `likely`, with an explanation that distributions backport fixes.
- A version is affected by PHP2Shell if it is below the fixed patch of its minor line, or its minor line is below `unfixedBelow`.
