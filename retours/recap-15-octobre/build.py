"""PDF « Depuis le 12 octobre » pour Nolwenn et Rafiq : ce qui a été fait depuis le PDF des retours du 12/10,
la 3D (prête mais masquée pour l'instant) et le site du week-end. Même contenu que la vidéo récap (video/src/Recap.jsx).

1. captures : node video/capture-recap.js, video/capture-sillage.js, video/capture-weekend.js (voir ces fichiers)
2. python3 build.py   → recadre les images dans img/, écrit recap.html
3. node render.cjs    → LIBRERY-depuis-le-12-octobre.pdf

Pages 1600 × 900, même écriture que le PDF des retours (livraison.css + retours/pdf/retours.css)."""
import html, pathlib, re
from PIL import Image

root = pathlib.Path(__file__).parent
REPO = root.parent.parent
LIV = REPO / 'livraison'
CAP = REPO / 'video/public/recap'
FONTS = REPO / 'video/public/fonts'
SHARED = pathlib.Path('/mnt/project-files')
URL = 'https://librery-refonte.vercel.app'
(root / 'img').mkdir(exist_ok=True)
esc = html.escape


def img(src, name, box=None, maxw=1800):
    """recadre (px de l'image) et réduit ; renvoie (chemin relatif, (w, h))"""
    im = Image.open(src).convert('RGB')
    if box: im = im.crop(box)
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    out = f'img/{name}.jpg'; im.save(root / out, quality=88)
    return out, im.size


def top(src, name, ratio, maxw=1800):
    """le haut d'une page entière, au format d'un écran (ratio = h / w)"""
    im = Image.open(src)
    return img(src, name, (0, 0, im.width, round(im.width * ratio)), maxw)


