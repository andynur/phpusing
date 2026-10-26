# Privacy Policy — phpusing

_Effective from version 0.2.0._

phpusing is a browser extension that checks a website you own for known security problems. It is built so that we, the developers, never receive any of your data.

## What we collect

Nothing. phpusing has no server, account, analytics, crash reporting or advertising.

## What the extension does on your device

- **When you click "Check this site"**, it sends a limited number of read-only requests (at most 60) to that site only. These requests are sent without your cookies.
- **It reads cookie names and page markup** on that tab to recognize the platform (for example Laravel or WordPress). It never reads cookie values.
- **Results** are kept in your browser's session memory and are deleted when the browser closes.
- **Settings** (language, theme, the list of sites you allowed, whether local addresses may be checked, whether to check for newer vulnerability data) are stored locally in your browser.
- **A `composer.lock` you pick or drop on the report page** is read and checked inside your browser. It is never uploaded or stored.
- **A PHP version you type in** (when the site hides it) is kept in the page's memory only and is gone when you close the report.

## Vulnerability data download

Besides the checks above, phpusing makes one other kind of request: it downloads vulnerability data from `https://andynur.github.io/phpusing/v1/`, a static file host run by the developer on GitHub Pages.

- It happens when you click **Update now** on the report page, or when you start a check and the data on your device is older than 7 days. You can turn the automatic check off on the report page.
- It always fetches the same whole files (`meta.json`, `advisories.json` and its signature). Nothing about your site, your scan or your settings is sent, so the host cannot tell which software your site uses.
- The file is accepted only if its digital signature matches the key built into the extension; otherwise the data you already have is kept.
- GitHub, as the host, may log the request (for example your IP address) under its own privacy policy. We do not receive these logs.

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
