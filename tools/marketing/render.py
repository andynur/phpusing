#!/usr/bin/env python3
"""Render marketing layouts around the built UI. Standard library + Chrome only."""
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/marketing'
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
COPY = {
    'en': {
        'headline': 'Less guessing.<br>Clearer next steps.',
        'sub': 'Security checks for your PHP site.<br>Plain language. Right in your browser.',
        'tag': 'Your PHP site. A clearer picture.',
        'features': 'Free & open source · English / Bahasa Indonesia',
        'sample': 'Actual UI · Synthetic example data',
        'shots': [
            ('Start with<br>your permission.', 'Check the site in your active tab.<br>You choose when to start.', '01 / YOUR SITE, YOUR CALL'),
            ('A bounded check.<br>Visible progress.', 'At most 60 read-only requests.<br>No attacks. No login attempts.', '02 / CHECK WITH CARE'),
            ('Know what needs<br>your attention.', 'A clear verdict and priority findings,<br>explained in everyday language.', '03 / SEE THE PRIORITIES'),
            ('From finding<br>to next step.', 'See the evidence, understand the impact,<br>and copy a message for your developer.', '04 / MAKE IT ACTIONABLE'),
            ('Your browser.<br>Your controls.', 'Manage allowed sites and appearance.<br>No account. No tracking.', '05 / STAY IN CONTROL'),
        ],
    },
    'id': {
        'headline': 'Kurangi menebak.<br>Perjelas langkah.',
        'sub': 'Cek keamanan situs PHP Anda.<br>Bahasa sederhana. Langsung di browser.',
        'tag': 'Situs PHP Anda. Gambaran lebih jelas.',
        'features': 'Gratis & sumber terbuka · English / Bahasa Indonesia',
        'sample': 'UI aktual · Data contoh sintetis',
        'shots': [
            ('Mulai dengan<br>izin Anda.', 'Periksa situs di tab aktif.<br>Anda yang menentukan kapan mulai.', '01 / SITUS ANDA, PILIHAN ANDA'),
            ('Pemeriksaan terbatas.<br>Progres terlihat.', 'Maksimal 60 permintaan baca saja.<br>Tanpa serangan atau percobaan login.', '02 / PERIKSA DENGAN CERMAT'),
            ('Ketahui yang perlu<br>Anda perhatikan.', 'Hasil jelas dan temuan prioritas,<br>dijelaskan dengan bahasa sehari-hari.', '03 / LIHAT PRIORITASNYA'),
            ('Dari temuan<br>ke langkah lanjut.', 'Lihat bukti, pahami dampaknya,<br>lalu salin pesan untuk developer Anda.', '04 / TINDAK LANJUTI TEMUAN'),
            ('Browser Anda.<br>Kendali Anda.', 'Atur situs yang diizinkan dan tampilan.<br>Tanpa akun. Tanpa pelacakan.', '05 / TETAP PEGANG KENDALI'),
        ],
    },
}
CSS = '''
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}
body{font-family:Arial,Helvetica,sans-serif;background:#F7F6F2;color:#1C1B22}
.brand{display:flex;align-items:center;gap:12px;font-size:32px;font-weight:750;letter-spacing:-1.5px}.brand img{width:54px;height:54px}
.eyebrow{font-size:14px;letter-spacing:2px;font-weight:700;color:#5B45D6;margin-bottom:26px}
h1{font-size:53px;line-height:1.08;letter-spacing:-2px;margin:0 0 26px;font-weight:750}p{font-size:21px;line-height:1.55;color:#55535E;margin:0}
footer{position:absolute;left:56px;right:56px;bottom:32px;display:flex;justify-content:space-between;font-size:13px;color:#6B6975}
.top{position:absolute;left:56px;top:38px}.copy{position:absolute;left:56px;top:250px;width:485px}
.stage{position:absolute;left:575px;top:130px;width:649px;height:600px;background:#EFEEEA;border:1px solid #E3E1DA;border-radius:28px;display:flex;align-items:center;justify-content:center}
iframe{border:0;display:block;background:#F7F6F2}.popup{width:380px;height:600px;border-radius:16px;box-shadow:0 16px 48px #1c1b221c}
.report{width:800px;height:680px;transform:scale(.78);transform-origin:center;flex-shrink:0;border-radius:16px;box-shadow:0 16px 48px #1c1b221c}
.pill{display:inline-block;border:1px solid #E3E1DA;border-radius:30px;padding:10px 16px;font-size:14px;margin-top:30px;color:#5B45D6}
.hero .copy{top:175px;width:720px}.hero h1{font-size:66px}.hero .large-mark{position:absolute;width:300px;height:300px;right:80px;top:150px}
.hero .orb{position:absolute;width:480px;height:480px;border:1px solid #d9d2f7;border-radius:50%;right:-10px;top:60px;box-shadow:0 0 0 45px #eeebfa,0 0 0 46px #ded8f4}
.hero footer{bottom:36px}.hero.marquee .copy{top:150px}.hero.marquee .large-mark{right:100px;top:125px}.hero.marquee .orb{right:10px;top:35px}
.tile{background:#5B45D6;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.tile .brand{font-size:44px;gap:10px}.tile .brand img{width:92px;height:92px}.tile p{font-size:18px;line-height:1.4;color:#fff;max-width:350px;margin-top:16px}
.neutral{background:#5B45D6;color:white;display:flex;align-items:center;justify-content:center}.neutral .brand{font-size:120px;gap:30px}.neutral .brand img{width:240px;height:240px}.neutral.small .brand{font-size:48px;gap:8px}.neutral.small .brand img{width:100px;height:100px}
'''


