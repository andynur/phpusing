# Privacy Policy — phpusing

_Effective from version 0.1.0._

phpusing is a browser extension that checks a website you own for known security problems. It is built so that we, the developers, never receive any of your data.

## What we collect

Nothing. phpusing has no server, account, analytics, crash reporting or advertising.

## What the extension does on your device

- **When you click "Check this site"**, it sends a limited number of read-only requests (at most 60) to that site only. These requests are sent without your cookies.
- **It reads cookie names and page markup** on that tab to recognize the platform (for example Laravel or WordPress). It never reads cookie values.
- **Results** are kept in your browser's session memory and are deleted when the browser closes.
- **Settings** (language, the list of sites you allowed, whether local addresses may be checked) are stored locally in your browser.

## No other network requests

Version 0.1 makes no request other than the checks above. Vulnerability data is bundled inside the extension and updated with each release. If a later version adds a data download, it will fetch one whole signed file, so the host cannot tell which software your site uses, and this policy will be updated first.

## Sensitive files

If phpusing finds a public secret file (for example `.env`), it reports only that the file is reachable and the names of the keys inside. Values are never shown, stored or transmitted.

## Permissions

| Permission | Why |
|---|---|
| Active tab, scripting | Read platform markers on the page you are checking |
| Storage | Save your settings and keep results until the browser closes |
| Site access (asked per site) | Send the check requests to that one site |

## Contact

Open an issue at https://github.com/andynur/phpusing/issues.
