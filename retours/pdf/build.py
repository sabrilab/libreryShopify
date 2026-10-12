"""PDF « Vos retours, appliqués » pour Nolwenn (LIBRERY) : retours WhatsApp du 12/10/2026 et envois du jour
(prix, film Skin Obsession, liste des boutiques).

1. node shots.cjs https://librery-refonte.vercel.app avant   (site en ligne AVANT la mise en ligne des corrections)
   node shots.cjs <maquette corrigée> apres                  (http://localhost:4173, ou le site en ligne une fois publié)
2. python3 build.py   → recadre les captures dans img/, écrit retours.html
3. node render.cjs    → LIBRERY-retours-12-octobre.pdf

Pages 1600 × 900 (16/9), même écriture que le PDF de livraison (livraison/livraison.css)."""
import json, pathlib, html, re, shutil
from PIL import Image

root = pathlib.Path(__file__).parent
LIV = root.parent.parent / 'livraison'
URL = 'https://librery-refonte.vercel.app'
R = {k: json.loads((root / k / 'rects.json').read_text()) for k in ('avant', 'apres')}
(root / 'img').mkdir(exist_ok=True)
DSF = 2
FRAMES = pathlib.Path('/tmp/claude-501/video/frames')   # images du film extraites avec ffmpeg (1, 6, 9, 14 et 19 s)


def crop(state, view, box, name, maxw=1800, dsf=DSF):
    """box en px CSS (x0, y0, x1, y1) ; enregistre img/<name>-<state>.jpg"""
    im = Image.open(root / state / f'{view}.png').convert('RGB')
    x0, y0, x1, y1 = [round(v * dsf) for v in box]
    x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(im.width, x1), min(im.height, y1)
    im = im.crop((x0, y0, x1, y1))
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    out = f'img/{name}-{state}.jpg'; im.save(root / out, quality=88)
    return out, im.size


def union(rs, pad=0):
    return (min(r['x'] for r in rs) - pad, min(r['y'] for r in rs) - pad,
            max(r['x'] + r['w'] for r in rs) + pad, max(r['y'] + r['h'] for r in rs) + pad)


def both(view, boxfn, name, **kw):
    return {s: crop(s, view, boxfn(R[s][view], s), name, **kw) for s in ('avant', 'apres')}


# ------------------------------------------------------------------ recadrages
SH = {}
SH['services'] = both('services', lambda r, s: union(r['items'], 34), 'services')
SH['menu'] = both('menu', lambda r, s: (0, r['header']['y'], r['mega']['x'] + r['mega']['w'] + 48, r['mega']['y'] + r['mega']['h'] + 36), 'menu')
SH['cart'] = both('cart', lambda r, s: (r['cart']['x'], 330, 1440, 560), 'cart')
SH['band'] = both('offrir', lambda r, s: union([r['band']], 24), 'band')
SH['mosaic'] = both('summer', lambda r, s: (r['mosaic']['x'] - 20, r['mosaic']['y'] + r['mosaic']['h'] * .45, r['mosaic']['x'] + r['mosaic']['w'] * .62, r['mosaic']['y'] + r['mosaic']['h'] + 60), 'mosaic')
SH['herofig'] = both('home', lambda r, s: (780, 560, 1440, 900), 'herofig')
SH['collhero'] = both('skin', lambda r, s: (0, r['sections'][0]['y'] + r['sections'][0]['h'] - 210, 1440, r['sections'][0]['y'] + r['sections'][0]['h'] + 24), 'collhero')
SH['manifeste'] = both('preface', lambda r, s: (r['manifeste']['x'] - 40, r['manifeste']['y'] - 70, 1380, r['manifeste']['y'] + 330), 'manifeste')
SH['toc'] = both('home', lambda r, s: (r['toc']['x'] - 30, r['toc']['y'] - 30, r['toc']['x'] + r['toc']['w'] + 30, r['toc']['y'] + r['toc']['h'] + 30), 'toc')
SH['crumbs'] = both('pdp100', lambda r, s: (r['crumbs']['x'] - 30, r['crumbs']['y'] - 30, r['crumbs']['x'] + r['crumbs']['w'] + 30, r['crumbs']['y'] + 210), 'crumbs')
SH['sizes'] = both('pdp100', lambda r, s: (r['sizes']['x'] - 30, r['sizes']['y'] - 30, r['sizes']['x'] + r['sizes']['w'] + 30, r['sizes']['y'] + r['sizes']['h'] + 76), 'sizes')
SH['coffret'] = both('coffret', lambda r, s: (r['crumbs']['x'] - 30, r['crumbs']['y'] - 24, 1440, r['crumbs']['y'] + 440), 'coffret')
SH['hero'] = both('skinhero', lambda r, s: (0, 0, 1440, 900), 'hero')
SH['carte'] = both('carte', lambda r, s: (0, 0, 1440, 900), 'carte')
SH['mcarte'] = {'apres': crop('apres', 'm-carte', (0, 0, 390, 844), 'mcarte', maxw=780, dsf=3)}


