"""PDF de livraison du site LIBRERY : maquettes navigateur et téléphone, peu de texte.
Génère livraison.html (pages 1600 × 900, 16/9). render.js photographie chaque page
puis imprime un PDF d'images : aucune ombre ne peut y devenir un cadre gris.

Toutes les maquettes sont placées sur une grille calculée ici :
en-tête sur une ligne, zone de contenu de 72 à 1528 px en largeur, de 150 à 840 px en hauteur."""
import pathlib, io, base64
import segno

root = pathlib.Path(__file__).parent
URL = 'https://librery-refonte.vercel.app'
LOGO = (root / 'img/logo.svg').read_text()
LOGO_P = (root / 'img/logo-paris.svg').read_text()
pages = []

qr = io.BytesIO(); segno.make(URL, error='m').save(qr, kind='png', scale=12, border=0, dark='#efe6d6', light=None)
QR = f'<img src="data:image/png;base64,{base64.b64encode(qr.getvalue()).decode()}" alt="QR code du site">'

# zone de contenu
X0, W, Y0, H = 72, 1456, 150, 690
BR_K = .625 + 2.25 * 16 / 1000          # hauteur d'un navigateur = largeur × BR_K (écran 16/10 + barre)
PH_K = 844 / 390                         # proportion de l'écran de l'iPhone
PH_PAD = 9 / 290                         # épaisseur du bord, relative à la largeur de l'écran

# adresse de chaque capture : chaque maquette renvoie vers la page réelle
PATHS = {
    'hero1': '/', 'hero2': '/', 'hero3': '/', 'skin': '/', 'book': '/#catalogue', 'index': '/#catalogue', 'shelf': '/#matieres',
    'summer': '/', 'footer': '/', 'home-mosaic': '/', 'mega': '/', 'menu': '/',
    'lib-top': '/bibliotheque', 'lib-fams': '/bibliotheque#familles', 'lib-cards': '/bibliotheque', 'lib-gourmand': '/bibliotheque?famille=Gourmand',
    'card-swipe': '/bibliotheque', 'pdp-top': '/produit?p=tonka-love', 'pdp-2': '/produit?p=tonka-love', 'pdp-sillage': '/produit?p=tonka-love#sillage',
    'pdp-perf': '/produit?p=tonka-love#parfumeur', 'pdp-related': '/produit?p=tonka-love', 'pdp-buy': '/produit?p=tonka-love',
    'coll': '/collection?c=skin-obsession', 'coll-mosaic': '/collection?c=skin-obsession', 'coll-chapters': '/collection?c=skin-obsession',
    'coll-summer': '/collection?c=summer-vibes', 'coll-coffrets': '/collection?c=coffrets',
    'preface': '/preface', 'preface-perf': '/preface#parfumeurs', 'lex-top': '/lexique', 'lex-clock': '/lexique', 'lex-fams': '/lexique#familles-lexique',
    'carte': '/points-de-vente', 'offrir': '/offrir', 'quiz': '/portrait-olfactif', 'quiz-q': '/portrait-olfactif', 'quiz-res': '/portrait-olfactif',
    'composer': '/produit?p=coffret-a-composer', 'services': '/services', 'cart': '/produit?p=vanilla-plum', 'contact': '/contact',
}


def path_of(img):
    k = img[2:]
    return PATHS.get(k, '/produit?p=' + k[4:] if k.startswith('pdp-') else '/')


def page(body, cls='', num=True):
    n = len(pages) + 1
    chrome = f'<div class="foot"><span>LIBRERY · Livraison du site</span><span>{n:02d}</span></div>' if num else ''
    pages.append(f'<section class="pg {cls}">{chrome}{body}</section>')


def head(n, t, sub):
    return f'<header class="hd"><h2>{t}</h2><p>{sub}</p></header>'


def browser(img, x, y, w):
    p = path_of(img)
    return f'''<a class="br" href="{URL}{p}" style="left:{x:.1f}px;top:{y:.1f}px;width:{w:.1f}px;font-size:{w / 1000 * 16:.2f}px"><span class="br__bar"><i></i><i></i><i></i>
      <span class="br__url"><svg viewBox="0 0 10 12"><path d="M2 5V3.5a3 3 0 0 1 6 0V5M1.5 5h7v6h-7z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>librery-refonte.vercel.app{p.split('#')[0] if len(p) < 34 else p[:30] + '…'}</span></span>
      <span class="br__scr"><img src="img/{img}.jpg"></span></a>'''


