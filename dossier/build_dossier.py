"""Dossier de présentation de la refonte LIBRERY : génère dossier.html (A4 à l'italienne),
puis render.js l'imprime en PDF avec Chromium."""
import pathlib

root = pathlib.Path(__file__).parent
LOGO = (root / 'img/logo.svg').read_text()
LOGO_P = (root / 'img/logo-paris.svg').read_text()
pages = []


def page(run, body, cls='', folio=True):
    n = len(pages) + 1
    head = '' if not run else f'<div class="run"><span>LIBRERY — Refonte du site</span><span>{run}</span></div>'
    foot = '' if not folio else f'<div class="folio">p. {n}</div>'
    pages.append(f'<section class="page {cls}">{head}<div class="body">{body}</div>{foot}</section>')
    return n


def img(src, cls='', cap=''):
    c = f'<figcaption>{cap}</figcaption>' if cap else ''
    return f'<figure class="{cls}"><img src="img/{src}.jpg">{c}</figure>'


def desk(src, cap='', cls=''):
    return f'<figure class="desk {cls}"><div class="scr"><img src="img/{src}.jpg"></div>{"<figcaption>" + cap + "</figcaption>" if cap else ""}</figure>'


def phone(src, cap='', cls=''):
    return f'<figure class="phone {cls}"><div class="scr"><img src="img/{src}.jpg"></div>{"<figcaption>" + cap + "</figcaption>" if cap else ""}</figure>'


def chapter(num, title, sub, image):
    at[num] = len(pages) + 1
    return page('', f'''
      <div class="chap">
        <div class="chap__txt"><span class="chap__n">{num}</span><h1>{title}</h1><p>{sub}</p></div>
        <div class="chap__img"><img src="img/{image}.jpg" ></div>
      </div>''', 'page--chap', folio=False)


# ------------------------------------------------------------------ couverture
page('', f'''
  <div class="cover">
    <img class="cover__bg" src="img/a-hero-portrait.jpg">
    <div class="cover__scrim"></div>
    <div class="cover__top"><span>Dossier de présentation</span><span>Septembre 2026</span></div>
    <div class="cover__mark">{LOGO}</div>
    <div class="cover__bottom">
      <div><p class="cover__title">La refonte du site</p>
        <p class="cover__sub">Ce qui a été fait, pourquoi, et ce qui reste à faire avant Shopify.</p></div>
      <p class="cover__url">Maquette en ligne<br><b>librery-refonte.vercel.app</b></p>
    </div>
  </div>''', 'page--cover', folio=False)

# ------------------------------------------------------------------ sommaire
toc = [('En bref', 'bref'), ('I. Le point de départ', 'I'), ('II. Ce que font les grandes maisons', 'II'),
       ('III. La direction artistique', 'III'), ('IV. Les images', 'IV'), ('V. Le site, page par page', 'V'),
       ('VI. Qualité et contrôles', 'VI'), ('VII. Passage sur Shopify', 'VII'), ('À valider', 'val')]
at = {}
page('Sommaire', '<div class="toc"><h2 class="h1">Sommaire</h2><ol>' + ''.join(
    f'<li><span class="t">{t}</span><span class="dots"></span><span class="f">@@{f}@@</span></li>' for t, f in toc)
    + '</ol></div><div class="toc__img"><img src="img/a-catalogue-couverture.jpg"><p class="cap">Le catalogue LIBRERY, source des images et des textes du nouveau site.</p></div>', 'page--toc')