def gallery(r, s):
    f = r['figs']
    return (f[0]['x'], f[0]['y'], f[0]['x'] + f[0]['w'], f[1]['y'] + f[1]['h'])


SH['g100'] = both('pdp100', gallery, 'g100', maxw=900)
SH['g30'] = {'apres': crop('apres', 'pdp30', gallery(R['apres']['pdp30'], 'apres'), 'g30', maxw=900)}
SH['m30'] = {'apres': crop('apres', 'm-pdp30', (0, 0, 390, 844), 'm30', maxw=780, dsf=3)}

FILM = []
for t in (1, 6, 9, 14, 19):
    src = FRAMES / f'f{t}.jpg'
    if src.exists():
        shutil.copy(src, root / 'img' / f'film-{t}.jpg'); FILM.append(f'img/film-{t}.jpg')


# plan de la page Skin Obsession : pleine page réduite + repères des blocs
def plan(state):
    r = R[state]['skin']; sec = r['sections']
    bottom = max(x['y'] + x['h'] for x in sec)
    path, size = crop(state, 'skin', (0, 0, 1440, bottom), 'plan', maxw=720)
    marks = [('Ouverture', sec[0]), ('Introduction', sec[1])]
    par = sec[2]
    tiles = union(r['tiles']) if r['tiles'] else None
    in_grid = tiles and tiles[1] > par['y'] and tiles[3] <= par['y'] + par['h'] + 2
    if in_grid:
        marks += [('Les parfums', {'y': par['y'], 'h': tiles[1] - par['y']}), ('Les 3 tuiles', {'y': tiles[1], 'h': tiles[3] - tiles[1]})]
    else:
        marks.append(('Les parfums', par))
    if r['mosaic']: marks.append(('La mosaïque', {'y': r['mosaic']['y'] - 40, 'h': r['mosaic']['h'] + 80}))
    if r['chapters']: marks.append(('Les textes', {'y': r['chapters']['y'] - 40, 'h': r['chapters']['h'] + 80}))
    if tiles and not in_grid: marks.append(('Les 3 tuiles', {'y': tiles[1] - 40, 'h': tiles[3] - tiles[1] + 80}))
    return path, size, bottom, marks


PLAN = {s: plan(s) for s in ('avant', 'apres')}

# ------------------------------------------------------------------ mise en page
LOGO = (LIV / 'img/logo.svg').read_text()
LOGO_P = (LIV / 'img/logo-paris.svg').read_text()
pages = []
esc = html.escape


def page(body, cls='', num=True):
    n = len(pages) + 1
    chrome = f'<div class="foot"><span>LIBRERY · Vos retours du 12 octobre</span><span>{n:02d}</span></div>' if num else ''
    pages.append(f'<section class="pg {cls}">{chrome}{body}</section>')


