# DESIGN.md — phpusing design system

Read before touching any `.tsx` or CSS. Tokens live in `src/shared/ui/tokens.css`; this file is the spec.

## 1. Personality: serious tool, relaxed voice

phpusing deals with real risk, so the **content is sober**: exact evidence, clear severity, concrete fixes. The **frame is friendly**: the name is a joke about headaches, the verdict talks like a calm colleague, and nothing shouts.

| We are | We are not |
|---|---|
| Calm, plain, honest | Alarmist, red-everywhere, "HACKED!" |
| Specific (path, version, CVE) | Vague ("some issues found") |
| Light humor in the frame | Jokes inside findings or fixes |
| Confident about what we saw | Claiming the site is "safe" |

## 2. Hard rules

1. Tokens only. No raw hex, Tailwind palette colors (`bg-red-500`) or arbitrary values (`text-[13px]`) in components.
2. Severity is never color alone: always icon + label + color.
3. Every state works in light and dark; tokens switch under `[data-theme="dark"]` and `prefers-color-scheme`.
4. All copy through `t()` (`docs/07_I18N.md`), including `aria-label`.
5. Use primitives from `src/shared/ui/` before writing new markup; add a prop instead of restyling at the call site.
6. Scanned-site content (titles, markers) is shown in mono, truncated, as text only.

## 3. Tokens

All pairs below meet WCAG AA (≥ 4.5:1) on their paired background; checked 2026-10-25.

### Color — neutrals and brand

| Token | Light | Dark | Use |
|---|---|---|---|
| `--c-canvas` | `#F7F6F2` | `#121116` | Page / popup background (warm paper) |
| `--c-surface` | `#FFFFFF` | `#1B1A21` | Cards |
| `--c-surface-muted` | `#EFEEEA` | `#26252D` | Collapsed rows, code blocks, info badge bg |
| `--c-border` | `#E3E1DA` | `#2F2D37` | Dividers, card borders |
| `--c-fg` | `#1C1B22` | `#ECEBF0` | Body text |
| `--c-fg-muted` | `#55535E` | `#B6B4BF` | Labels, secondary text |
| `--c-fg-subtle` | `#6B6975` | `#8F8D99` | Meta: data date, request count |
| `--c-brand` | `#5B45D6` | `#A597FF` | Primary button, links, focus ring |
| `--c-brand-hover` | `#4B36C2` | `#B8ADFF` | Primary hover |
| `--c-on-brand` | `#FFFFFF` | `#121116` | Text on brand |

Brand is a calm violet: a nod to PHP's purple without copying its logo color.

### Color — severity (text on its own background)

| Severity | Icon | Text light / bg light | Text dark / bg dark |
|---|---|---|---|
| critical | octagon-alert | `#B42318` / `#FEE4E2` | `#FDA29B` / `#3B1613` |
| high | triangle-alert | `#B93815` / `#FFEDE3` | `#F9B384` / `#3A2012` |
| medium | circle-alert | `#8A5A00` / `#FEF4D6` | `#F5D06B` / `#33290C` |
| low | info | `#1D4ED8` / `#E6EEFF` | `#93B4FF` / `#13224A` |
| info | circle-dot | `#55535E` / `#EFEEEA` | `#B6B4BF` / `#26252D` |
| ok (calm verdict) | circle-check | `#067647` / `#DDF6E8` | `#7BDDA8` / `#0F2E20` |

Tokens: `--c-sev-<name>-fg`, `--c-sev-<name>-bg`.

### Typography

- Sans: `ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` — no web fonts (no network, D-002).
- Mono: `ui-monospace, "SF Mono", Menlo, Consolas, monospace` — paths, versions, CVE IDs, evidence.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `text-xs` | 12 / 16 | 400 | Meta, badges |
| `text-sm` | 13 / 18 | 400 | Body in popup |
| `text-base` | 14 / 20 | 400 | Body in report |
| `text-lg` | 16 / 22 | 600 | Card titles, finding titles |
| `text-xl` | 20 / 26 | 700 | Verdict title |
| `text-2xl` | 24 / 30 | 700 | Report page heading |