# ------------------------------------------------------------------ en bref
at['bref'] = len(pages) + 1
page('En bref', '''
  <div class="cols2">
    <div>
      <p class="kicker">En bref</p>
      <h2 class="h1">Un site qui se lit comme le catalogue.</h2>
      <p class="lede">LIBRERY se présente comme une bibliothèque olfactive : chaque collection est un livre, chaque parfum un chapitre. Le nouveau site prend cette idée au pied de la lettre, avec un sommaire, des numéros de page et des légendes de figures. Il ajoute les services que proposent aujourd’hui les grandes maisons de niche.</p>
      <p>La maquette reprend la structure et les textes voulus par Nolwenn, les images sélectionnées pour le catalogue et les packshots studio. Chaque bloc est pensé pour devenir une section Shopify, que nous installerons nous-mêmes une fois la maquette validée.</p>
    </div>
    <div class="figs">
      <div class="fig"><b>18</b><span>maisons de niche étudiées, de Byredo à Maison Crivelli</span></div>
      <div class="fig"><b>22</b><span>packshots studio sur fond blanc, seule source des flacons sur fond clair</span></div>
      <div class="fig"><b>11</b><span>modèles de page, chacun pensé d’abord pour le mobile</span></div>
      <div class="fig"><b>70</b><span>vues vérifiées automatiquement, ordinateur et mobile, à chaque version</span></div>
    </div>
  </div>''')

# ------------------------------------------------------------------ I. point de départ
chapter('I', 'Le point de départ', 'Le site actuel, libreryparfum.com : ce qui fonctionne, ce qui freine la vente.', 'old-hero-crop')

page('I. Le point de départ', f'''
  <div class="grid-old">
    {desk('old-libreryparfum_com', 'Accueil actuel. Image de fond générée en 3D, titre en italique, une seule collection mise en avant.')}
    {desk('old-all', 'Liste des produits. Titre « Produits » et libellé « Filters » en anglais, flacons en rendu 3D sur fond sauge.')}
    {phone('old-libreryparfum_com-m', 'Mobile actuel.')}
  </div>''')

page('I. Le point de départ', f'''
  <div class="cols-img">
    {desk('old-hot_sand', 'Fiche produit actuelle : le format 2 ml est présélectionné, le prix affiché est donc 6,00 € au lieu de 170 €.')}
    <div>
      <p class="kicker">Diagnostic</p>
      <h2 class="h2">Six freins identifiés</h2>
      <ol class="num">
        <li><b>Des images qui ne sont pas celles de la marque.</b> Les flacons sont des rendus 3D sur fond sauge ; les vraies photographies réalisées depuis pour le catalogue ne sont pas utilisées.</li>
        <li><b>Une collection absente.</b> Seul Summer Vibes est présenté ; Skin Obsession, la nouveauté, n’apparaît pas.</li>
        <li><b>Un prix trompeur.</b> Sur la fiche, le 2 ml est choisi par défaut : le flacon semble coûter 6 €.</li>
        <li><b>Deux univers typographiques</b> qui ne se répondent pas : titres italiques bordeaux, texte en sans-serif arrondie.</li>
        <li><b>Des contenus qui apparaissent au défilement</b> et restent invisibles tant qu’on ne s’y arrête pas.</li>
        <li><b>Aucun accompagnement</b> : ni échantillon expliqué, ni coffret, ni aide au choix, ni familles olfactives.</li>
      </ol>
    </div>
  </div>''')

page('I. Le point de départ', '''
  <div class="cols2">
    <div>
      <p class="kicker">Le brief</p>
      <h2 class="h1">Trois sources, une seule histoire.</h2>
      <p class="lede">Rien n’a été inventé : le nouveau site assemble ce que la marque possède déjà.</p>
    </div>
    <div class="list-src">
      <div><span class="n">1</span><h3>Les documents de Nolwenn</h3><p>La structure du site et ses 28 pages de textes, les inspirations (Ex Nihilo, Byredo, D’Orsay), l’idée du flacon 30 ml au survol, la carte des points de vente.</p></div>
      <div><span class="n">2</span><h3>Le catalogue InDesign</h3><p>Les images de campagne, les natures mortes et les textes sélectionnés, avec leurs numéros de page, repris tels quels.</p></div>
      <div><span class="n">3</span><h3>Les packshots studio</h3><p>22 prises de vue sur fond blanc, huit parfums, en 100 ml et 30 ml. Seule source autorisée pour un flacon sur fond clair.</p></div>
      <div><span class="n">+</span><h3>Trois exigences</h3><p>Un mobile aussi soigné que l’ordinateur, le logo officiel (et non un texte composé), et tout transférable sur Shopify.</p></div>
    </div>
  </div>''')