def head(n, t, sub=''):
    return f'<header class="hd"><span class="hd__n">{n}</span><h2>{t}</h2><p>{sub}</p></header>'


def quote(q, src):
    return f'<blockquote class="q"><p>« {esc(q)} »</p><cite>{esc(src)}</cite></blockquote>'


def browser(img, x, y, w, href='/'):
    return f'''<a class="br" href="{URL}{href}" style="left:{x}px;top:{y}px;width:{w}px;font-size:{w / 1000 * 16:.2f}px"><span class="br__bar"><i></i><i></i><i></i>
      <span class="br__url">librery-refonte.vercel.app</span></span><span class="br__scr"><img src="{img}"></span></a>'''


def phone(img, x, y, outer, href='/'):
    inner = outer / (1 + 2 * 9 / 290)
    return f'<a class="ph" href="{URL}{href}" style="left:{x}px;top:{y}px;width:{inner:.1f}px;font-size:{inner / 290 * 16:.2f}px"><span class="ph__scr"><img src="{img}"><span class="ph__island"></span></span></a>'


def shot(img, label, cls='', href='', note=''):
    """les captures « Avant » ne sont pas cliquables : le site en ligne montre désormais l'après"""
    path, (w, h) = img
    tag = 'a' if label == 'Avant' else 'b'
    inner = f'<img src="{path}" style="aspect-ratio:{w}/{h}">'
    box = f'<a class="sh__img" href="{URL}{href}">{inner}</a>' if href and label != 'Avant' else f'<span class="sh__img">{inner}</span>'
    return f'''<figure class="sh {cls}"><figcaption><b class="tag tag--{tag}">{label}</b>{f'<span>{note}</span>' if note else ''}</figcaption>{box}</figure>'''


def pair(key, href='', notes=('', ''), cls=''):
    return f'<div class="pair {cls}">{shot(SH[key]["avant"], "Avant", note=notes[0])}{shot(SH[key]["apres"], "Après", href=href, note=notes[1])}</div>'


def done(items):
    return '<ul class="done">' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'


def change(n, title, sub, q, src, body, items, cls='', extra=''):
    page(head(n, title, sub) + f'''<div class="ch">
      <aside class="ch__side">{quote(q, src) if q else ''}{done(items)}{extra}</aside>
      <div class="ch__main">{body}</div></div>''', cls)


def ask(t):
    return f'<p class="ask">{t}</p>'


# ---------------------------------------------------------------- couverture
page(f'''
  <div class="cover">
    <p class="kick">Site internet · 12 octobre 2026</p>
    <div class="cover__mark">{LOGO}</div>
    <p class="cover__sub">Vos retours,<br>appliqués.</p>
    <p class="cover__lead">Chacune de vos demandes sur le site, avec l’écran avant et après.<br>Et ce que vous nous avez envoyé : les prix, le film, les boutiques.</p>
    <a class="cta" href="{URL}">Voir le site <span>↗</span></a>
  </div>
  {browser(SH['hero']['apres'][0], 640, 205, 830, '/collection?c=skin-obsession')}
  {phone(SH['m30']['apres'][0], 1290, 300, 236, '/produit?p=vanilla-plum')}''', 'dark', num=False)