S = {
    'pdp-mf': img(CAP / 'pdp-mf.jpg', 'pdp-mf'), 'pdp-tl': img(CAP / 'pdp-tl.jpg', 'pdp-tl'),
    'coffret': img(CAP / 'coffret.jpg', 'coffret'), 'services': img(CAP / 'services.jpg', 'services'),
    'stores': img(CAP / 'stores.jpg', 'stores'), 'pied': img(CAP / 'pied.jpg', 'pied'),
    'pied-m': img(CAP / 'pied-m.jpg', 'pied-m', maxw=780), 'pdp-vp-m': img(CAP / 'pdp-vp-m.jpg', 'pdp-vp-m', maxw=780),
    'we-home': top(CAP / 'we/d-home.jpg', 'we-home', 900 / 1440), 'we-home-m': top(CAP / 'we/m-home.jpg', 'we-home-m', 844 / 390, 780),
    'we-summer': top(CAP / 'we/d-summer.jpg', 'we-summer', 900 / 1440), 'we-summer-m': top(CAP / 'we/m-summer.jpg', 'we-summer-m', 844 / 390, 780),
    'feuille-d': img(SHARED / 'effet-feuille/capture-ordinateur-intro.png', 'feuille-d'),
    'feuille-m': img(SHARED / 'effet-feuille/captures-iphone.png', 'feuille-m'),
}
# le chevet : la planche des images déjà rendues et trois images en haute définition
CH = SHARED / 'chevet-blender/hd'
SEQ = sorted((CH / 'iphone').glob('*.jpg')) if (CH / 'iphone').is_dir() else []
if len(SEQ) >= 100:   # la séquence iPhone complète : trois images clés et une planche d'une image sur six
    for k, i in (('000', 0), ('064', 64), ('082', 120)):
        S[f'ch{k}'] = img(SEQ[i], f'chevet-{k}', maxw=900)
    tiles = [Image.open(f).convert('RGB') for f in SEQ[::6]]
    tw, th = 230, round(230 * tiles[0].height / tiles[0].width); cols = 11; rows = -(-len(tiles) // cols)
    sheet = Image.new('RGB', (cols * tw, rows * th), (247, 244, 238))
    for i, t in enumerate(tiles): sheet.paste(t.resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
    sheet.save(root / 'img/chevet-planche-src.jpg', quality=90)
    S['planche'] = img(root / 'img/chevet-planche-src.jpg', 'chevet-planche')
    CH_LBL = ('Image 1', 'Image 65', 'Image 121', 'La séquence iPhone, une image sur six')
else:
    S['planche'] = img(CH / 'planche-iphone-hd-2.jpg', 'chevet-planche')
    for k in ('000', '064', '082'):
        S[f'ch{k}'] = img(CH / f'iphone-hd-{k}.jpg', f'chevet-{k}', maxw=900)
    CH_LBL = ('Image 1', 'Image 65', 'Image 83', 'La séquence iPhone, du chevet au catalogue')
# visuels de marque (fil « Visuels de marque ») : la sélection pour le PDF, si elle est là
VM = SHARED / 'visuels-marque/selection-pdf'
VIS = {}
if VM.is_dir():
    for f in sorted(VM.glob('0*.jpg')): VIS[f.name[:2]] = img(f, 'vm-' + f.stem, maxw=1200)
# le cadran du sillage : vaporisation, 2 h, 8 h
SIL = sorted((CAP / 'sillage-magnetic-flowers').glob('*.jpg'))
for i, k in ((0, 'v'), (len(SIL) // 2, 'm'), (len(SIL) - 1, 'f')):
    S[f'sil-{k}'] = img(SIL[i], f'sillage-{k}', maxw=1400)

LOGO = (LIV / 'img/logo.svg').read_text()
LOGO_P = (LIV / 'img/logo-paris.svg').read_text()
pages = []


def page(body, cls='', num=True):
    n = len(pages) + 1
    chrome = f'<div class="foot"><span>LIBRERY · Depuis le 12 octobre</span><span>{n:02d}</span></div>' if num else ''
    pages.append(f'<section class="pg {cls}">{chrome}{body}</section>')


def head(n, t, sub=''):
    return f'<header class="hd"><span class="hd__n">{n}</span><h2>{t}</h2><p>{sub}</p></header>'


def browser(im, x, y, w, href='/'):
    return f'''<a class="br" href="{URL}{href}" style="left:{x}px;top:{y}px;width:{w}px;font-size:{w / 1000 * 16:.2f}px"><span class="br__bar"><i></i><i></i><i></i>
      <span class="br__url">librery-refonte.vercel.app</span></span><span class="br__scr"><img src="{im[0]}"></span></a>'''


def phone(im, x, y, outer, href='/'):
    inner = outer / (1 + 2 * 9 / 290)
    return f'<a class="ph" href="{URL}{href}" style="left:{x}px;top:{y}px;width:{inner:.1f}px;font-size:{inner / 290 * 16:.2f}px"><span class="ph__scr"><img src="{im[0]}"><span class="ph__island"></span></span></a>'


def shot(im, note='', tag='', cls=''):
    path, (w, h) = im
    t = f'<b class="tag tag--b">{tag}</b>' if tag else ''
    cap = f'<figcaption>{t}<span>{note}</span></figcaption>' if (note or tag) else ''
    return f'<figure class="sh {cls}">{cap}<span class="sh__img"><img src="{path}" style="aspect-ratio:{w}/{h}"></span></figure>'


def done(items):
    return '<ul class="done">' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'


def change(n, title, sub, body, items, cls='', extra=''):
    page(head(n, title, sub) + f'''<div class="ch"><aside class="ch__side">{done(items)}{extra}</aside>
      <div class="ch__main">{body}</div></div>''', cls)


def hidden():
    return '<p class="hid">Masqué pour l’instant</p>'


# ---------------------------------------------------------------- couverture
page(f'''
  <div class="cover">
    <p class="kick">Site internet · 15 octobre 2026</p>
    <div class="cover__mark">{LOGO}</div>
    <p class="cover__sub">Depuis le<br>12 octobre.</p>
    <p class="cover__lead">Vos derniers retours appliqués, la 3D que nous avons préparée<br>(masquée pour l’instant), et le site de ce week-end.</p>
  </div>
  {browser(S['we-home'], 640, 205, 830)}
  {phone(S['we-home-m'], 1290, 300, 236)}''', 'dark', num=False)

# ---------------------------------------------------------------- sommaire
TOC = ['Les notes de Skin Obsession', 'Le code recrédité', 'Les points de vente', 'Les moyens de paiement',
       'La fiche produit au nombre d’or', 'Le chevet, rendu dans Blender', 'Le cadran du sillage', 'L’effet feuille',
       'Le site de ce week-end'] + (['Visuels de marque'] if VIS else []) + ['La suite']
page(f'''
  <div class="glance">
    <div>
      <p class="kick">Ce qui a changé</p>
      <h1>Depuis le PDF<br>du 12 octobre.</h1>
      <p class="lead">Vos retours du 12 au 14 octobre sont appliqués. Nous avons aussi préparé la 3D de l’accueil et des fiches :
      elle est prête, mais masquée sur le site pour l’instant, comme convenu.</p>
      <p class="lead muted">Le site qui part en ligne ce week-end reprend le format d’avant, avec moins d’animations.</p>
    </div>
    <ol class="toc">{''.join(f'<li{" class=sep" if i in (5, 8) else ""}><span>{i + 1:02d}</span><div>{t}</div></li>' for i, t in enumerate(TOC))}</ol>
  </div>''')

# ---------------------------------------------------------------- vos retours
change('01', 'Les notes de Skin Obsession', 'Les notes principales revues avec Rafiq.',
       f'<div class="pair">{shot(S["pdp-mf"], "Magnetic Flowers")}{shot(S["pdp-tl"], "Tonka Love")}</div>',
       ['Les notes principales des trois parfums Skin Obsession, revues avec Rafiq',
        'Dans les listes de notes, plus de « Accord » ni de « FirAbs »',
        'Magnetic Flowers garde la tubéreuse'])
change('02', 'Le code recrédité', 'Réservé au Coffret Découverte 2 ml, valable 30 jours.',
       f'<div class="pair">{shot(S["coffret"], "La fiche du Coffret Découverte")}{shot(S["services"], "La page Services")}</div>',
       ['La valeur du Coffret Découverte 2 ml est recréditée en code, envoyé par e-mail',
        'À usage unique, valable 30 jours sur un flacon 100 ml',
        'Même texte sur la fiche, la page Services, la page Offrir et la collection Coffrets'], 'paper2')
change('03', 'Les points de vente', 'Votre liste du 13 octobre.',
       f'<div class="pair pair--one">{shot(S["stores"], "Recherche « Toulouse »")}</div>',
       ['Olfactions (Toulouse) ajouté, avec son site', 'Imm Couture et Odor BXL retirés'])
change('04', 'Les moyens de paiement', 'Les logos officiels, en pied de page.',
       f'<div class="pair pair--wide">{shot(S["pied"], "Ordinateur")}{shot(S["pied-m"], "iPhone")}</div>',
       ['Carte bancaire, Visa, Mastercard, American Express, Apple Pay, Google Pay, Shop Pay et PayPal',
        'Les logos officiels de chaque moyen de paiement'], 'paper2')
change('05', 'La fiche produit', 'Le flacon cadré au nombre d’or.',
       f'<div class="pair pair--wide">{shot(S["pdp-tl"], "Ordinateur")}{shot(S["pdp-vp-m"], "iPhone")}</div>',
       ['Le packshot est cadré sur la hauteur visible de l’écran : le flacon occupe 1/φ du cadre',
        'La même règle sur ordinateur et sur téléphone'])

# ---------------------------------------------------------------- la 3D
page(f'''<div class="div3d"><p class="kick">Chapitre suivant</p><h1>La 3D,<br>prête mais <i>masquée.</i></h1>
  <p class="cover__lead">Ce que nous avons préparé ces derniers jours. Rien de cela n’est visible sur le site pour l’instant :
  tout est gardé et se réactive d’un simple interrupteur, quand nous l’aurons perfectionné ensemble.</p></div>''', 'dark', num=False)

page(head('06', 'Le chevet, rendu dans Blender', 'Une séquence d’images qui s’anime au défilement.') + f'''
  <div class="ch">
    <aside class="ch__side">{done(['Ce ne sera plus de la 3D calculée dans le navigateur : une séquence d’images rendues dans Blender, en haute définition',
      'La séquence s’anime au défilement : plus on descend, plus la caméra avance vers le catalogue. Plus fluide sur téléphone, net sur écran Retina',
      'Le flacon en clair-obscur, le plateau en noyer, le catalogue posé dessus',
      '121 images par format ; la version iPhone est terminée, la version ordinateur suit'])}{hidden()}</aside>
    <div class="ch__main chevm"><div class="chev">{shot(S['ch000'], CH_LBL[0])}{shot(S['ch064'], CH_LBL[1])}{shot(S['ch082'], CH_LBL[2])}</div>
      {shot(S['planche'], CH_LBL[3], cls='sh--plain')}</div>
  </div>''', 'paper2')

page(head('07', 'Le cadran du sillage', 'De la vaporisation à 8 h, sur chaque fiche parfum et dans le Lexique.') + f'''
  <div class="ch">
    <aside class="ch__side">{done(['Le flacon en 3D, vu de dessus ; son ombre tourne comme sur un cadran solaire',
      'Une onde aquarelle fait le tour du cadran, colorée par les notes du parfum',
      'Tête, cœur, fond : les notes du moment s’affichent en grand',
      '« Laisser le temps passer » joue les huit heures en sept secondes'])}{hidden()}</aside>
    <div class="ch__main sil">{shot(S['sil-m'], '2 h : le cœur', cls='sil__big')}<div class="sil__row">{shot(S['sil-v'], 'Vaporisation')}{shot(S['sil-f'], '8 h : le fond')}</div></div>
  </div>''')

page(head('08', 'L’effet feuille', 'Les photos se posent comme des tirages sur papier.') + f'''
  <div class="ch">
    <aside class="ch__side">{done(['À l’ouverture de l’accueil et dans les deux mosaïques de campagne',
      'Les photos se courbent comme une feuille, puis se posent à plat',
      'Sans 3D, ou si « réduire les animations » est activé, les photos s’affichent simplement'])}{hidden()}</aside>
    <div class="ch__main">{shot(S['feuille-d'], 'Ordinateur')}{shot(S['feuille-m'], 'iPhone', cls='sh--plain')}</div>
  </div>''', 'paper2')

# ---------------------------------------------------------------- le site du week-end
page(head('09', 'Le site de ce week-end', 'Le format d’avant, avec moins d’animations.') + f'''
  <div class="ch">
    <aside class="ch__side">{done(['Le film Skin Obsession de retour en ouverture de l’accueil',
      'Le nouveau film, au bouchon doré, en tête de la collection Summer Vibes',
      'L’accueil et la Préface reprennent leur mise en page du 12 octobre',
      'Toutes vos corrections de contenu sont gardées',
      'Animations et 3D masquées, pas supprimées'])}</aside>
    <div class="ch__main"><div class="we">
      <div class="we__row">{shot(S['we-home'], 'L’accueil')}{shot(S['we-home-m'], '')}</div>
      <div class="we__row">{shot(S['we-summer'], 'Summer Vibes')}{shot(S['we-summer-m'], '')}</div>
    </div></div>
  </div>''')

if VIS:
    por = ''.join(shot(VIS[k]) for k in ('01', '03', '04', '05', '07') if k in VIS)
    lan = ''.join(shot(VIS[k]) for k in ('06', '08') if k in VIS)
    page(head('10', 'Visuels de marque', 'L’écrin, le fourreau et le flacon, sur fond ivoire.') + f'''
  <div class="ch">
    <aside class="ch__side">{done(['Créés d’après vos photos du coffret Magnetic Flowers et nos packshots',
      'L’objet complet : écrin, fourreau, carte et flacon, sur un fond épuré ivoire, cadré au nombre d’or',
      'Ils prendront place par petites touches : galeries des fiches, mosaïque des coffrets, sommaire',
      'Avec vos photos des packagings, nous compléterons la série'])}<p class="hid">Proposition, pas encore en ligne</p></aside>
    <div class="ch__main vm"><div class="vm__por">{por}</div><div class="vm__lan">{lan}</div></div>
  </div>''', 'paper2')

page(f'''
  <div class="ready">
    <div><p class="kick">Et ensuite</p><h1>La suite.</h1>
      <p class="lead">Dès réception, nous l’intégrons au site.</p></div>
    <ul>
      <li><b>Shopify</b>Le thème et l’import sont prêts : passage sur libreryparfum.com dès les accès à la boutique</li>
      <li><b>Vos photos</b>Packagings, fourreaux et coffrets, pour les visuels de marque</li>
      <li><b>Bougies</b>Photos et textes, pour rouvrir la page</li>
      <li><b>Boutiques</b>La liste des nouveaux points de vente</li>
      <li><b>La 3D</b>À retravailler ensemble avant de la réactiver</li>
    </ul>
  </div>''', 'paper2')

page(f'''
  <div class="end">
    <div class="end__mark">{LOGO_P}</div>
    <a class="cta cta--big" href="{URL}">Voir le site <span>↗</span></a>
    <p class="cover__url">librery-refonte.vercel.app</p>
  </div>''', 'dark', num=False)

NNBSP, NBSP = ' ', ' '


def typo(t):
    t = re.sub(r'«\s+', '«' + NNBSP, t)
    t = re.sub(r'\s+»', NNBSP + '»', t)
    t = re.sub(r'\s+([:;?!])', NNBSP + r'\1', t)
    t = re.sub(r'(\d) (ml|h|€|%|s)\b', r'\1' + NBSP + r'\2', t)
    return t


body = re.sub(r'>([^<]+)<', lambda m: '>' + typo(m.group(1)) + '<', ''.join(pages))
FF = [('Libre Caslon Display', 'normal', 400, 'LibreCaslonDisplay-normal-400'), ('Libre Caslon Text', 'normal', 400, 'LibreCaslonText-normal-400'),
      ('Libre Caslon Text', 'italic', 400, 'LibreCaslonText-italic-400'), ('Hanken Grotesk', 'normal', 400, 'HankenGrotesk-normal-400'),
      ('Hanken Grotesk', 'normal', 500, 'HankenGrotesk-normal-500')]
fonts = ''.join(f"@font-face{{font-family:'{f}';font-style:{s};font-weight:{w};src:url('{(FONTS / (n + '-' + sub + '.woff2')).as_uri()}') format('woff2')}}"
                for f, s, w, n in FF for sub in ('latin', 'latin-ext'))
css = fonts + (LIV / 'livraison.css').read_text() + (REPO / 'retours/pdf/retours.css').read_text() + (root / 'recap.css').read_text()
doc = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>LIBRERY — Depuis le 12 octobre</title>
<style>{css}</style></head><body>{body}</body></html>'''
(root / 'recap.html').write_text(doc, encoding='utf8')
print(len(pages), 'pages')