# ------------------------------------------------------------------ II. maisons
chapter('II', 'Ce que font les grandes maisons', 'Quatre études, dix-huit sites visités page par page : accueil, liste, fiche produit, panier, services.', 'a-poire-livres')

houses = [
    ('Étude 1', 'Ex Nihilo · D’Orsay · Diptyque · Matière Première'),
    ('Étude 2', 'Byredo · Le Labo · Francis Kurkdjian · Frédéric Malle'),
    ('Étude 3', 'Parfums de Marly · Initio · Xerjoff · Nishane · Kilian'),
    ('Étude 4', 'Penhaligon’s · Serge Lutens · Memo Paris · Maison Crivelli · Amouage'),
]
page('II. Les grandes maisons', f'''
  <div class="cols2">
    <div>
      <p class="kicker">Méthode</p>
      <h2 class="h2">Dix-huit maisons, les mêmes réflexes</h2>
      <p>Chaque site a été parcouru comme un client : accueil, liste des parfums, fiche produit, panier, services. Les constats sont notés « observé » ou « déduit » quand un site bloquait la visite automatisée (Kurkdjian, Frédéric Malle, Kilian).</p>
      <ul class="houses">{''.join(f'<li><span>{a}</span>{b}</li>' for a, b in houses)}</ul>
    </div>
    <div class="refs">{img('ref-exn', '', 'Ex Nihilo')}{img('ref-dip', '', 'Diptyque')}{img('ref-lelabo', '', 'Le Labo')}{img('ref-byredo', '', 'Byredo')}</div>
  </div>''')

page('II. Les grandes maisons', '''
  <p class="kicker">Ce qui revient partout</p>
  <h2 class="h2">Six constats</h2>
  <div class="six">
    <div><span class="n">1</span><h3>On essaie avant d’ouvrir</h3><p>Un échantillon du parfum acheté accompagne le flacon ; s’il ne convient pas, le flacon scellé revient gratuitement. Byredo, D’Orsay, Diptyque, Memo Paris.</p></div>
    <div><span class="n">2</span><h3>Le coffret se rembourse</h3><p>Le prix du coffret découverte est recrédité sur un grand flacon. Ex Nihilo, D’Orsay, Matière Première, Memo Paris, Frédéric Malle, Amouage, Xerjoff.</p></div>
    <div><span class="n">3</span><h3>On compose son coffret</h3><p>Le client choisit ses échantillons, avec un compteur « 0 / 5 ». Diptyque, Matière Première, Ex Nihilo, Initio.</p></div>
    <div><span class="n">4</span><h3>Les échantillons se choisissent au panier</h3><p>Deux échantillons offerts, présélectionnés et modifiables. D’Orsay, Parfums de Marly, Maison Crivelli, Serge Lutens.</p></div>
    <div><span class="n">5</span><h3>La matière est racontée</h3><p>Concentration affichée, matières et origines, parfumeur crédité, trois notes clés sur la carte. D’Orsay, Crivelli, Amouage, Frédéric Malle.</p></div>
    <div><span class="n">6</span><h3>Le design se tait</h3><p>Deux polices au plus, petites étiquettes sobres, grilles régulières, ni texture ni dégradé. Aucune remise contre l’inscription à la newsletter.</p></div>
  </div>''')

