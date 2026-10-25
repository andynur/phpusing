# 01 — Product Requirements

Read the section you need. Feature IDs and release order live in `02_ROADMAP.md`.

## 1. Problem

Most critical incidents on PHP sites come from three causes: outdated software with a public CVE, secret files left reachable (`.env`, `.git`, backups), and debug mode left on. Recent examples: PHP2Shell (unauthenticated RCE in PHP core, exploited before the patch, October 2026), Laravel `APP_KEY` leaks leading to RCE, Livewire v3 RCE (CVE-2025-54068), and weekly WordPress plugin CVEs.

Site owners who are not developers cannot tell whether their own site is affected. Existing tools fall short:

| Tool | Gap for a non-developer owner |
|---|---|
| `composer audit`, Ward, Enlightn, larascan, Nuclei | CLI or server access needed; developer language |
| StackShield, Scan.now, ismycodesafe | Scan runs on the vendor's server; freemium funnel; English only |
| Maurizio Fonte composer audit (web) | Needs `composer.lock`; loads data shards per package; not a live-site check |
| PHPeek (Chrome, local) | Built for *visitors*; checks only the PHP version header for PHP2Shell |
| PHPatch phpscan | Version fingerprint only; funnel to a paid patch service |

**Gap:** a free, open-source, fully local tool for the *owner*, covering versions, exposed files, debug mode and framework-specific risks, in plain EN and ID.

## 2. Users

| Persona | Context | Needs |
|---|---|---|
| **Owner** (primary) | Runs a WordPress, Laravel or CodeIgniter site for a school, office, government unit (`.go.id`) or small business. Not a developer. | A clear verdict, what it means, and a message to forward to their developer or host. |
| **Developer / freelancer** | Maintains several client sites. | Fast check after deploy; exact evidence (path, version, CVE) to fix. |
| **IT staff at an institution** | Responsible for many internal PHP sites. | Repeatable, safe check that does not trigger a WAF or count as an attack. |

Out of scope as users: visitors checking third-party sites (PHPeek covers this), pentesters (they have Nuclei).

## 3. Goals and non-goals

**Goals**
- G1. An owner gets a verdict in under 30 seconds with one click on their open site.
- G2. Every finding states impact, evidence and fix in plain language, in EN or ID.
- G3. Zero data leaves the browser except probes to the scanned origin and the signed data download.
- G4. Zero false "safe" claims. Unknowns are reported as unknown.
- G5. Ship v0.1 while PHP2Shell is in the news.

**Non-goals**
- Finding logic bugs (IDOR, auth bypass, mass assignment). We say so in the report.
- Exploiting or confirming vulnerabilities by attack.
- Scanning sites the user does not own, bulk scanning, monitoring schedules.
- Non-PHP stacks (maybe later; the name stays).

## 4. User journey (v0.1)

1. Owner installs from the Chrome Web Store, opens their site, clicks the phpusing icon.
2. Popup shows the language toggle (EN/ID) and **Check this site**.
3. First time per origin: an authorization checkbox ("I own this site or have permission to test it"), then Chrome's permission prompt for that origin only.
4. Scan runs with live progress (checks done / total). Budget: at most 60 requests, about 10–20 seconds.
5. Popup shows the verdict card and the top three findings. **Open full report** opens the report page in a tab.
6. Report page lists all findings by severity. Each has **Copy message for developer** (EN or ID, chosen separately from the UI language).
7. Results live in memory for that tab session. Nothing persists unless the user exports.

## 5. Functional requirements

### 5.1 Scan control
- FR-1. Scan starts only from an explicit click; target is the active tab's origin (scheme + host + port).
- FR-2. Per-origin authorization checkbox stored as a boolean for that origin; the user can revoke it in settings, which also removes the host permission.
- FR-3. Cancel button stops in-flight requests.
- FR-4. Refuse to scan `chrome://`, `file://`, extension pages, IP literals in private ranges only if the user has not enabled "local/dev targets" in settings (developers need `localhost`).

### 5.2 Detection
- FR-5. Fingerprint stack (PHP version, server, framework, CMS) from the root response and from DOM markers read via `activeTab` (cookie *names* and markup only).
- FR-6. Run the exposure, configuration and version checks in `04_CHECKS.md`, respecting the soft-404 baseline.
- FR-7. Match detected versions against the local advisory data (`05_ADVISORY_DATA.md`). Flag CISA KEV entries as "exploited in the wild".
- FR-8. If `composer.lock` is exposed, audit it in memory and report the exposure itself as critical.
- FR-9. (v0.2) Owner can drop a `composer.lock` on the report page; parsed locally, never uploaded.

### 5.3 Reporting
- FR-10. Verdict: one of four levels (DESIGN.md §4). Derived only from findings, never from absence of evidence alone.
- FR-11. Each finding has: title, severity, confidence (`confirmed` / `likely` / `version-hidden`), plain impact, evidence (redacted), fix steps, references (CVE, advisory URL).
- FR-12. Copy message for developer: plain text, includes origin, finding, evidence, fix, references; language selectable EN/ID.
- FR-13. Export report as Markdown file (v0.2). No HTML export in v0.1.
- FR-14. A fixed footer note: what phpusing cannot detect (logic bugs, private admin areas, server-side config it cannot see).

### 5.4 Settings
- FR-15. Language: EN / ID. Default from browser language (`id*` → ID, else EN).
- FR-16. Theme defaults to light; the owner can manually switch between light and dark.
- FR-17. Advisory data: shows version date, **Update now** button, auto-check on scan if data is older than 7 days (single request to the static host; can be disabled).
- FR-18. Manage authorized sites (list, revoke).

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | No backend, no telemetry, no third-party scripts, no remote code. See `06_SECURITY_PRIVACY.md`. |
| Politeness | ≤ 60 requests per scan, concurrency 3, 8 s timeout, 64 KB read cap per response. |
| Performance | Popup interactive < 300 ms; scan p50 < 20 s on a normal site. |
| Size | Extension package < 3 MB including the bundled advisory snapshot. |
| Accessibility | WCAG 2.2 AA contrast, full keyboard use, severity never conveyed by color alone. |
| Browser | Chrome and Chromium (Edge, Brave) v0.1; Firefox v0.4. |
| Language | EN and ID at parity; CI fails on missing keys. |

## 7. Success metrics

No telemetry exists, so measure only public signals:
- Chrome Web Store installs and rating ≥ 4.5.
- GitHub stars, issues filed as "false positive" (target < 5% of findings reported).
- Number of check additions from contributors.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Used to scan sites the user does not own | Active tab only, per-origin consent, request budget, no payloads, no bulk mode. Same capability as opening URLs by hand. |
| False positives scare owners | Soft-404 baseline, content signatures (not status codes), confidence labels, no "safe" verdict. |
| Distro-patched PHP reported as vulnerable | Show `likely` confidence and explain backports in the finding. |
| WAF blocks or flags the scan | Low budget, normal browser user agent, stop on repeated 403/429 and report "scan blocked". |
| Stale advisory data | Data date shown on every report; warning when older than 14 days. |
| Chrome Web Store rejection as "hacking tool" | Clear owner-focused listing, consent step, detection-only wording, published `WHAT_WE_NEVER_DO.md`. |
| Competitors move fast (PHPeek, phpscan) | Differentiate on owner focus, breadth of checks, ID language. Ship v0.1 small. |

## 9. Open questions

Tracked in `00_STATUS.md` (Q-1 to Q-5).
