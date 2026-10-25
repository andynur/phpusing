# Chrome Web Store listing (v0.1)

Copy into the developer dashboard. Rules: owner-focused, detection-only wording, never "safe" (AGENTS.md rule 8).

## Single purpose

Check your own PHP website for known security problems.

## Name and summary (132 characters max)

| | EN | ID |
|---|---|---|
| Name | phpusing — PHP site security check | phpusing — pemeriksaan keamanan situs PHP |
| Summary | Find out if your PHP site has a headache: exposed files, debug mode and PHP2Shell, checked locally in your browser. | Cek apakah situs PHP Anda bikin pusing: file terbuka, debug mode, dan PHP2Shell, diperiksa lokal di browser Anda. |

## Description (EN)

phpusing tells you, in plain language, whether your PHP website has critical, known security problems.

Open your site, click the phpusing icon and press "Check this site". You get a verdict and a short list of what to fix:

- Public secret files: .env, .git, composer.lock, Laravel logs, backups and database dumps
- Debug mode, phpinfo pages, Laravel Ignition, Telescope and Horizon, Adminer and phpMyAdmin
- PHP versions affected by PHP2Shell (CVE-2026-109618, CVE-2026-109619) or past end of life
- Plain HTTP and directory listing

Every finding has a "Copy message for developer" button in English or Indonesian.

Built for site owners:
- Checks only the site in your current tab, after you confirm you own it or may test it.
- At most 60 read-only requests. No attacks, no logins, no form submits.
- Secret values are never shown or stored; only key names.
- No server, no account, no tracking. Results stay in your browser's memory.

phpusing cannot see logic bugs, private admin areas or server settings that are not exposed. A calm result is not a guarantee.

Open source: https://github.com/andynur/phpusing

## Description (ID)

phpusing memberi tahu Anda, dengan bahasa sederhana, apakah situs PHP Anda punya masalah keamanan kritis yang sudah dikenal.

Buka situs Anda, klik ikon phpusing, lalu tekan "Periksa situs ini". Anda mendapat hasil dan daftar singkat yang perlu diperbaiki:

- File rahasia yang terbuka: .env, .git, composer.lock, log Laravel, backup, dan dump database
- Debug mode, halaman phpinfo, Laravel Ignition, Telescope dan Horizon, Adminer dan phpMyAdmin
- Versi PHP yang terdampak PHP2Shell (CVE-2026-109618, CVE-2026-109619) atau sudah habis masa dukungannya
- HTTP tanpa enkripsi dan daftar isi folder yang terbuka

Setiap temuan punya tombol "Salin pesan untuk developer" dalam bahasa Inggris atau Indonesia.

Dibuat untuk pemilik situs:
- Hanya memeriksa situs di tab aktif, setelah Anda menyatakan memiliki situs itu atau punya izin mengujinya.
- Paling banyak 60 permintaan baca saja. Tanpa serangan, tanpa login, tanpa mengirim formulir.
- Nilai rahasia tidak pernah ditampilkan atau disimpan; hanya nama key.
- Tanpa server, tanpa akun, tanpa pelacakan. Hasil tetap di memori browser Anda.

phpusing tidak bisa melihat bug logika, area admin privat, atau pengaturan server yang tidak terbuka. Hasil tenang bukan jaminan.

Open source: https://github.com/andynur/phpusing

## Permission justifications

| Permission | Justification |
|---|---|
| `activeTab` | Read platform markers (cookie names, generator tag, asset paths) on the page the user clicked from. |
| `scripting` | Run the single marker-reading function in that tab. |
| `storage` | Save language and allowed sites locally; keep scan results in session memory only. |
| Optional host access (`http://*/*`, `https://*/*`) | Requested at runtime for exactly one origin, after the user's consent, to send at most 60 read-only check requests. |
| Remote code | None. |

## Privacy practices form

- Data collected: none.
- Privacy policy URL: https://github.com/andynur/phpusing/blob/main/PRIVACY.md

## Category and language

- Category: Developer Tools.
- Languages: English, Indonesian.

## Screenshots and promotional assets

Use the [brand and marketing kit](../marketing/README.md): five composed 1280 × 800 screenshots per locale, README headers, social cards, shared store promo tiles, localized campaign alternatives, and a padded store icon. [Marketing copy](../marketing/COPY.md) includes EN/ID announcements and alt text.

Upload `docs/marketing/en-store-01.png` through `en-store-05.png` to the English listing, and the matching `id-*` files to Indonesian. Sequence: consent, progress, priority findings, expanded report, settings in dark mode. The actual built UI uses synthetic example data; no live site is scanned to produce these images.

Use the shared `store-promo-small.png` (440 × 280) and `store-promo-marquee.png` (1400 × 560) for promo slots, which Google's guidance describes as not locale-specific. See the kit guide for source links, icon packaging notes and regeneration.

Original raw light-theme screenshots remain in `docs/store/screenshots/`, generated with `pnpm build && tools/store-shots/shots.sh`.