rows = [
    ('Essayer avant d’ouvrir', 'Byredo, D’Orsay, Diptyque, Memo Paris', 'Un 2 ml du même parfum ajouté d’office au panier ; retour offert si le flacon reste scellé'),
    ('Échantillons au choix', 'D’Orsay, Parfums de Marly, Crivelli, Serge Lutens', 'Deux 2 ml offerts, présélectionnés dans le panier, modifiables'),
    ('Coffret recrédité', 'Ex Nihilo, Matière Première, Memo, Amouage', 'Code de la valeur du coffret, 90 jours, sur un 100 ml'),
    ('Coffret à composer', 'Diptyque, Matière Première, Initio', 'Cinq parfums en 2 ml, compteur « 0 / 5 »'),
    ('Notes clés sur la carte', 'D’Orsay', 'Trois notes sous le nom, puis 100 ml et 30 ml avec leur prix'),
    ('Familles olfactives', 'Parfums de Marly, Byredo, Memo Paris', 'Rangée « Par famille olfactive », filtre, familles sur la fiche'),
    ('Questionnaire', 'D’Orsay, Penhaligon’s', 'Portrait olfactif en quatre questions, pour soi ou pour offrir'),
    ('Parfumeur crédité', 'Frédéric Malle, D’Orsay, Crivelli', 'Bloc parfumeur, biographie et citation'),
    ('Preuve produit', 'Maison Crivelli, Amouage', 'Extrait 25 %, « lecture des matières » du catalogue'),
    ('Promesses sous le bouton', 'Parfums de Marly, Memo Paris', 'Date de livraison estimée, écrin, échantillons, retours'),
    ('Écrin et message', 'Kurkdjian, Kilian, Frédéric Malle', 'Écrin offert, mot manuscrit, facture sans prix'),
    ('Carte des boutiques', 'Matière Première (inspiration de Nolwenn)', 'Carte des 13 points de vente, recherche et filtre par pays'),
]
page('II. Les grandes maisons', '''
  <p class="kicker">Ce que nous avons repris</p>
  <h2 class="h2">De l’analyse au site</h2>
  <table class="tbl"><thead><tr><th>Fonction</th><th>Vue chez</th><th>Sur le site LIBRERY</th></tr></thead><tbody>'''
     + ''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>' for a, b, c in rows) +
     '''</tbody></table>
  <p class="note">Écartés pour l’instant : gravure, recharges, avis clients et conseiller automatisé. Ils demandent une organisation physique ou un volume de commandes que la marque n’a pas encore.</p>''')

# ------------------------------------------------------------------ III. DA
chapter('III', 'La direction artistique', 'Minimaliste sans être vide, et surtout : ne pas ressembler à un site généré.', 'a-hero-emotion')

page('III. Direction artistique', f'''
  <div class="cols-img">
    <div class="duo">{desk('v1-home', 'Première maquette')}{desk('v1-pdp', 'Première maquette, fiche produit')}</div>
    <div>
      <p class="kicker">Éviter l’effet « généré »</p>
      <h2 class="h2">Une première version mesurée, puis corrigée</h2>
      <p>La première maquette accumulait les tics des sites produits à la chaîne. Nous l’avons mesurée face aux sites de référence :</p>
      <table class="tbl tbl--small"><tbody>
        <tr><td>Petites capitales dorées</td><td>96 sur l’accueil</td><td>0 à 10 chez les références</td></tr>
        <tr><td>Éléments en italique</td><td>53 sur l’accueil</td><td>quasi absents</td></tr>
        <tr><td>Polices</td><td>3 + une écriture script</td><td>2 au plus</td></tr>
        <tr><td>Contraste or sur ivoire</td><td>2,65 : 1</td><td>4,5 : 1 minimum</td></tr>
        <tr><td>Longueur de l’accueil</td><td>14 sections</td><td>6 à 8</td></tr>
        <tr><td>Texte par carte produit</td><td>5 lignes</td><td>2 à 3</td></tr>
      </tbody></table>
      <p>Tout a été retiré : grain, dégradés, animations d’apparition, pastilles, flèches, lettrines, signatures script.</p>
    </div>
  </div>''')

