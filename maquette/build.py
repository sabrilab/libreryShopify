"""Assemble les pages : src/<page>.html (+ en-tête commun src/_head.html) -> <page>.html
Chaque fichier src commence par une ligne « <!-- title: ... | page: ... | body: ... --> »."""
import re, pathlib
root = pathlib.Path(__file__).parent
IMG = '/assets/img/v2/'

def pic(m):
    """{{pic nom|alt|sizes|eager}} -> <img> responsive (nom-m.webp 900w + nom.webp 1800w)"""
    name, alt, sizes, eager = (m.group(1).split('|') + ['', '(max-width: 900px) 100vw, 50vw', ''])[:4]
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="{IMG}{name}-m.webp" srcset="{IMG}{name}-m.webp 900w, {IMG}{name}.webp 1800w" '
            f'sizes="{sizes or "(max-width: 900px) 100vw, 50vw"}" alt="{alt}" {load} decoding="async">')
head = (root / 'src/_head.html').read_text(encoding='utf8')
for f in sorted((root / 'src').glob('[!_]*.html')):
    src = f.read_text(encoding='utf8')
    meta = dict(re.findall(r'(\w+):\s*([^|]+?)\s*(?:\||-->)', src.split('\n', 1)[0]))
    body = re.sub(r'\{\{pic ([^}]+)\}\}', pic, src.split('\n', 1)[1])
    body = body.replace('{{logo-couverture}}', (root / 'assets/img/v2/logo-couverture.svg').read_text()).replace('{{logo}}', (root / 'assets/img/v2/logo-librery.svg').read_text())
    out = (head.replace('{{TITLE}}', meta.get('title', 'LIBRERY'))
           + f'</head>\n<body data-page="{meta.get("page", "")}" class="{meta.get("body", "")}">\n'
           + '<div id="site-header"></div>\n<main>\n' + body.rstrip() + '\n</main>\n<div id="site-footer"></div>\n'
           + meta.get('scripts', '').replace('\\n', '\n')
           + '<script src="/assets/js/logo.js"></script>\n<script src="/assets/js/data.js"></script>\n<script src="/assets/js/main.js"></script>\n</body>\n</html>\n')
    (root / f.name).write_text(out, encoding='utf8')
    print('ok', f.name)