def document(body, classes='', lang='en'):
    return f'<!doctype html><html lang="{lang}"><meta charset="utf-8"><title>phpusing marketing</title><style>{CSS}</style><body class="{classes}">{body}</body></html>'


def brand():
    return '<div class="brand"><img src="/mark.svg" alt="">phpusing</div>'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    if not (ROOT / '.output/chrome-mv3/popup.html').exists():
        raise SystemExit('Run pnpm build first.')
    OUT.mkdir(exist_ok=True)
    assets = []
    with tempfile.TemporaryDirectory(prefix='phpusing-marketing-') as work:
        work = Path(work)
        site = work / 'site'
        shutil.copytree(ROOT / '.output/chrome-mv3', site)
        shutil.copy(ROOT / 'tools/icons/mark.svg', site / 'mark.svg')
        # Reuse synthetic fixtures without changing the existing raw screenshot harness.
        stub = (ROOT / 'tools/store-shots/stub.js').read_text()
        stub = stub.replace("settings: { lang }", "settings: { lang, theme: q.get('theme') || 'light' }")
        stub = stub.replace("if (location.pathname.includes('popup'))", "if (false)")
        (site / 'stub.js').write_text(stub)
        for page in ('popup', 'report'):
            path = site / f'{page}.html'
            path.write_text(path.read_text().replace('<head>', '<head><script src="/stub.js"></script>'))
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(site)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}'

        def render(name, width, height, body, classes='', lang='en', transparent=False):
            page = site / f'{name}.html'
            page.write_text(document(body, classes, lang))
            dest = OUT / f'{name}.png'
            subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                            '--no-first-run', '--no-default-browser-check', '--force-device-scale-factor=1',
                            f'--user-data-dir={work / "profile"}', f'--window-size={width},{height}',
                            '--virtual-time-budget=5000',
                            '--default-background-color=' + ('00000000' if transparent else 'ffffffff'),
                            f'--screenshot={dest}', f'{base}/{name}.html'], check=True, capture_output=True)
            data = dest.read_bytes()
            actual = struct.unpack('>II', data[16:24])
            if actual != (width, height):
                raise RuntimeError(f'{name}: unexpected dimensions {actual}')
            assets.append({'file': dest.name, 'width': width, 'height': height, 'locale': lang})
            print(f'{name}: {width}x{height}', flush=True)

        try:
            for lang, c in COPY.items():
                for i, (title, sub, label) in enumerate(c['shots'], 1):
                    page = 'popup' if i < 4 else 'report'
                    theme = 'dark' if i == 5 else 'light'
                    url = f'/{page}.html?shot={i}&lang={lang}&theme={theme}&tab=7&origin=https%3A%2F%2Fshop.example.com'
                    body = f'''<div class="top">{brand()}</div><div class="copy"><div class="eyebrow">{label}</div><h1>{title}</h1><p>{sub}</p><span class="pill">English / Bahasa Indonesia</span></div><div class="stage"><iframe title="phpusing {page}" class="{page}" src="{url}"></iframe></div><footer><span>phpusing / v0.1</span><span>{c['sample']}</span></footer>'''
                    render(f'{lang}-store-{i:02}', 1280, 800, body, lang=lang)
                for name, width, height in [('readme', 1400, 560), ('social', 1200, 630)]:
                    body = f'''<div class="orb"></div><div class="top">{brand()}</div><div class="copy"><h1>{c['headline']}</h1><p>{c['sub']}</p></div><img class="large-mark" src="/mark.svg" alt=""><footer><span>{c['features']}</span><span>github.com/andynur/phpusing</span></footer>'''
                    render(f'{lang}-{name}', width, height, body, 'hero marquee' if name == 'readme' else 'hero', lang)
                render(f'{lang}-promo-small', 440, 280, brand() + f'<p>{c["tag"]}</p>', 'tile', lang)
                body = f'<div class="orb"></div><div class="top">{brand()}</div><div class="copy"><h1>{c["headline"]}</h1><p>{c["sub"]}</p></div><img class="large-mark" src="/mark.svg" alt="">'
                render(f'{lang}-promo-marquee', 1400, 560, body, 'hero marquee', lang)
            render('store-promo-small', 440, 280, brand(), 'neutral small', 'en')
            render('store-promo-marquee', 1400, 560, brand(), 'neutral', 'en')
            # The source tile spans x/y 8..120; fit it to the store's 96 px artwork area.
            mark = (ROOT / 'tools/icons/mark.svg').read_text()
            store_mark = mark.replace('viewBox="0 0 128 128"', 'viewBox="-10.666667 -10.666667 149.333334 149.333334"', 1)
            (site / 'store-icon.svg').write_text(store_mark)
            render('store-icon-128', 128, 128, '<style>body{background:transparent}img{display:block}</style><img width="128" height="128" src="/store-icon.svg" alt="">', transparent=True)
            shutil.copy(ROOT / 'tools/icons/mark.svg', OUT / 'mark.svg')
            for variant, color in [('light', '#1C1B22'), ('dark', '#ECEBF0')]:
                inner = mark[mark.index('>') + 1:mark.rindex('</svg>')]
                svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="128" viewBox="0 0 600 128"><svg width="128" height="128" viewBox="0 0 128 128">{inner}</svg><text x="148" y="86" font-family="Arial,Helvetica,sans-serif" font-size="76" font-weight="700" letter-spacing="-3" fill="{color}">phpusing</text></svg>'
                (OUT / f'wordmark-{variant}.svg').write_text(svg)
        finally:
            server.shutdown()
    (OUT / 'manifest.json').write_text(json.dumps(assets, indent=2) + '\n')
    cards = ''.join(f'<figure><img loading="lazy" src="{a["file"]}" alt="{a["file"]}"><figcaption>{a["file"]} · {a["width"]} × {a["height"]}</figcaption></figure>' for a in assets)
    (OUT / 'index.html').write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>phpusing brand kit</title><style>body{{margin:40px;background:#F7F6F2;color:#1C1B22;font:16px Arial}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px}}figure{{margin:0}}img{{width:100%;height:auto;border-radius:8px}}figcaption{{padding:12px 0}}a{{color:#5B45D6}}</style><h1>phpusing / Brand & marketing kit</h1><p>v0.1 · English / Bahasa Indonesia · Actual UI with synthetic data</p><p><a href="README.md">Asset guide</a> · <a href="COPY.md">Marketing copy</a></p><main>{cards}</main></html>')


if __name__ == '__main__':
    main()