page('III. Direction artistique', f'''
  <div class="cols-img cols-img--r">
    <div>
      <p class="kicker">Le parti pris</p>
      <h2 class="h2">Le livre, et rien d’autre</h2>
      <p>Une seule idée, tenue partout : le site est un livre.</p>
      <ul class="dash">
        <li><b>Titre courant</b> en haut de chaque page : « LIBRERY — Summer Vibes ».</li>
        <li><b>Folios du catalogue</b> : Summer Vibes p. 14, Skin Obsession p. 32, Tonka Love p. 43. Le site et le catalogue se renvoient l’un à l’autre.</li>
        <li><b>Un vrai sommaire</b> sur l’accueil, avec points de conduite.</li>
        <li><b>Des légendes de figures</b> sous les images : « fig. 2 — Skin Obsession, la campagne ».</li>
        <li><b>Des chapitres</b> : collections, préface, lexique.</li>
      </ul>
    </div>
    {desk('d-home-toc', 'Le sommaire de l’accueil et la couverture du catalogue.')}
  </div>''')

swatches = [('Papier', '#f8f5ef'), ('Studio', '#f0eeef'), ('Filet', '#e2d8c9'), ('Or', '#b7916a'), ('Gris', '#6a6159'), ('Encre', '#2f2b28'), ('Espresso', '#3a2a1e')]
page('III. Direction artistique', f'''
  <div class="cols2">
    <div>
      <p class="kicker">Typographie</p>
      <div class="spec"><span class="spec__big">Aa</span><div><b>Libre Caslon</b><span>Titres et texte : un caractère de livre, dessiné d’après les fontes de William Caslon (XVIIIᵉ siècle).</span></div></div>
      <div class="spec"><span class="spec__big sans">Aa</span><div><b>Hanken Grotesk</b><span>Interface : boutons, prix, étiquettes. Discrète, à petite taille.</span></div></div>
      <p class="rule">Tonka <em>Love</em> · Vanilla <em>Plum</em> · Summer <em>Vibes</em></p>
      <p>L’italique n’est utilisé que pour le second mot des noms, comme chez Maison Crivelli. C’est la seule fantaisie, et elle devient une signature.</p>
    </div>
    <div>
      <p class="kicker">Couleurs</p>
      <div class="sw">{''.join(f'<div><span style="background:{c}"></span><b>{n}</b><i>{c}</i></div>' for n, c in swatches)}</div>
      <p style="margin-top:6mm">L’or n’est jamais utilisé pour du texte courant : seulement pour les filets et les numéros de page. Le brun espresso ferme chaque page, en pied de page.</p>
    </div>
  </div>''')

page('III. Direction artistique', f'''
  <div class="logo-page">
    <div class="logo-page__mark">{LOGO}</div>
    <div class="cols2">
      <div><p class="kicker">Le logo</p><h2 class="h2">Le vrai dessin, pas une police</h2>
        <p>La première maquette écrivait « LIBRERY » avec une police de caractères. Le lettrage officiel a été vectorisé à partir du logo de la marque : il est net à toutes les tailles, sur fond clair comme sur photo.</p></div>
      <div class="logo-page__paris">{LOGO_P}</div>
    </div>
  </div>''')

# ------------------------------------------------------------------ IV. images
chapter('IV', 'Les images', 'Une règle simple pour une cohérence totale.', 'a-tonka-capot')

page('IV. Les images', f'''
  <div class="cols-img">
    <div class="beforeafter">
      <figure><img src="img/old-all.jpg" class="crop-old"><figcaption>Avant : rendus 3D sur fond sauge</figcaption></figure>
      <figure><div class="packs"><img src="img/a-tonka-love-pack.jpg"><img src="img/a-tonka-love-pack30.jpg"></div><figcaption>Après : packshots studio, 100 ml et 30 ml à la même échelle</figcaption></figure>
    </div>
    <div>
      <p class="kicker">La règle</p>
      <h2 class="h2">Quatre principes</h2>
      <ol class="num">
        <li><b>Fond blanc = packshots du dépôt, et rien d’autre.</b> Les 22 prises de vue studio : le 100 ml et le 30 ml de chaque parfum.</li>
        <li><b>Une seule échelle.</b> Le flacon occupe environ 40 % du cadre, le 30 ml est plus petit que le 100 ml : toutes les grilles sont alignées.</li>
        <li><b>Aucun flacon retouché ni détouré.</b> Les images sont seulement recadrées ; le fond studio est prolongé pour laisser de l’air.</li>
        <li><b>Mises en scène = photos du catalogue</b> : campagne, natures mortes, flacons sur les livres.</li>
      </ol>
    </div>
  </div>''')