# ---------------------------------------------------------------- sommaire
TOC = [
    ('Services : trois engagements retirés, « 24 h ouvrées »', 'Vocaux 15:25 et 15:26'),
    ('L’écrin et le mot manuscrit, à valider', 'Vocal 15:25'),
    ('La page Bougies mise en pause', 'Vocal 15:27'),
    ('Skin Obsession : les trois tuiles en fin de page', 'Vidéos 15:28'),
    ('Les petites légendes « fig. » retirées', 'Photo et vocal 15:30'),
    ('Les renvois aux pages du catalogue retirés', 'Photos et vocaux 15:30–15:31'),
    ('Fiche produit : la photo suit le format choisi', 'Vidéo 15:33'),
    ('Vos prix', 'Message 17:14'),
    ('Le film Skin Obsession en ouverture', 'Vidéo reçue le 12/10'),
    ('Les vingt-cinq points de vente', 'Liste reçue le 12/10'),
]
page(f'''
  <div class="glance">
    <div>
      <p class="kick">Ce qui a changé</p>
      <h1>Sept retours,<br>trois envois.</h1>
      <p class="lead">Tout ce que vous nous avez signalé le 12 octobre est appliqué, avec ce que vous nous avez envoyé dans la journée.
      Chaque page montre l’écran avant et après, avec vos mots.</p>
      <p class="lead muted">Summer Vibes et le haut de la page Skin Obsession, que vous avez validés, gardent leur mise en page : seules les petites mentions (« fig. », « p. ») y disparaissent, comme partout.</p>
    </div>
    <ol class="toc">{''.join(f'<li{" class=sep" if i == 7 else ""}><span>{i + 1:02d}</span><div>{t}<em>{s}</em></div></li>' for i, (t, s) in enumerate(TOC))}</ol>
  </div>''')

# ---------------------------------------------------------------- 01 services
change('01', 'Services', 'Trois engagements retirés, l’expédition en jours ouvrés.',
       'Le numéro 4 qu’on voudrait supprimer. Le 5, on ne touche pas. […] Juste rajouter peut-être avec les jours ouvrés. […] Pour le 8 et le 7, on peut supprimer ces deux trucs-là.',
       'Vocaux du 12/10, 15:25 et 15:26',
       pair('services', '/services', cls='pair--stack'),
       ['Retirés : n° 4 « Écrin et mot manuscrit », n° 7 « Consultation privée », n° 8 « Ex-libris »',
        'Livraison : « expédition sous 24 h <b>ouvrées</b> depuis Paris », aussi sur chaque fiche produit',
        'La liste est renumérotée de 1 à 5'])

# ---------------------------------------------------------------- 02 écrin
change('02', 'L’écrin et le mot manuscrit', 'Par cohérence avec la page Services : à valider.',
       'Il y a l’écrin, donc le numéro 4 qu’on voudrait supprimer.', 'Vocal du 12/10, 15:25',
       f'''<div class="pair pair--stack">{shot(SH['band']['avant'], 'Avant', note='Le bandeau de réassurance')}{shot(SH['band']['apres'], 'Après', href='/offrir', note='Le bandeau de réassurance')}</div>
           <div class="pair">{shot(SH['cart']['avant'], 'Avant', 'sh--cart', note='Le panier')}{shot(SH['cart']['apres'], 'Après', 'sh--cart', href='/produit?p=vanilla-plum', note='Le panier')}</div>''',
       ['Bandeau de réassurance : trois engagements au lieu de quatre',
        'Panier : plus de case « Écrin cadeau offert », de mot ni de « facture sans prix »',
        'Bandeau du haut et fiches produit mis à jour ; nouveau chapeau de la page Offrir : « Un parfum s’offre comme un livre aimé. Du coffret de miniatures au flacon de collection, trois façons de faire découvrir la maison. »'],
       'paper2', ask('Vous ne l’avez demandé que pour la page Services. Si l’écrin reste proposé ailleurs, dites-le-nous : nous le remettons.'))

# ---------------------------------------------------------------- 03 bougies
change('03', 'La page Bougies', 'En pause jusqu’à l’arrivée des photos et des textes.',
       'Est-ce que c’est possible pour le moment de mettre la page bougie en off, qu’on ne la voit pas apparaître sur le site ?',
       'Vocal du 12/10, 15:27',
       pair('menu', '/bibliotheque', ('Le menu Bibliothèque', 'Le menu Bibliothèque')),
       ['« Bougies — bientôt » n’apparaît plus dans le menu',
        'Son adresse renvoie vers la collection Summer Vibes',
        'Elle revient dès que les photos et les textes sont prêts'])


