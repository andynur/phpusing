# 10 — Agent harness

Read this only for agent setup or verification tooling. Shared rules live in [AGENTS.md](../AGENTS.md); Claude imports that file through `CLAUDE.md`.

## Audit (2026-10-25)

Scope: repository instructions, agent settings, package scripts, lint/test configuration, test inventory and scanner/background boundaries. This is not a complete product security audit.

| Finding | Resolution |
|---|---|
| `pnpm check --silent` did not suppress output from the five child gates. | `tools/check.mjs` prints one result per stage, stops on failure, and retains complete per-stage logs in ignored `.agent-logs/`. |
| Codex had no project defaults. | `.codex/config.toml` sets medium reasoning for this security-sensitive codebase; no pinned model or account configuration. |
| Claude denied generated files unconditionally, conflicting with the task-specific exception in AGENTS.md. | Generated-file avoidance stays in shared instructions; secret-file Read denies remain in settings. |
| Claude preapproved repository-wide formatting. | Remove that allow entry; format changed files explicitly. |
| No regression checks for the verification harness. | `check:harness` exercises large output, exit-code propagation, early stop, missing command and timeout failures. |
| Personal Claude overrides and diagnostic logs could enter source control. | Ignore both; exclude logs from lint/format discovery. |

## Working loop

1. Read status, inspect the working tree, choose one task and its exit criteria.
2. Use the routing table and targeted source/test searches. Read a dependency only when needed.
3. Make a bounded change; run the relevant test file during iteration.
4. Run `pnpm check` after the final change. It runs harness tests, lint, typecheck, application tests, build and bundle checks, in that order. A stage has a five-minute timeout; investigate a timeout instead of declaring success.
5. If a gate fails, search `.agent-logs/run-<id>/<stage>.log` for the first useful diagnostic. Console output includes only the final 30 lines (at most 6,000 characters); the original error may be earlier. Logs are local diagnostics and must not contain real scanned secrets.
6. Update status, roadmap and changelog; distinguish automated checks from live browser or release acceptance.

Use `pnpm --silent check` to also suppress pnpm's script banner. Existing individual scripts still provide full output. Each invocation gets its own log directory, avoiding collisions between concurrent sessions. Skipped stages have no log in that run. Remove old run directories when no longer needed; never infer a passing run from log presence alone.

## Codex and Claude

- Codex loads project configuration for trusted repositories. The app/session or command line may override defaults. Start a new session and inspect its active settings; this change does not reconfigure an already-running conversation.
- Keep model choice local: use low effort for mechanical edits, medium for ordinary changes and high when reviewing security boundaries or difficult failures. Do not lower reasoning solely to make a security review cheaper.
- Claude retains the small `@AGENTS.md` import for compatibility. Inspect `/memory` and `/permissions` in a new session to confirm effective instructions and merged permissions.
- Read denies are tool-level guardrails, not a filesystem sandbox: shell commands can still read files. Neither shared settings nor this audit establishes secret isolation. Preserve user/organization sandbox policy.
- Two focused local skills and one optional reviewer support the workflows below. No new MCP, hooks, dependencies or automatic per-edit gates.
- Global plugins, memory and account settings can add context outside this repository; they were not modified. Actual billed-token savings require comparable before/after sessions. Compact output size is only a proxy.

## Skills and bounded delegation

| Capability | Codex | Claude |
|---|---|---|
| Implement a check family with fixtures and provenance | `$phpusing-check` | `/phpusing-check` |
| Review a task-owned patch | `$phpusing-review` | `/phpusing-review` |
| Independent review role | `.codex/agents/phpusing-reviewer.toml` | `.claude/agents/phpusing-reviewer.md` |

Canonical skill bodies live under `.agents/skills/`; `.claude/skills/` contains relative directory symlinks to the same bodies. Only names/descriptions are used for discovery; bodies and the review contract load when relevant. Keep symlinks intact when checking out the repository. No global skill installation is needed.

Examples: "Use $phpusing-check for VU-01; resolve Q-2 first" in Codex, or "/phpusing-review review only my permission changes" in Claude. Ordinary UI edits do not invoke these skills.

The default is one implementation agent. For substantive boundary changes, one reviewer can inspect a stable patch while the parent runs checks or prepares the handoff. Supply a small delegation packet: goal, acceptance criteria, task-owned diff including untracked files, allowlisted paths, applicable check IDs and test evidence. Do not fork the entire chat or have two writers edit the same files. The parent reconciles findings and runs the final gate. Review-only requests do not authorize fixes.

One pass is normally enough; no recursive agents or approval loops. Claude limits the reviewer to Read/Grep/Glob and 12 turns. Codex inherits the parent model/effort and permits read-only shell inspection when native readers are unavailable. Its scope is instruction-based, not a separate security sandbox; do not assume equivalent tool enforcement. If a role cannot load, the parent may use its contract locally and disclose the lack of independent review. Partial review is not a pass. Preserve the parent verification/handoff responsibility so a child does not run another full gate.

Subagents can reduce main-thread context and latency, but can increase total tokens. Use them for independent work with concrete value, not tiny edits. Model choice stays inherited rather than pinning account-specific names or silently downgrading security review. These limits are workflow guidance, not a billed-token cap.

## Verification and sources

Skill follow-up: both skills passed the bundled skill validator; TOML/frontmatter and shared symlink targets parsed successfully. An independent four-scenario routing evaluation covered UI exclusion, unverified VU-01 claims, scoped permission review and missing-diff handling. Its Codex reader fallback and review-only handoff findings were addressed. The final `pnpm check` passed all six stages on the current shared working tree. This is configuration/scenario evidence, not proof of native custom-agent activation in both apps.

Local tools observed: Codex CLI 0.163.0, Claude Code 2.1.303, Node 24.22.0, pnpm 10.21.0. Local checks do not prove a fresh Claude/Codex session loaded every setting or that Chrome behavior passes manual acceptance.

Validation: `pnpm check` passed all six stages (4 harness tests and 223 application tests), and `git diff --check` passed. Codex CLI accepted configuration loading via `codex features list`; Claude settings parsed as JSON. Fresh interactive-session loading remains unverified. Concurrent F-013 changes were preserved; application counts reflect that shared working tree.

Official references checked for this audit:
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Claude settings and precedence](https://code.claude.com/docs/en/settings)
- [Claude project memory and imports](https://code.claude.com/docs/en/memory)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex skills discovery](https://learn.chatgpt.com/docs/build-skills)
- [Claude subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude skills and symlinks](https://code.claude.com/docs/en/skills)

Commit validation: `pnpm check` passed all six stages in an isolated export of the staged harness snapshot, using the installed dependencies. The shared working-tree run was blocked by an unrelated F-022 report-render purity lint error; those product edits were excluded.