page('IV. Les images', f'''
  <p class="kicker">L’idée de Nolwenn</p>
  <h2 class="h2">Au survol, le parfum prend vie</h2>
  <div class="seq">
    {img('seq-0', '', '1. Le packshot 100 ml')}
    {img('seq-1', '', '2. Au survol, la mise en situation apparaît en fondu…')}
    {img('seq-2', '', '3. … avec un lent travelling arrière, comme un plan de film')}
    {img('seq-3', '', '4. Survoler « 30 ml » montre le flacon de voyage')}
  </div>
  <p class="note">Le document de Nolwenn proposait deux idées : le 30 ml au survol, puis une animation vidéo. Les deux sont réunies. Le site est prêt à recevoir de vraies vidéos ; sur mobile, on fait glisser l’image de la carte.</p>''')

# ------------------------------------------------------------------ V. pages
chapter('V', 'Le site, page par page', 'Ordinateur et mobile, conçus ensemble.', 'a-hero-skin')

page('V. Accueil', f'''
  <div class="row3">
    {desk('d-home-hero', 'Ouverture : une seule image de campagne, le logo, un lien. Pas de carrousel.')}
    {desk('d-home-skin', 'Skin Obsession, la nouveauté, en premier, avec son folio p. 32.')}
    {desk('d-home-shelf', 'L’étagère des matières : une nature morte par parfum.')}
  </div>
  <div class="row3">
    {desk('d-home-toc', 'Le sommaire, qui renvoie au catalogue en 3D et au PDF.')}
    {desk('d-home-summer', 'Summer Vibes, avec une grande image de campagne dans la grille.')}
    {desk('d-home-footer', 'Services, lettre de la maison, pied de page espresso.')}
  </div>''')

page('V. Accueil — mobile', f'''
  <div class="phones">
    {phone('m-home-hero', 'Ouverture')}{phone('m-home-skin', 'Première carte en pleine largeur')}{phone('m-home-toc', 'Le sommaire')}{phone('m-home-shelf', 'L’étagère, à faire glisser')}{phone('m-menu', 'Le menu')}
  </div>
  <p class="note center">Sur mobile, rien n’est une version réduite : chaque bloc a sa mise en page propre, pensée pour le pouce.</p>''')

page('V. Bibliothèque', f'''
  <div class="cols-img">
    <div class="stack">{desk('d-lib-fams', 'La rangée « Par famille olfactive » : cinq familles illustrées, avec le nombre de parfums.')}{desk('d-lib-gourmand', 'Un clic sur « Gourmand » : la grille se filtre, la dominante passe en premier.')}</div>
    <div>
      <p class="kicker">La Bibliothèque</p>
      <h2 class="h2">Chercher par collection ou par famille</h2>
      <p>Toutes les créations, rangées par chapitre : Skin Obsession, Summer Vibes, Coffrets. On filtre par collection, par famille olfactive, ou l’on trie par prix.</p>
      <p>Les familles (Gourmand, Floral, Fruité, Ambré, Boisé) sont reprises sur la fiche produit, dans le menu et dans le Lexique. Chaque carte donne le nom, trois notes clés et les deux formats avec leur prix.</p>
      <div class="phones phones--2">{phone('m-lib-fams', '')}{phone('m-lib-cards', '')}</div>
    </div>
  </div>''')

page('V. Fiche produit', f'''
  <div class="row2">
    {desk('d-pdp-top', 'Le 100 ml et le 30 ml côte à côte, puis le choix du format, le prix du flacon et l’ajout au panier.')}
    {desk('d-pdp-gallery', 'La galerie suit un rythme : deux packshots, une mise en situation, deux photos. Légendes « fig. ».')}
  </div>
  <div class="row2">
    {desk('d-pdp-story', 'Le récit du catalogue et la « lecture des matières » : tête, cœur, fond.')}
    {desk('d-pdp-perfumer', 'Le parfumeur, sa biographie et sa citation, puis « Sur la même étagère ».')}
  </div>''')