# ---------------------------------------------------------------- 04 skin obsession
def plan_fig(state, label):
    path, (w, h), H, marks = PLAN[state]
    lab = ''.join(f'<span class="mk{" mk--hl" if m[0] == "Les 3 tuiles" else ""}" style="top:{(m[1]["y"] + m[1]["h"] / 2) / H * 100:.2f}%">{m[0]}</span>' for m in marks)
    return f'''<figure class="plan"><figcaption><b class="tag tag--{'a' if label == 'Avant' else 'b'}">{label}</b></figcaption>
      <div class="plan__box"><img src="{path}">{lab}</div></figure>'''


change('04', 'La collection Skin Obsession', 'Seules les trois tuiles descendent ; tout le reste remonte.',
       'Il y a juste, du coup, cette partie-là, les trois carrousels, si on peut les descendre en dessous du texte. […] On les met vraiment à la fin. […] Il y a juste ça qui bouge en fait.',
       'Vidéos du 12/10, 15:28',
       f'<div class="plans">{plan_fig("avant", "Avant")}{plan_fig("apres", "Après")}</div>',
       ['Les trois tuiles (le coffret, « Portrait olfactif », « Nos adresses ») passent sous les textes, en fin de page',
        'L’introduction, les parfums et la mosaïque gardent leur ordre ; sur téléphone, le premier parfum s’affiche en grand',
        'L’ouverture est désormais votre film (page 12)'], 'paper2')

# ---------------------------------------------------------------- 05 légendes
change('05', 'Les petites légendes', 'Les mentions « fig. 1 — … » sous les images sont retirées.',
       'J’ai vu qu’il y avait pas mal de petites notations comme ça. Ça, pour le coup, on préférerait qu’elles n’apparaissent pas.',
       'Photo et vocal du 12/10, 15:30',
       f'''<div class="pair">{shot(SH['mosaic']['avant'], 'Avant', note='Summer Vibes')}{shot(SH['mosaic']['apres'], 'Après', href='/collection?c=summer-vibes', note='Summer Vibes')}</div>
           <div class="pair">{shot(SH['herofig']['avant'], 'Avant', note='L’accueil')}{shot(SH['herofig']['apres'], 'Après', href='/', note='L’accueil')}</div>''',
       ['Retirées sur l’accueil (diaporama, mosaïques, image de campagne et sa mention « Paris, 2026 »)',
        'Retirées sur la Préface, les collections et les fiches produit'])

# ---------------------------------------------------------------- 06 pages du catalogue
change('06', 'Les renvois au catalogue', 'Les « p. 32 », « p. 8 »… ne s’affichent plus.',
       'Je pense que c’était pour faire un rappel au catalogue, mais comme on n’est pas sûr que les gens vont feuilleter le catalogue, mieux vaut peut-être pas les faire apparaître.',
       'Vocaux du 12/10, 15:30 et 15:31',
       f'''<div class="pair pair--stack">{shot(SH['collhero']['avant'], 'Avant', note='Skin Obsession, « p. 32 »')}{shot(SH['collhero']['apres'], 'Après', href='/collection?c=skin-obsession', note='Skin Obsession')}</div>
           <div class="pair">{shot(SH['manifeste']['avant'], 'Avant', note='La Préface, « p. 8 »')}{shot(SH['manifeste']['apres'], 'Après', href='/preface', note='La Préface')}</div>''',
       ['Retirés partout : accueil, Préface, menu, collections, fiches produit',
        'Et dans le bandeau sous l’en-tête de chaque page (suite page suivante)'], 'paper2')

