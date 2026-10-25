# 04 — Checks catalog

One row per check. Read only the row you work on. A check ships only with a positive and a negative fixture test (`08_TEST_PLAN.md`).

Rules for every check:
- Detect by **content signature**, never by status code alone. Compare against the soft-404 baseline (same body hash or same title → not found).
- Requests are GET (or HEAD where noted) to the scanned origin only. No query payloads.
- Evidence is redacted: path, status, and key names or markers only. Never values.

Severity: **C** critical, **H** high, **M** medium, **L** low, **I** info.

## Fingerprint (FP) — no extra requests

| ID | Signal | Source | Output |
|---|---|---|---|
| FP-01 | PHP version | `X-Powered-By: PHP/x.y.z` on baseline | `php` version, confidence `confirmed` if present |
| FP-02 | Server | `Server` header | e.g. `nginx/1.24`, info only |
| FP-03 | Laravel | cookie names `XSRF-TOKEN`, `*_session`; `meta[name=csrf-token]` only together with another PHP signal (Rails uses the same meta) | `framework: laravel` (likely) |
| FP-04 | WordPress | `meta[name=generator]` WordPress, `/wp-content/` in script/link URLs | `cms: wordpress` + version if in generator |
| FP-05 | Livewire | script src containing `livewire.js` or `livewire.min.js` | `livewire: present` |
| FP-06 | CodeIgniter | cookie name `ci_session` | `framework: codeigniter` (likely) |

If no PHP signal at all, report verdict `unknown` with "PHP not detected" unless exposure checks find something.

## Exposure (EX)

| ID | Path(s) | Signature (all must match) | Sev |
|---|---|---|---|
| EX-01 | `/.env`, `/.env.backup`, `/.env.bak`, `/.env.old`, `/.env.production` | ≥ 3 lines matching `^[A-Z][A-Z0-9_]*=`; evidence = key names, highlight `APP_KEY`, `DB_PASSWORD`, `*_SECRET` | C |
| EX-02 | `/.git/HEAD` | body starts with `ref: refs/` or 40-hex SHA | C |
| EX-03 | `/.git/config` | contains `[core]` | C |
| EX-04 | `/composer.lock` | JSON with `packages` array and `content-hash` | C (also feeds VU-02) |
| EX-05 | `/composer.json` | JSON with `require` | M |
| EX-06 | `/storage/logs/laravel.log` | line matching `^\[\d{4}-\d{2}-\d{2} [\d:]+\] \w+\.(ERROR|INFO|DEBUG)` | C |
| EX-07 | `/phpinfo.php`, `/info.php`, `/php_info.php` | contains `phpinfo()` and `PHP Version` | H |
| EX-08 | `/_ignition/health-check` | JSON with `can_execute_commands` | C (CVE-2021-3129 class) |
| EX-09 | `/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php` (HEAD) | status 200 and not baseline; never send a body | C (CVE-2017-9841) |
| EX-10 | `/telescope`, `/horizon` | 200 with `Telescope` / `Horizon` in title, no login redirect | H |
| EX-11 | `/adminer.php`, `/phpmyadmin/`, `/pma/` | title contains `Adminer` / `phpMyAdmin` | H |
| EX-12 | `/backup.zip`, `/backup.sql`, `/db.sql`, `/database.sql`, `/dump.sql`, `/site.zip` | ZIP magic `PK\x03\x04` or SQL dump header (`-- MySQL dump`, `-- MariaDB dump`, `CREATE TABLE`) in first 512 bytes | C |
| EX-13 | `/.DS_Store` | magic `\x00\x00\x00\x01Bud1` | L |
| EX-14 | `/wp-config.php.bak`, `/wp-config.php~`, `/wp-config.old` | contains `DB_PASSWORD` | C (v0.3) |
| EX-15 | `/wp-content/debug.log` | PHP log line pattern | H (v0.3) |
| EX-16 | `/server-status` | `Apache Server Status` | M |

Budget order when trimming: C first, then H, then M, L.

## Configuration (CF)

| ID | Check | Method | Sev |
|---|---|---|---|
| CF-01 | Debug mode | Baseline random path body contains Ignition (`Ignition`, `flareapp`), Whoops (`Whoops! There was an error`), Symfony (`Symfony Exception`, `sf-dump`) or a PHP stack trace (`Stack trace:` + `.php:`) | C |
| CF-02 | HTTPS | Origin is `http:` (the tab loaded over plain HTTP, no redirect). No `https:` probe: it is a second origin outside the granted permission (D-003) | M |
| CF-03 | Security headers | Missing HSTS (https only), `X-Content-Type-Options`, CSP | I (shown collapsed) |
| CF-04 | Directory listing | `/vendor/`, `/storage/`, `/uploads/`, `/wp-content/uploads/` body contains `Index of /` | H |

## Versions (VU) — no extra requests

| ID | Input | Data | Sev |
|---|---|---|---|
| VU-01 | FP-01 PHP version | PHP2Shell fixed versions (unverified, see Q-2) + endoflife.date PHP cycles | C if affected by PHP2Shell; H if EOL; confidence `likely` (distro backports) |
| VU-02 | `composer.lock` (exposed or dropped) | Packagist advisories + OSV (`05_ADVISORY_DATA.md`) | From advisory CVSS: ≥ 9 C, ≥ 7 H, ≥ 4 M, else L. KEV → C |
| VU-03 | WordPress core version (FP-04) | Wordfence Intelligence (pending Q-3) | by CVSS (v0.3) |
| VU-04 | Plugin versions from `/wp-content/plugins/<slug>/readme.txt` `Stable tag` | same | by CVSS (v0.3) |

If PHP is detected but the version is hidden: finding `I`, confidence `version-hidden`, text explains how to check with the host.

## Verdict mapping

| Verdict | Rule |
|---|---|
| `major` | any C |
| `mild` | any H or M, no C |
| `calm` | only L/I, and PHP version known and supported |
| `unknown` | scan blocked, PHP not detected, or version hidden with no other findings |

## Adding a check

1. Add a row here with ID, signature and severity.
2. Implement in the matching `src/checks/*.ts` file as a pure function.
3. Add positive + negative fixtures and i18n keys (`check.<id>.title|impact|fix`) in both languages.