def phone(img, x, y, outer):
    """outer : largeur hors tout de l'iPhone"""
    inner = outer / (1 + 2 * PH_PAD)
    return f'<a class="ph" href="{URL}{path_of(img)}" style="left:{x:.1f}px;top:{y:.1f}px;width:{inner:.1f}px;font-size:{inner / 290 * 16:.2f}px"><span class="ph__scr"><img src="img/{img}.jpg"><span class="ph__island"></span></span></a>'


def ph_h(outer):
    inner = outer / (1 + 2 * PH_PAD)
    return inner * PH_K + 2 * inner * PH_PAD


def ph_w(height):
    return height / (PH_K + 2 * PH_PAD) * (1 + 2 * PH_PAD)


# ---------------------------------------------------------------- mises en page
def duo(n, t, sub, d, m, cls=''):
    """un grand navigateur et un iPhone, même hauteur, alignés sur la zone"""
    pw = ph_w(H); bw = H / BR_K
    page(head(n, t, sub) + browser(d, X0, Y0, bw) + phone(m, X0 + W - pw, Y0, pw), cls)


def grid(n, t, sub, imgs, cls='', cols=3, gx=28, gy=40):
    rows = -(-len(imgs) // cols)
    bw = min((W - gx * (cols - 1)) / cols, (H - gy * (rows - 1)) / rows / BR_K)
    bh = bw * BR_K
    tw = cols * bw + (cols - 1) * gx; th = rows * bh + (rows - 1) * gy
    x0 = X0 + (W - tw) / 2; y0 = Y0 + (H - th) / 2
    page(head(n, t, sub) + ''.join(browser(im, x0 + (i % cols) * (bw + gx), y0 + (i // cols) * (bh + gy), bw) for i, im in enumerate(imgs)), cls)


def quad(n, t, sub, imgs, m, cls='', g=30, gap=72):
    """quatre navigateurs en 2 × 2 et un iPhone pleine hauteur"""
    bh = (H - g) / 2; bw = bh / BR_K; pw = ph_w(H)
    tw = 2 * bw + g + gap + pw; x0 = X0 + (W - tw) / 2
    body = ''.join(browser(im, x0 + (i % 2) * (bw + g), Y0 + (i // 2) * (bh + g), bw) for i, im in enumerate(imgs))
    page(head(n, t, sub) + body + phone(m, x0 + 2 * bw + g + gap, Y0, pw), cls)


def row(n, t, sub, imgs, cls='', gap=None):
    gap = gap or (44 if len(imgs) < 6 else 26)
    k = len(imgs)
    pw = min(ph_w(H), (W - gap * (k - 1)) / k); h = ph_h(pw)
    tw = k * pw + (k - 1) * gap; x0 = X0 + (W - tw) / 2; y0 = Y0 + (H - h) / 2
    page(head(n, t, sub) + ''.join(phone(im, x0 + i * (pw + gap), y0, pw) for i, im in enumerate(imgs)), cls)


def wall(n, t, sub, imgs, cols, cls='', gx=40, gy=34):
    rows = -(-len(imgs) // cols)
    h = (H - gy * (rows - 1)) / rows; pw = ph_w(h)
    tw = cols * pw + (cols - 1) * gx; x0 = X0 + (W - tw) / 2
    page(head(n, t, sub) + ''.join(phone(im, x0 + (i % cols) * (pw + gx), Y0 + (i // cols) * (h + gy), pw) for i, im in enumerate(imgs)), cls)


# ---------------------------------------------------------------- couverture
cw = 860
page(f'''
  <div class="cover">
    <div class="cover__txt">
      <p class="kick">Livraison · Site internet</p>
      <div class="cover__mark">{LOGO}</div>
      <p class="cover__sub">La bibliothèque olfactive,<br>sur tous les écrans.</p>
      <a class="cta" href="{URL}">Découvrir le site <span>↗</span></a>
      <p class="cover__url">librery-refonte.vercel.app</p>
    </div>
    {browser('d-hero1', 1528 - cw - 150, 190, cw)}
    {phone('m-hero2', 1528 - 250, 290, 250)}
  </div>''', 'dark', num=False)

# ---------------------------------------------------------------- en un coup d'œil
idx = [('Accueil', '/'), ('Bibliothèque', '/bibliotheque'), ('Fiche produit', '/produit?p=tonka-love'), ('Collections', '/collection?c=skin-obsession'),
       ('La Préface', '/preface'), ('Le Lexique', '/lexique'), ('La Carte', '/points-de-vente'), ('Offrir', '/offrir'),
       ('Portrait olfactif', '/portrait-olfactif'), ('Coffret à composer', '/produit?p=coffret-a-composer'), ('Services', '/services')]
nd = len(list(root.glob('img/d-*.jpg'))); nm = len(list(root.glob('img/m-*.jpg')))
page(f'''
  <div class="glance">
    <div>
      <p class="kick">Le site en un coup d’œil</p>
      <h1>Un site qui se lit<br>comme le catalogue.</h1>
      <div class="figs">
        <div><b>11</b><span>modèles de page</span></div>
        <div><b>{nd + nm}</b><span>écrans dans ce document</span></div>
        <div><b>8</b><span>parfums, 100 · 30 · 2 ml</span></div>
        <div><b>1</b><span>thème Shopify, prêt</span></div>
      </div>
    </div>
    <ol class="toc">{''.join(f'<li><a href="{URL}{u}"><span>{i + 1:02d}</span>{t}<em>↗</em></a></li>' for i, (t, u) in enumerate(idx))}</ol>
  </div>''')

# ---------------------------------------------------------------- accueil
duo('01', 'L’accueil', 'Une ouverture de campagne, le logo officiel, la nouveauté en premier.', 'd-hero1', 'm-hero1')
grid('02', 'L’accueil, section par section', 'Diaporama, nouveauté, catalogue, étagère des matières, collection d’été.',
     ['d-hero2', 'd-hero3', 'd-skin', 'd-book', 'd-shelf', 'd-summer'], 'paper2')
row('03', 'L’accueil sur mobile', 'Chaque section a sa mise en page pour le pouce.',
    ['m-hero2', 'm-hero3', 'm-skin', 'm-book', 'm-index', 'm-shelf'], 'dark')

page(head('04', 'Le parfum prend vie', 'Au survol, la mise en situation apparaît en fondu ; « 30 ml » montre le flacon de voyage.') + '''
  <div class="seq">
    <figure><img src="img/seq-0.jpg"><figcaption>Le packshot 100 ml</figcaption></figure>
    <figure><img src="img/seq-1.jpg"><figcaption>La mise en situation apparaît</figcaption></figure>
    <figure><img src="img/seq-2.jpg"><figcaption>Un lent travelling</figcaption></figure>
    <figure><img src="img/seq-3.jpg"><figcaption>Le flacon 30 ml</figcaption></figure>
  </div>''')

# ---------------------------------------------------------------- bibliothèque
duo('05', 'La Bibliothèque', 'Par collection ou par famille olfactive : cinq familles illustrées.', 'd-lib-fams', 'm-lib-fams')
quad('06', 'Trier, filtrer, parcourir', 'Les familles filtrent la bibliothèque ; le menu ouvre chaque collection.',
     ['d-lib-top', 'd-lib-gourmand', 'd-lib-cards', 'd-mega'], 'm-card-swipe', 'paper2')
row('07', 'La Bibliothèque sur mobile', 'On fait glisser les images de chaque parfum du bout du doigt.',
    ['m-lib-top', 'm-lib-gourmand', 'm-lib-cards', 'm-menu', 'm-home-mosaic'], 'dark')

# ---------------------------------------------------------------- fiche produit
duo('08', 'La fiche produit', 'Les images en pleine colonne, l’achat toujours à portée de main.', 'd-pdp-top', 'm-pdp-top')
duo('09', 'Le sillage, heure par heure', 'Les notes de tête s’évaporent, le cœur s’ouvre, le fond demeure.', 'd-pdp-sillage', 'm-pdp-sillage', 'dark')
quad('10', 'Le récit, le parfumeur, le panier', 'Le texte du catalogue, la signature du parfumeur, le 2 ml offert.',
     ['d-pdp-2', 'd-pdp-perf', 'd-pdp-related', 'd-cart'], 'm-pdp-buy', 'paper2')
row('11', 'La fiche produit sur mobile', 'Le bouton d’achat reste accroché en bas de l’écran.',
    ['m-pdp-2', 'm-pdp-perf', 'm-pdp-related', 'm-cart', 'm-composer'])
grid('12', 'Chaque parfum, sa fiche', 'Le même soin pour les huit parfums : packshot studio, mise en situation, récit.',
     ['d-pdp-hot-sand', 'd-pdp-palmeira', 'd-pdp-mango-wave', 'd-pdp-sun-ice', 'd-pdp-ambert-sunset', 'd-pdp-magnetic-flowers'], 'dark')
row('13', 'Et sur mobile', 'Hot Sand, Palmeira, Mango Wave, Sun & Ice, Ambert Sunset, Magnetic Flowers.',
    ['m-pdp-hot-sand', 'm-pdp-palmeira', 'm-pdp-mango-wave', 'm-pdp-sun-ice', 'm-pdp-ambert-sunset', 'm-pdp-magnetic-flowers'], 'paper2')

# ---------------------------------------------------------------- collections
duo('14', 'Les collections', 'Chaque collection est un chapitre : une image, un texte, les parfums.', 'd-coll', 'm-coll')
grid('15', 'Des chapitres, pas des listes', 'Mosaïques de campagne, chapitres, coffrets, collection d’été.',
     ['d-coll-mosaic', 'd-coll-chapters', 'd-coll-summer', 'd-coll-coffrets', 'd-home-mosaic', 'd-composer'], 'paper2')
row('16', 'Les collections sur mobile', 'Les mosaïques se recomposent en une colonne.',
    ['m-coll-mosaic', 'm-coll-chapters', 'm-coll-summer', 'm-coll-coffrets', 'm-summer', 'm-skin'], 'dark')

# ---------------------------------------------------------------- préface et lexique
duo('17', 'La Préface', 'Le manifeste, le fondateur, les trois parfumeurs.', 'd-preface', 'm-preface')
quad('18', 'Le Lexique', 'Les notes, les familles, et l’horloge du sillage pour chaque parfum.',
     ['d-preface-perf', 'd-lex-top', 'd-lex-clock', 'd-lex-fams'], 'm-lex-clock', 'dark')
row('19', 'Lire et apprendre sur mobile', 'Parfumeurs, notes, familles, sillage.',
    ['m-preface-perf', 'm-lex-top', 'm-lex-fams', 'm-lex-clock', 'm-pdp-sillage'], 'paper2')

# ---------------------------------------------------------------- choisir et offrir
grid('20', 'Choisir et offrir', 'Portrait olfactif en quatre questions, idées par budget, services, contact.',
     ['d-quiz', 'd-quiz-q', 'd-quiz-res', 'd-offrir', 'd-services', 'd-contact'])
row('21', 'Choisir et offrir sur mobile', 'Du premier choix à la réponse, sans quitter le pouce.',
    ['m-quiz', 'm-quiz-q', 'm-quiz-res', 'm-offrir', 'm-services', 'm-contact'], 'dark')

# ---------------------------------------------------------------- carte, signature
duo('22', 'La Carte', 'Les treize points de vente, la recherche, le filtre par pays.', 'd-carte', 'm-carte', 'paper2')
duo('23', 'La signature', 'Un pied de page minimaliste et monumental.', 'd-footer', 'm-footer', 'dark')

# ---------------------------------------------------------------- murs
grid('24', 'Quarante-cinq écrans d’ordinateur', 'Une même écriture, de la première à la dernière page.',
     ['d-hero1', 'd-skin', 'd-book', 'd-lib-fams', 'd-pdp-top', 'd-pdp-sillage', 'd-coll', 'd-preface', 'd-lex-clock', 'd-quiz-res', 'd-carte', 'd-footer'],
     'paper2', cols=4, gx=24, gy=28)
wall('25', 'Pensé d’abord pour le mobile', 'Rien n’est une version réduite : chaque écran a sa mise en page.',
     ['m-hero1', 'm-skin', 'm-book', 'm-shelf', 'm-lib-fams', 'm-card-swipe', 'm-pdp-top',
      'm-pdp-sillage', 'm-coll', 'm-preface', 'm-lex-fams', 'm-quiz-res', 'm-carte', 'm-footer'], 7, 'dark')

page(f'''
  <div class="ready">
    <div><p class="kick">Prêt pour Shopify</p><h1>Chaque bloc<br>devient une section.</h1></div>
    <ul>
      <li><b>Thème</b>Sections modifiables dans l’éditeur Shopify</li>
      <li><b>Produits</b>Variantes 100, 30 et 2 ml, packshots studio</li>
      <li><b>Contenus</b>Notes, familles, parfumeurs, points de vente</li>
      <li><b>Services</b>2 ml offert, échantillons au choix, coffrets</li>
      <li><b>Images</b>Nettes, légères, jamais d’ancienne version en cache</li>
      <li><b>Qualité</b>Chaque page contrôlée, ordinateur et mobile</li>
    </ul>
  </div>''')

page(f'''
  <div class="end">
    <div class="end__mark">{LOGO_P}</div>
    <a class="cta cta--big" href="{URL}">Découvrir le site <span>↗</span></a>
    <div class="end__qr">{QR}<p>Scannez pour l’ouvrir<br>sur votre téléphone</p></div>
    <p class="cover__url">librery-refonte.vercel.app</p>
  </div>''', 'dark', num=False)

css = (root / 'livraison.css').read_text()
html = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>LIBRERY — Livraison du site</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500&family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
<style>{css}</style></head><body>{''.join(pages)}</body></html>'''
(root / 'livraison.html').write_text(html, encoding='utf8')
print(len(pages), 'pages')