page(head('06', 'Les renvois au catalogue, suite', 'Le sommaire de l’accueil et les fiches produit.') + f'''<div class="ch">
  <aside class="ch__side">{done(['Sommaire du catalogue sur l’accueil : les chapitres restent, sans numéro de page', '« Le catalogue · 56 pages » et le bouton « Feuilleter » restent : ils décrivent l’objet', 'Fiches produit : plus de numéro de page à côté de la collection'])}</aside>
  <div class="ch__main">
    <div class="pair">{shot(SH['toc']['avant'], 'Avant', note='Le sommaire, accueil')}{shot(SH['toc']['apres'], 'Après', href='/', note='Le sommaire, accueil')}</div>
    <div class="pair">{shot(SH['crumbs']['avant'], 'Avant', note='Une fiche produit')}{shot(SH['crumbs']['apres'], 'Après', href='/produit?p=vanilla-plum', note='Une fiche produit')}</div>
  </div></div>''')

# ---------------------------------------------------------------- 07 fiche produit
page(head('07', 'La fiche produit', 'Un seul flacon à la fois : celui du format choisi.') + f'''<div class="ch">
  <aside class="ch__side">{quote('Est-ce que c’est possible […] que quand on clique sur le 30 ml, ce soit la photo du 30 ml qui apparaisse et pas le 100 ml ? Et que du coup, quand tu slides pour le 100 ml, t’aies pas cette photo […], que ce soit celle-ci directement.', 'Vidéo du 12/10, 15:33')}
    {done(['100 ml (par défaut) : le flacon 100 ml, puis directement les photos de mise en scène', 'Clic sur 30 ml : la photo du flacon 30 ml prend la place', 'Sur ordinateur comme sur téléphone'])}
    {ask('Sur Magnetic Flowers, une photo de mise en scène réunit les deux formats ; dites-nous si vous préférez la retirer de la galerie 100 ml.')}</aside>
  <div class="ch__main"><div class="trio">
    {shot(SH['g100']['avant'], 'Avant', note='100 ml : le 30 ml apparaît en 2ᵉ')}
    {shot(SH['g100']['apres'], 'Après', href='/produit?p=vanilla-plum', note='100 ml')}
    {shot(SH['g30']['apres'], 'Après', href='/produit?p=vanilla-plum', note='Clic sur 30 ml')}
  </div></div></div>''')

# ---------------------------------------------------------------- 08 prix
change('08', 'Vos prix', 'Les formats et les coffrets, aux prix que vous nous avez donnés.',
       'Pour les prix : 100 ml : 170 € ; 30 ml : 90 € ; 2 ml : 7 € ; Discovery Set 2 ml : 40 € ; Discovery Set 30 ml Summer Vibes : 430 € ; Discovery Set 30 ml Skin Obsession : 250 €.',
       'Message du 12/10, 17:14',
       f'''<div class="pair">{shot(SH['sizes']['avant'], 'Avant', note='Une fiche parfum')}{shot(SH['sizes']['apres'], 'Après', href='/produit?p=vanilla-plum', note='Une fiche parfum')}</div>
           <div class="pair">{shot(SH['coffret']['avant'], 'Avant', note='Le Coffret Découverte')}{shot(SH['coffret']['apres'], 'Après', href='/produit?p=coffret-decouverte', note='Le Coffret Découverte')}</div>''',
       ['Parfums : 100 ml 170 €, 30 ml 90 €, 2 ml 7 €',
        'Coffret Découverte : une seule version, les huit parfums en 2 ml, 40 €',
        'Coffrets 30 ml : Summer Vibes 430 €, Skin Obsession 250 €',
        'Le « Coffret à composer » est mis en pause : ses liens mènent au Coffret Découverte',
        'Page Offrir : « Moins de 50 € » et « Autour de 90 € »'], 'paper2')

