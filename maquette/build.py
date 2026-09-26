"""Assemble les pages : src/<page>.html (+ en-tête commun src/_head.html) -> <page>.html
Chaque fichier src commence par une ligne « <!-- title: ... | page: ... | body: ... --> »."""
import re, pathlib, hashlib
root = pathlib.Path(__file__).parent
IMG = '/assets/img/v2/'

def ver(path):
    """empreinte du fichier : force le navigateur à recharger CSS/JS après chaque modification"""
    return hashlib.md5((root / path.lstrip('/')).read_bytes()).hexdigest()[:8]

# vraies largeurs des images (petite / grande) : le srcset doit dire la vérité,
# sinon le navigateur choisit une image trop petite et elle paraît floue
from PIL import Image
IMGW = {}
for f in sorted((root / 'assets/img/v2').glob('*-m.webp')):
    n = f.name[:-7]
    if (f.parent / (n + '.webp')).exists():
        # 3e valeur : empreinte du contenu, ajoutée à l'adresse (?v=) pour qu'une image modifiée
        # ne soit jamais servie depuis l'ancien cache du navigateur
        h = hashlib.md5(f.read_bytes() + (f.parent / (n + '.webp')).read_bytes()).hexdigest()[:8]
        IMGW[n] = [Image.open(f).width, Image.open(f.parent / (n + '.webp')).width, h]
(root / 'assets/js/imgw.js').write_text('/* généré par build.py : largeurs réelles [petite, grande] */\nconst IMGW = ' + __import__('json').dumps(IMGW, separators=(',', ':')) + ';\n', encoding='utf8')

def srcset(name):
    mw, w, h = IMGW.get(name, [900, 1800, ''])
    return f'{IMG}{name}-m.webp?v={h} {mw}w, {IMG}{name}.webp?v={h} {w}w'

def pic(m):
    """{{pic nom|alt|sizes|eager}} -> <img> responsive (nom-m.webp + nom.webp, largeurs réelles)"""
    name, alt, sizes, eager = (m.group(1).split('|') + ['', '(max-width: 900px) 100vw, 50vw', ''])[:4]
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="{IMG}{name}-m.webp?v={IMGW.get(name, [0, 0, ""])[2]}" srcset="{srcset(name)}" '
            f'sizes="{sizes or "(max-width: 900px) 100vw, 50vw"}" alt="{alt}" {load} decoding="async">')
head = (root / 'src/_head.html').read_text(encoding='utf8')
for f in sorted((root / 'src').glob('[!_]*.html')):
    src = f.read_text(encoding='utf8')
    meta = dict(re.findall(r'(\w+):\s*([^|]+?)\s*(?:\||-->)', src.split('\n', 1)[0]))
    body = re.sub(r'\{\{pic ([^}]+)\}\}', pic, src.split('\n', 1)[1])
    body = re.sub(r'(/assets/img/v2/([\w-]+?)(-m)?\.webp)"', lambda m: '%s?v=%s"' % (m.group(1), IMGW.get(m.group(2), [0, 0, ''])[2]), body)
    body = body.replace('{{logo-couverture}}', (root / 'assets/img/v2/logo-couverture.svg').read_text()).replace('{{logo}}', (root / 'assets/img/v2/logo-librery.svg').read_text())
    css = '/assets/css/style.css?v=' + ver('/assets/css/style.css')
    js = ''.join('<script src="/assets/js/%s?v=%s"></script>\n' % (n, ver('/assets/js/' + n)) for n in ('logo.js', 'imgw.js', 'data.js', 'main.js'))
    out = (head.replace('{{TITLE}}', meta.get('title', 'LIBRERY')).replace('/assets/css/style.css', css)
           + '</head>\n<body data-page="%s" class="%s"%s%s>\n' % (meta.get('page', ''), meta.get('body', ''),
                 (' data-run="%s"' % meta['run']) if meta.get('run') else '', (' data-folio="%s"' % meta['folio']) if meta.get('folio') else '')
           + '<div id="site-header"></div>\n<main>\n' + body.rstrip() + '\n</main>\n<div id="site-footer"></div>\n'
           + meta.get('scripts', '').replace('\\n', '\n')
           + js + '</body>\n</html>\n')
    (root / f.name).write_text(out, encoding='utf8')
    print('ok', f.name)
