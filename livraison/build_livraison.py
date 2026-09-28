"""PDF de livraison du site LIBRERY : maquettes navigateur et téléphone, peu de texte.
Génère livraison.html (pages 1600 × 900, 16/9), imprimé en PDF par render.js."""
import pathlib, io
import segno

root = pathlib.Path(__file__).parent
URL = 'https://librery-refonte.vercel.app'
LOGO = (root / 'img/logo.svg').read_text()
LOGO_P = (root / 'img/logo-paris.svg').read_text()
pages = []

import base64
qr = io.BytesIO(); segno.make(URL, error='m').save(qr, kind='png', scale=12, border=0, dark='#efe6d6', light=None)
QR = f'<img src="data:image/png;base64,{base64.b64encode(qr.getvalue()).decode()}" alt="QR code du site">'


def page(body, cls='', num=True, run=True):
    n = len(pages) + 1
    chrome = ''
    if run:
        chrome += '<div class="run"><span>LIBRERY</span><span>Livraison du site · Septembre 2026</span></div>'
    if num:
        chrome += f'<div class="num">{n:02d}</div>'
    pages.append(f'<section class="pg {cls}">{chrome}{body}</section>')


def browser(img, path='', cls='', style=''):
    return f'''<div class="br {cls}" style="{style}"><div class="br__bar"><i></i><i></i><i></i>
      <span class="br__url"><svg viewBox="0 0 10 12" width="8" height="10"><path d="M2 5V3.5a3 3 0 0 1 6 0V5M1.5 5h7v6h-7z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>librery-refonte.vercel.app{path}</span></div>
      <div class="br__scr"><img src="img/{img}.jpg"></div></div>'''


def phone(img, cls='', style=''):
    return f'<div class="ph {cls}" style="{style}"><div class="ph__scr"><img src="img/{img}.jpg"><span class="ph__island"></span></div></div>'


def title(n, t, sub, dark=False):
    return f'<div class="ti"><span class="ti__n">{n}</span><h2>{t}</h2><p>{sub}</p></div>'


# ---------------------------------------------------------------- 01 couverture
page(f'''
  <div class="cover">
    <div class="cover__txt">
      <p class="kick">Livraison · Site internet</p>
      <div class="cover__mark">{LOGO}</div>
      <p class="cover__sub">La bibliothèque olfactive,<br>sur tous les écrans.</p>
      <a class="cta" href="{URL}">Découvrir le site <span>↗</span></a>
      <p class="cover__url">librery-refonte.vercel.app</p>
    </div>
    {browser('d-hero1', '', 'cover__br')}
    {phone('m-hero2', 'cover__ph')}
  </div>''', 'dark', num=False, run=False)

# ---------------------------------------------------------------- 02 en un coup d'œil
idx = [('Accueil', '/'), ('Bibliothèque', '/bibliotheque'), ('Fiche produit', '/produit?p=tonka-love'), ('Collections', '/collection?c=skin-obsession'),
       ('La Préface', '/preface'), ('Le Lexique', '/lexique'), ('La Carte', '/points-de-vente'), ('Offrir', '/offrir'),
       ('Portrait olfactif', '/portrait-olfactif'), ('Coffret à composer', '/produit?p=coffret-a-composer'), ('Services', '/services')]
page(f'''
  <div class="glance">
    <div>
      <p class="kick">Le site en un coup d’œil</p>
      <h1>Un site qui se lit<br>comme le catalogue.</h1>
      <div class="figs">
        <div><b>11</b><span>modèles de page</span></div>
        <div><b>8</b><span>parfums, 100 · 30 · 2 ml</span></div>
        <div><b>2</b><span>écrans, conçus ensemble</span></div>
        <div><b>1</b><span>thème Shopify, prêt</span></div>
      </div>
    </div>
    <ol class="toc">{''.join(f'<li><a href="{URL}{u}"><span>{i + 1:02d}</span>{t}<em>↗</em></a></li>' for i, (t, u) in enumerate(idx))}</ol>
  </div>''')

# ---------------------------------------------------------------- pages écran
def duo(n, t, sub, d, m, path, dark=False, flip=False):
    page(f'''{title(n, t, sub)}
      {browser(d, path, 'duo__br' + (' duo__br--r' if flip else ''))}
      {phone(m, 'duo__ph' + (' duo__ph--l' if flip else ''))}''', ('dark ' if dark else '') + 'lay')

duo('01', 'L’accueil', 'Une ouverture de campagne, le logo officiel, la nouveauté en premier.', 'd-hero1', 'm-hero1', '/')

page(f'''{title('02', 'Le diaporama', 'Trois images de campagne, une barre de progression par image, le glisser au doigt.')}
  <div class="trio">{phone('m-hero1')}{phone('m-hero2', 'up')}{phone('m-hero3')}</div>''', 'dark')

duo('03', 'La nouveauté', 'Skin Obsession en tête de page, avec son folio du catalogue.', 'd-skin', 'm-skin', '/', flip=True)

page(f'''{title('04', 'Le catalogue, livre ouvert', 'La couverture en objet, un index avec les numéros de page, un clic pour feuilleter.')}
  {browser('d-book', '/#catalogue', 'duo__br')}
  {phone('m-book', 'duo__ph')}''', 'paper2 lay')