# ---------------------------------------------------------------- 09 film
film = ''.join(f'<img src="{f}">' for f in FILM)
page(head('09', 'Le film Skin Obsession', 'Il ouvre désormais la page de la collection.') + f'''<div class="ch">
  <aside class="ch__side">{quote('Là, du coup, on verra si on met pas aussi une vidéo. Je sais pas si c’est possible d’incruster une vidéo, mais ce serait top si on peut mettre une vidéo.', 'Vidéo du 12/10, 15:28')}
    {done(['Votre film ouvre la page Skin Obsession, en boucle et sans le son', 'Une version plus légère est servie sur téléphone', 'Si l’appareil demande moins d’animations, l’image fixe reste'])}</aside>
  <div class="ch__main">
    <div class="pair">{shot(SH['hero']['avant'], 'Avant', note='L’ouverture : une photo')}{shot(SH['hero']['apres'], 'Après', href='/collection?c=skin-obsession', note='L’ouverture : votre film')}</div>
    <div class="film"><span class="tag tag--b">Le film, 22 s</span><div class="film__row">{film}</div></div>
  </div></div>''')

# ---------------------------------------------------------------- 10 carte
change('10', 'Les points de vente', 'Vingt-cinq adresses, dans treize pays.',
       '', '',
       f'''<div class="pair">{shot(SH['carte']['avant'], 'Avant', note='13 adresses')}{shot(SH['carte']['apres'], 'Après', href='/points-de-vente', note='25 adresses')}</div>''',
       ['La carte reprend exactement votre liste : 10 adresses en France, 15 dans le monde',
        'Un onglet par pays, et une recherche par ville',
        'BeautyLIV : boutique en ligne, sans repère sur la carte',
        'Odor BXL et ParfuMaria : « sur rendez-vous »'],
       'paper2', ask('Ne sont plus sur la carte, car absentes de votre liste : Sayhar, Vanora, La Galerie du Flair, Evok Shoes, Mon Flacon, Parfum 352 et Parfumologue. Dites-nous si l’une d’elles doit rester.'))

# ---------------------------------------------------------------- à venir
page(f'''
  <div class="ready">
    <div><p class="kick">Pour la suite</p><h1>Ce qu’il nous faut<br>encore.</h1>
      <p class="lead">Dès réception, nous les intégrons au site. Vos questions sur le code du coffret et le paiement en trois fois ont leur réponse à part.</p></div>
    <ul>
      <li><b>Photos</b>Les packagings, les coffrets et les discovery (même au téléphone)</li>
      <li><b>Mosaïques</b>De nouvelles photos pour Skin Obsession et Summer Vibes, pas seulement des mannequins</li>
      <li><b>Bougies</b>Photos et textes, pour rouvrir la page</li>
      <li><b>Coffret à composer</b>Son prix, le jour où vous voudrez le lancer</li>
      <li><b>Validations</b>L’écrin (page 4), la photo de Magnetic Flowers (page 10), les adresses retirées (page 13)</li>
    </ul>
  </div>''')

page(f'''
  <div class="end">
    <div class="end__mark">{LOGO_P}</div>
    <a class="cta cta--big" href="{URL}">Voir le site <span>↗</span></a>
    <p class="cover__url">librery-refonte.vercel.app</p>
  </div>''', 'dark', num=False)

# typographie française : espaces fines insécables avant « : ; ? ! » et dans les guillemets, insécables dans les unités
NNBSP, NBSP = ' ', ' '


def typo(t):
    t = re.sub(r'«\s+', '«' + NNBSP, t)
    t = re.sub(r'\s+»', NNBSP + '»', t)
    t = re.sub(r'\s+([:;?!])', NNBSP + r'\1', t)
    t = re.sub(r'(\d) (ml|h|€|%|s)\b', r'\1' + NBSP + r'\2', t)
    t = re.sub(r'(\d) €', r'\1' + NBSP + '€', t)
    t = t.replace('n° ', 'n°' + NBSP)
    return t


body = re.sub(r'>([^<]+)<', lambda m: '>' + typo(m.group(1)) + '<', ''.join(pages))
css = (LIV / 'livraison.css').read_text() + (root / 'retours.css').read_text()
doc = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>LIBRERY — Vos retours du 12 octobre</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500&family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
<style>{css}</style></head><body>{body}</body></html>'''
(root / 'retours.html').write_text(doc, encoding='utf8')
print(len(pages), 'pages')
