---
name: phpusing-review
description: Review a bounded phpusing patch for security regressions, false findings, missing integration and test gaps. Use for requested code review or a substantive change to scanner, redaction, permission, advisory or verdict behavior.
---

# Review a bounded patch

Follow `AGENTS.md`. Review only the task-owned diff, including relevant untracked files, and dependencies needed to understand it. Do not review or modify unrelated worktree changes.

## Parent workflow

Choose local review for small patches. For a substantive security change or an explicitly requested independent review, delegate to one `phpusing-reviewer` only when useful parent work can proceed independently (for example, running checks or preparing the handoff). If delegation is unavailable, apply the same review contract locally and disclose that it was not independent.

Give the reviewer the goal, acceptance criteria, exact changed-file allowlist, task-owned diff, relevant check IDs/doc sections and existing test results. Include untracked-file contents or readable paths. Keep the patch stable during review. With shared files, include only task-owned hunks. Prefer fresh context over copying the conversation. On Codex use the custom reviewer role when available; otherwise pass its instructions explicitly to a generic child. Claude uses the same-named agent.

Read `references/review-contract.md` for the review criteria. Include the short contract in the delegation packet when the child cannot open it directly. The child does not edit files, run gates, update handoff documents or delegate. The parent owns fixes and verification. One review pass by default; follow up only to resolve a concrete finding, never an automatic "review until approved" loop. A partial review is not a pass.

## Reviewer or local-review workflow

Apply [the review contract](references/review-contract.md). If you are already a delegated reviewer, perform it directly; do not delegate again. Report evidence and limits, not an approval badge. A review-only request ends with findings and does not authorize fixes or live scans.