duo('05', 'L’étagère des matières', 'Une nature morte par parfum, à faire défiler.', 'd-shelf', 'm-shelf', '/#matieres', flip=True)

page(f'''{title('06', 'Le parfum prend vie', 'Au survol, la mise en situation apparaît en fondu ; « 30 ml » montre le flacon de voyage.')}
  <div class="seq">
    <figure><img src="img/seq-0.jpg"><figcaption>Le packshot 100 ml</figcaption></figure>
    <figure><img src="img/seq-1.jpg"><figcaption>La mise en situation apparaît</figcaption></figure>
    <figure><img src="img/seq-2.jpg"><figcaption>Un lent travelling</figcaption></figure>
    <figure><img src="img/seq-3.jpg"><figcaption>Le flacon 30 ml</figcaption></figure>
  </div>''')

duo('07', 'La Bibliothèque', 'Par collection ou par famille olfactive : cinq familles illustrées.', 'd-lib-fams', 'm-lib-fams', '/bibliotheque', dark=True)

duo('08', 'La fiche produit', 'Les images en pleine colonne, l’achat toujours à portée de main.', 'd-pdp-top', 'm-pdp-top', '/produit?p=tonka-love')

duo('09', 'Le sillage, heure par heure', 'Les notes de tête s’évaporent, le cœur s’ouvre, le fond demeure.', 'd-pdp-sillage', 'm-pdp-sillage', '/produit?p=tonka-love#sillage', dark=True, flip=True)

duo('10', 'Le récit et le parfumeur', 'Le texte du catalogue, la lecture des matières, la signature du parfumeur.', 'd-pdp-perf', 'm-pdp-perf', '/produit?p=tonka-love#parfumeur')

page(f'''{title('11', 'Les collections', 'Chaque collection est un chapitre : une image, un texte, les parfums.')}
  {browser('d-coll', '/collection?c=skin-obsession', 'pair__a')}
  {browser('d-coll-mosaic', '/collection?c=skin-obsession', 'pair__b')}
  {phone('m-coll', 'pair__ph')}''', 'paper2 lay')

page(f'''{title('12', 'La Préface', 'Le manifeste, le fondateur, les trois parfumeurs.')}
  {browser('d-preface', '/preface', 'pair__a')}
  {browser('d-preface-perf', '/preface#parfumeurs', 'pair__b')}
  {phone('m-preface', 'pair__ph')}''', 'lay')

page(f'''{title('13', 'Le Lexique', 'Les notes, les familles, et l’horloge du sillage pour chaque parfum.')}
  {browser('d-lex-clock', '/lexique', 'pair__a')}
  {browser('d-lex-fams', '/lexique#familles-lexique', 'pair__b')}
  {phone('m-lex-fams', 'pair__ph')}''', 'dark lay')

page(f'''{title('14', 'Choisir et offrir', 'Portrait olfactif, idées par budget, coffret à composer.')}
  <div class="stair">{browser('d-quiz', '/portrait-olfactif')}{browser('d-offrir', '/offrir')}{browser('d-composer', '/produit?p=coffret-a-composer')}</div>''', 'lay')

page(f'''{title('15', 'Sur mobile', 'Chaque parcours est pensé pour le pouce, jusqu’au menu.')}
  <div class="quad">{phone('m-quiz')}{phone('m-offrir', 'up')}{phone('m-composer')}{phone('m-menu', 'up')}</div>''', 'paper2')

duo('16', 'La Carte', 'Les treize points de vente, la recherche, le filtre par pays.', 'd-carte', 'm-carte', '/points-de-vente', flip=True)

duo('17', 'Le panier', 'Le 2 ml offert, deux échantillons au choix, l’écrin cadeau.', 'd-cart', 'm-cart', '/produit?p=vanilla-plum', flip=True)

duo('18', 'La signature', 'Un pied de page minimaliste et monumental.', 'd-footer', 'm-footer', '/', dark=True)

page(f'''{title('19', 'Pensé d’abord pour le mobile', 'Rien n’est une version réduite : chaque écran a sa mise en page.')}
  <div class="wall">{''.join(phone(x, 'up' if i % 2 else '') for i, x in enumerate(['m-hero3', 'm-index', 'm-lib-cards', 'm-pdp-top', 'm-lex-clock', 'm-footer']))}</div>''', 'dark')

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
  </div>''', 'paper2')

page(f'''
  <div class="end">
    <div class="end__mark">{LOGO_P}</div>
    <a class="cta cta--big" href="{URL}">Découvrir le site <span>↗</span></a>
    <div class="end__qr">{QR}<p>Scannez pour l’ouvrir<br>sur votre téléphone</p></div>
    <p class="cover__url">librery-refonte.vercel.app</p>
  </div>''', 'dark', num=False, run=False)

css = (root / 'livraison.css').read_text()
html = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>LIBRERY — Livraison du site</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500&family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
<style>{css}</style></head><body>{''.join(pages)}</body></html>'''
(root / 'livraison.html').write_text(html, encoding='utf8')
print(len(pages), 'pages')
