# Status

Single source of "where are we". Update at the end of every task. Keep it under 40 lines.

- **Current release:** v0.1 (MVP), see `02_ROADMAP.md`
- **Phase:** planning done, scaffold not started
- **Last done:** 2026-10-25, initial docs and harness (AGENTS, PRD, design, architecture, checks catalog)
- **Next task:** F-000, scaffold WXT + React + Tailwind 4 + Vitest + ESLint/Prettier, `pnpm check` green on an empty popup with the EN/ID toggle

## Blockers and open questions

| ID | Question | Owner | Needed by |
|---|---|---|---|
| Q-1 | License: MIT proposed. Confirm. | Andy | v0.1 publish |
| Q-2 | Verify PHP2Shell CVE IDs and fixed versions on php.net (secondary source said CVE-2026-109618/109619; fixed 8.5.12, 8.4.27, 8.3.36, 8.2.35; 8.1 and older unfixed). | agent | F-020 |
| Q-3 | Wordfence Intelligence data license allows bundling in an open-source extension? | Andy | v0.3 |
| Q-4 | Register `phpusing.dev` and GitHub org `phpusing` (both free on 2026-10-25). | Andy | v0.1 publish |
| Q-5 | Advisory data host: GitHub Releases vs GitHub Pages. | agent | F-030 |

## Notes for the next session

- Owner of the sibling projects uses WXT (suitelens) and the same doc layout (moodlens). Reuse their configs where it saves work.
