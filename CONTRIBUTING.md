# Contributing

Thanks for helping site owners sleep better.

1. Read `AGENTS.md` (rules apply to humans too) and `WHAT_WE_NEVER_DO.md`.
2. New check? Add its row to `docs/04_CHECKS.md` first, then the pure function, positive and negative fixtures, and `en`/`id` strings.
3. Run `pnpm check` before opening a pull request.
4. Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
5. Fixtures must be synthetic. Never commit real secrets, logs or lock files from real sites.

Pull requests that add payloads, bulk scanning, typed-URL scanning or telemetry will be closed (see `docs/09_DECISIONS.md`).
