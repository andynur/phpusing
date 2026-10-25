# Privacy Policy — phpusing

_Draft. Effective on first public release._

phpusing is a browser extension that checks a website you own for known security problems. It is built so that we, the developers, never receive any of your data.

## What we collect

Nothing. phpusing has no server, account, analytics, crash reporting or advertising.

## What the extension does on your device

- **When you click "Check this site"**, it sends a limited number of read-only requests (at most 60) to that site only. These requests are sent without your cookies.
- **It reads cookie names and page markup** on that tab to recognize the platform (for example Laravel or WordPress). It never reads cookie values.
- **Results** are kept in your browser's session memory and are deleted when the browser closes.
- **Settings** (language, theme, the list of sites you authorized, data version) are stored locally in your browser.

## The only other network request

To stay current, the extension downloads one signed vulnerability data file from `<data host, to be set>`. The whole file is downloaded, so the host cannot tell which software your site uses. Like any web request, the host sees your IP address in its access logs. You can turn automatic data checks off in settings.

## Sensitive files

If phpusing finds a public secret file (for example `.env`), it reports only that the file is reachable and the names of the keys inside. Values are never shown, stored or transmitted.

## Permissions

| Permission | Why |
|---|---|
| Active tab, scripting | Read platform markers on the page you are checking |
| Storage | Save your settings and keep results until the browser closes |
| Site access (asked per site) | Send the check requests to that one site |

## Contact

Open an issue at `<GitHub repository URL, to be set>`.
