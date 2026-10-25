# Status

Single source of "where are we". Update at the end of every task. Keep it under 40 lines.

- **Current release:** v0.1 (MVP), see `02_ROADMAP.md`
- **Phase:** scaffold done, building v0.1 features
- **Last done:** 2026-10-25, F-000 scaffold + F-001 i18n core (`pnpm check` green: lint, typecheck, 18 tests, build, bundle URL allowlist)
- **Next task:** F-002, primitives from `DESIGN.md` §6 (Button, SeverityBadge, VerdictCard, FindingRow, EmptyState) on top of `src/shared/ui/tokens.css`

## Blockers and open questions

| ID | Question | Owner | Needed by |
|---|---|---|---|
| Q-1 | License: MIT proposed. Confirm. | Andy | v0.1 publish |
| Q-2 | Verify PHP2Shell CVE IDs and fixed versions on php.net (secondary source said CVE-2026-109618/109619; fixed 8.5.12, 8.4.27, 8.3.36, 8.2.35; 8.1 and older unfixed). | agent | F-020 |
| Q-3 | Wordfence Intelligence data license allows bundling in an open-source extension? | Andy | v0.3 |
| Q-4 | Register `phpusing.dev` and GitHub org `phpusing` (both free on 2026-10-25). | Andy | v0.1 publish |
| Q-5 | Advisory data host: GitHub Releases vs GitHub Pages. | agent | F-030 |

## Notes for the next session

- pnpm comes from corepack (`corepack enable pnpm`). Tokens are Tailwind utilities: `bg-canvas`, `text-fg-muted`, `bg-sev-critical-bg text-sev-critical`; the default palette is removed, so `bg-red-500` does not compile.
- Popup has only `storage` permission. F-010 adds `activeTab`, `scripting` and `optional_host_permissions`.
- Owner of the sibling projects uses WXT (suitelens) and the same doc layout (moodlens). Reuse their configs where it saves work.