page('V. Fiche produit — mobile', f'''
  <div class="cols-img cols-img--r">
    <div>
      <p class="kicker">Acheter en confiance</p>
      <h2 class="h2">Tout ce qui rassure, sous le bouton</h2>
      <ul class="dash">
        <li>Le prix affiché est celui du flacon choisi, jamais celui de l’échantillon.</li>
        <li>« Essayer d’abord : échantillon 2 ml, 6 € », en lien discret.</li>
        <li>« Essayez-le avant de l’ouvrir » : le 2 ml accompagne chaque flacon.</li>
        <li>Date de livraison estimée, écrin et échantillons offerts.</li>
        <li>Le parfumeur crédité, les familles cliquables.</li>
        <li>Sur mobile, une barre d’achat reste visible quand le bouton sort de l’écran.</li>
      </ul>
    </div>
    <div class="phones phones--3">{phone('m-pdp-top', 'Galerie à glisser')}{phone('m-pdp-buy', 'Formats et promesses')}{phone('m-pdp-sticky', 'Barre d’achat')}</div>
  </div>''')

page('V. Collections et maison', f'''
  <div class="row3">
    {desk('d-coll', 'Page collection : image pleine largeur, titre, folio du catalogue.')}
    {desk('d-coll-mosaic', 'Mosaïque de campagne légendée, puis les chapitres du texte.')}
    {desk('d-preface', 'La Préface : manifeste, fondateur, extrait de parfum.')}
  </div>
  <div class="row3">
    {desk('d-preface-perf', 'Les trois parfumeurs, avec les parfums qu’ils ont signés.')}
    {desk('d-lexique', 'Le Lexique : concentrations, notes, familles, glossaire.')}
    {desk('d-carte', 'La Carte : les 13 points de vente, recherche et filtre par pays.')}
  </div>''')

page('V. Choisir et offrir', f'''
  <div class="row3">
    {desk('d-quiz', 'Portrait olfactif : quatre questions, pour soi ou pour offrir.')}
    {desk('d-offrir', 'Offrir : les idées rangées par budget, écrin et mot manuscrit.')}
    {desk('d-composer', 'Coffret à composer : cinq parfums en 2 ml, compteur « 0 / 5 ».')}
  </div>
  <p class="note">Trois portes d’entrée pour ceux qui ne savent pas encore quoi choisir : c’est là que les grandes maisons convertissent le plus.</p>''')

page('V. Panier et menu', f'''
  <div class="cols-img">
    <div class="stack">{desk('d-cart', 'Le panier : 2 ml du parfum acheté ajouté d’office, deux échantillons au choix, écrin offert, seuil de livraison.')}{desk('d-mega', 'Le menu : collections, aides au choix, familles.')}</div>
    <div class="phones phones--2">{phone('m-cart', 'Panier mobile')}{phone('m-carte', 'La Carte sur mobile')}</div>
  </div>''')

# ------------------------------------------------------------------ VI. qualité
at['VI'] = len(pages) + 1
page('VI. Qualité', '''
  <div class="cols2">
    <div>
      <p class="kicker">VI. Qualité et contrôles</p>
      <h2 class="h1">Rien n’est laissé au hasard.</h2>
      <p class="lede">À chaque version, un contrôle automatique parcourt toutes les pages et toutes les fiches, sur ordinateur et sur mobile.</p>
    </div>
    <ul class="checks">
      <li><b>Images nettes</b> : le navigateur reçoit la taille exacte dont il a besoin, au format WebP.</li>
      <li><b>Jamais d’ancienne image en cache</b> : chaque adresse d’image porte l’empreinte de son fichier.</li>
      <li><b>Aucune photo en double</b> sur une même page, aucun recadrage abusif.</li>
      <li><b>Grilles mobiles équilibrées</b> : jamais de carte seule en bout de ligne.</li>
      <li><b>Aucun lien mort</b>, aucune erreur de page, aucun défilement horizontal.</li>
      <li><b>Contrastes lisibles</b> : plus de texte doré sur fond ivoire.</li>
      <li><b>Chargement léger</b> : images chargées au fil de la lecture, animations limitées au survol.</li>
    </ul>
  </div>''')

