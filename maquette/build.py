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

# packshots (flacons, coffrets sur fond studio) : cadrés au nombre d'or partout (gold() dans main.js)
PACKSHOT = re.compile(r'-pack(30)?$|^discovery-')
def gold(f):
    """boîte du produit [x0, y0, x1, y1] (fractions de l'image), hauteur/largeur de l'image,
    couleurs des bords gauche puis droit (5 + 5, de haut en bas) pour prolonger le fond"""
    im = Image.open(f).convert('RGB'); w, h = im.size
    W = 180; s = im.resize((W, round(W * h / w)), Image.BOX); H = s.size[1]; px = s.load()
    e = W // 40; cols, rows, edge = [0] * W, [0] * H, []
    for j in range(H):
        l, r = ([sorted(px[i, j][k] for i in rng)[e // 2] for k in range(3)] for rng in (range(e), range(W - e, W)))
        edge.append((l, r))
        for i in range(W):
            # produit : s'écarte de plus de 28 niveaux du fond (interpolé d'un bord à l'autre de la rangée) ;
            # l'ombre portée, plus douce, reste dehors
            c, t = px[i, j], i / (W - 1)
            if max(abs(c[k] - l[k] - (r[k] - l[k]) * t) for k in range(3)) > 28: cols[i] += 1; rows[j] += 1
    xs, ys = [i for i in range(W) if cols[i] > 1], [j for j in range(H) if rows[j] > 1]
    hx = lambda c: '%02x%02x%02x' % tuple(c)
    ed = [edge[round(q * (H - 1))] for q in (0, .25, .5, .75, 1)]
    return [round(xs[0] / W, 3), round(ys[0] / H, 3), round((xs[-1] + 1) / W, 3), round((ys[-1] + 1) / H, 3),
            round(h / w, 4), ' '.join([hx(a) for a, _ in ed] + [hx(b) for _, b in ed])]

IMGW = {}
for f in sorted((root / 'assets/img/v2').glob('*-m.webp')):
    n = f.name[:-7]
    if (f.parent / (n + '.webp')).exists():
        # 3e valeur : empreinte du contenu, ajoutée à l'adresse (?v=) pour qu'une image modifiée
        # ne soit jamais servie depuis l'ancien cache du navigateur
        h = hashlib.md5(f.read_bytes() + (f.parent / (n + '.webp')).read_bytes()).hexdigest()[:8]
        IMGW[n] = [Image.open(f).width, Image.open(f.parent / (n + '.webp')).width, h]
        if PACKSHOT.search(n): IMGW[n].append(gold(f))   # 4e valeur : mesure du packshot
(root / 'assets/js/imgw.js').write_text('/* généré par build.py : largeurs réelles [petite, grande, empreinte, packshot : [x0, y0, x1, y1, h/l, bords]] */\nconst IMGW = ' + __import__('json').dumps(IMGW, separators=(',', ':')) + ';\n', encoding='utf8')

def srcset(name):
    mw, w, h = IMGW.get(name, [900, 1800, ''])[:3]
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
    js = ''.join('<script src="/assets/js/%s?v=%s"></script>\n' % (n, ver('/assets/js/' + n)) for n in ('logo.js', 'imgw.js', 'data.js', 'paiement.js', 'main.js'))
    s3d = '/assets/js/sillage3d.js?v=' + ver('/assets/js/sillage3d.js')     # module importé à la demande (carte d'import)
    out = (head.replace('{{TITLE}}', meta.get('title', 'LIBRERY')).replace('/assets/css/style.css', css).replace('/assets/js/sillage3d.js', s3d)
           + '</head>\n<body data-page="%s" class="%s"%s%s>\n' % (meta.get('page', ''), meta.get('body', ''),
                 (' data-run="%s"' % meta['run']) if meta.get('run') else '', (' data-folio="%s"' % meta['folio']) if meta.get('folio') else '')
           + '<div class="loader" id="loader" aria-hidden="true">' + (root / 'assets/img/v2/logo-librery.svg').read_text() + '<span class="loader__bar"><i></i></span></div>\n'
           + '<div id="site-header"></div>\n<main>\n' + body.rstrip() + '\n</main>\n<div id="site-footer"></div>\n'
           + meta.get('scripts', '').replace('\\n', '\n')
           + js + '</body>\n</html>\n')
    for m in ('chevet3d.js', 'chevet-photo.js'):      # modules du chevet (carte d'import), versionnés eux aussi
        out = out.replace('"/assets/js/%s"' % m, '"/assets/js/%s?v=%s"' % (m, ver('/assets/js/' + m)))
    (root / f.name).write_text(out, encoding='utf8')
    print('ok', f.name)
