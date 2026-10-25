# phpusing

**Is your PHP site giving you a headache?** phpusing checks your own PHP website for critical, known security problems, right in your browser. No account, no server, no data collected.

*Pusing* is Indonesian for "headache". The goal is to find the headache before an attacker does.

> Status: planning. Nothing is published yet. See `docs/00_STATUS.md`.

## What it checks

- **Outdated PHP**, including PHP2Shell (October 2026) and end-of-life versions.
- **Exposed secrets and files**: `.env`, `.git`, `composer.lock`, logs, database backups, `phpinfo()`.
- **Debug mode left on**: Laravel Ignition, Whoops, Symfony error pages.
- **Risky admin and dev tools in public**: Telescope, Horizon, Adminer, phpMyAdmin.
- **Known vulnerable packages** from an exposed or uploaded `composer.lock`.

The full list is in `docs/04_CHECKS.md`.

## How it stays private

- All checks run inside your browser. The only site it contacts is the one you scan.
- Vulnerability data is downloaded as one signed file, so nobody learns which packages your site uses.
- Secrets it finds are never shown, saved or sent. You only learn *that* a file is exposed.

See `PRIVACY.md` and `WHAT_WE_NEVER_DO.md`.

## Only scan sites you own

phpusing asks you to confirm that you own or are authorized to test each site. It sends gentle, read-only requests with a strict limit, and never sends attack payloads.

## Languages

English and Bahasa Indonesia, switchable in the popup.

## Development

```bash
pnpm install
pnpm dev        # Chrome with the extension loaded
pnpm check      # lint, typecheck, test, build
```

Contributors and coding agents start with `AGENTS.md`.

## License

To be decided (MIT proposed). See `docs/00_STATUS.md`.
# phpusing