# ------------------------------------------------------------------ VII. Shopify
chapter('VII', 'Passage sur Shopify', 'La maquette a été construite pour être transposée bloc par bloc.', 'a-hero-summer')

mapping = [
    ('Blocs de page (accueil, collection, préface…)', 'Sections du thème, modifiables dans l’éditeur Shopify'),
    ('Parfums et formats 100 / 30 / 2 ml', 'Produits et variantes, avec leurs packshots'),
    ('Notes, lecture des matières, folio, mise en situation', 'Métachamps produit'),
    ('Parfumeurs, familles, points de vente, matières', 'Métaobjets : une fiche par élément, réutilisée partout'),
    ('2 ml offert, deux échantillons au choix, écrin', 'Règles de panier et propriétés de ligne'),
    ('Coffret à composer', 'Produit groupé avec sélection de cinq parfums'),
    ('Code de la valeur du coffret, 90 jours', 'Automatisation Shopify Flow, envoi par e-mail'),
    ('Lettre de la maison', 'Formulaire client Shopify (Shopify Email ou Klaviyo)'),
]
page('VII. Shopify', '''
  <p class="kicker">Correspondances</p>
  <h2 class="h2">Chaque élément a sa place dans Shopify</h2>
  <table class="tbl"><thead><tr><th>Sur la maquette</th><th>Dans Shopify</th></tr></thead><tbody>'''
     + ''.join(f'<tr><td>{a}</td><td>{b}</td></tr>' for a, b in mapping) + '''</tbody></table>
  <div class="steps">
    <div><span class="n">1</span>Validation de la maquette</div>
    <div><span class="n">2</span>Accès sécurisés à la boutique</div>
    <div><span class="n">3</span>Thème, produits, contenus</div>
    <div><span class="n">4</span>Vérification complète, puis mise en ligne</div>
  </div>''')

# ------------------------------------------------------------------ à valider
at['val'] = len(pages) + 1
page('À valider', '''
  <div class="cols2">
    <div>
      <p class="kicker">À valider par la marque</p>
      <h2 class="h1">Avant la mise en ligne.</h2>
      <p class="lede">Quelques décisions appartiennent à la marque. Tout le reste est prêt.</p>
    </div>
    <ol class="num">
      <li><b>Les prix</b> du 30 ml (75 €) et des coffrets : Découverte 18 € ou 30 €, à composer 30 €, Collection 200 € ou 320 €.</li>
      <li><b>Les notes de Vanilla Plum</b> : deux sources diffèrent ; la version du catalogue est affichée.</li>
      <li><b>Le classement par familles</b> : Boisé ne compte qu’un parfum, Tonka Love.</li>
      <li><b>Les conditions</b> : retour gratuit du flacon scellé, livraison offerte dès 100 €, coffret recrédité 90 jours.</li>
      <li><b>Deux services proposés</b> : consultation privée et initiales gravées (marqués « à confirmer »).</li>
      <li><b>Contenus complémentaires</b> : une mise en scène propre à Mango Wave, le film de campagne, les textes légaux et la liste des ingrédients.</li>
    </ol>
  </div>''')

# ------------------------------------------------------------------ dos
page('', f'''
  <div class="back">
    <div class="back__mark">{LOGO_P}</div>
    <p>La bibliothèque olfactive.</p>
    <p class="back__url">librery-refonte.vercel.app</p>
  </div>''', 'page--back', folio=False)

for k, v in at.items():
    pages[:] = [pg.replace(f'@@{k}@@', str(v)) for pg in pages]
css = (root / 'dossier.css').read_text()
html = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>LIBRERY — La refonte du site</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500&family=Libre+Caslon+Display&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>{css}</style></head><body>{''.join(pages)}</body></html>'''
(root / 'dossier.html').write_text(html, encoding='utf8')
print(len(pages), 'pages')