### Spacing, radius, elevation

- Spacing scale (4 px base): 4, 8, 12, 16, 24, 32.
- Radius: `--r-sm` 6 (badges, inputs), `--r-md` 10 (buttons, rows), `--r-lg` 16 (cards, verdict).
- One shadow only: `--shadow-card: 0 1px 2px rgb(0 0 0 / 0.06)` light; none in dark (use border).
- Motion: 150 ms ease-out for hover/expand; progress uses a determinate bar. Respect `prefers-reduced-motion` (no spin, no pulse).

### Layout

- Popup: 380 px wide, max 600 px tall, 16 px padding.
- Report page: max width 760 px, centered, 24 px padding; single column.

## 4. Verdict system

The verdict card is the only place with personality. Icon: the logo mark in four states.

| Verdict | EN title | ID title | Color set | Body (EN) |
|---|---|---|---|---|
| `calm` | All calm | Tenang dulu | ok | No critical issues found in what we can see. Keep PHP and plugins updated. |
| `mild` | Mild headache | Agak pusing | medium | A few things need attention. None look urgent, but fix them this week. |
| `major` | Major headache | Pusing berat | critical | Something serious is exposed. Fix the critical items today. |
| `unknown` | Can't tell yet | Belum bisa dipastikan | info | We could not see enough to judge. Details below. |

Below the title: count by severity as badges, data date, requests used (e.g. "41 requests · data 25 Oct 2026").

## 5. Copy rules

- Impact first, then fix. Max two sentences each. Example:
  - Title: "Your `.env` file is public"
  - Impact: "Anyone can download your database password and app key."
  - Fix: "Block access to `.env` in your web server and rotate every key in it."
- Use "your site", never "the target".
- Say "we saw" / "we could not see", never "we guarantee".
- Humor only in verdict titles, empty states and the loading line ("Checking for headaches…" / "Mencari sumber pusing…"). Never in findings, fixes or the developer message.
- Numbers and identifiers in mono: `PHP 8.1.2`, `CVE-2021-3129`, `/.env`.

## 6. Components (`src/shared/ui/`)

| Component | Notes |
|---|---|
| `Button` | variants `primary`, `secondary`, `ghost`; sizes `sm`, `md`; full keyboard focus ring `--c-brand` 2 px offset 2 px |
| `LangToggle` | segmented `EN | ID`, `aria-pressed`, top-right of popup and report |
| `VerdictCard` | icon + title + body + severity counts; color set from §4 |
| `SeverityBadge` | icon + label, `--c-sev-*`; `text-xs`, `--r-sm` |
| `ConfidenceTag` | text only, `--c-fg-subtle`: "confirmed", "likely", "version hidden" |
| `FindingRow` | collapsed: badge + title + check ID; expanded: impact, evidence (mono list), fix, refs, Copy message |
| `CopyButton` | shows "Copied" for 2 s, announced via `aria-live="polite"` |
| `ProgressBar` | determinate, label "12 of 41 checks" |
| `ConsentBox` | checkbox + one-line legal text + link to `WHAT_WE_NEVER_DO.md` |
| `EmptyState` | small mark + one friendly line + one action |

## 7. Logo and icon

- Mark: a magnifying lens whose glass holds a small spiral (the "pusing" swirl). Works at 16 px as a simple lens + dot.
- Toolbar icon states: default (outline), `!` badge for `major`, `?` for `unknown`. No badge for calm (avoid false reassurance on the toolbar).
- Do not use or imitate the official PHP logo or the elePHPant.

## 8. Accessibility checklist

- Contrast pairs from §3 only.
- Every interactive element reachable by Tab, visible focus, Enter/Space activate.
- Verdict and progress announced through `aria-live`.
- Findings list is a list (`ul/li`) with headings per severity group.
