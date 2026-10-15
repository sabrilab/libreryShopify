# Passation — refonte du site LIBRERY

Dossier destiné à l'agent (ou à la personne) qui reprend le chantier. État au **15 octobre 2026**.
Il se lit dans l'ordre : l'essentiel (§0) suffit pour démarrer ; les annexes A, B, C décrivent le code fichier par fichier.

---

## 0. L'essentiel en une page

- **Le projet** : refonte du site de la maison de parfum **LIBRERY** (Paris), sous forme de **maquette statique** validée écran par écran avant le passage sur **Shopify**.
- **Deux dépôts, deux sites Vercel** :
  | Dépôt | Branche | Site | Rôle |
  |---|---|---|---|
  | `~/libreryShopify` (GitHub `sabrilab/libreryShopify`) | `claude/zen-sagan-nuppbn` | https://librery-refonte.vercel.app (dossier `maquette/`) | la boutique (maquette) |
  | `~/Projects/librery-catalogue-3d` (GitHub `sabrilab/librery-catalogue-3d`) | `main` | https://librery-catalogue-3d.vercel.app | le catalogue 3D feuilletable, intégré à la boutique (iframe) |
- **Publier = `git push`** : Vercel déploie chaque push. Ne jamais pousser sans le feu vert explicite de Sabri (« publie »).
- **Travailler en local** : `cd ~/libreryShopify/maquette && python3 build.py && npx -y serve@14 -l 4173 .` puis http://localhost:4173. Récapitulatif visuel des travaux : http://localhost:4173/_proto/ (dossier ignoré par git).
- **Règle d'or des pages** : on édite `maquette/src/*.html`, `maquette/assets/js/*.js`, `maquette/assets/css/style.css` ; on relance **toujours** `python3 build.py` (il assemble les pages à la racine de `maquette/`, versionne les fichiers `?v=` et régénère `assets/js/imgw.js`) ; on **commite les pages générées** (Vercel ne construit rien).
- **Tester comme un humain** : Playwright + Chrome headless avec la **vraie carte graphique** (`--use-angle=metal`), captures et petites vidéos (ffmpeg) à envoyer à Sabri. SwiftShader (rendu logiciel) est trop lent et bloque des IntersectionObserver : ne pas s'y fier pour la 3D.
- **Le client juge sur rendu**, sur ordinateur **et** sur iPhone : chaque livraison s'accompagne de captures ou d'une vidéo, avant/après quand c'est pertinent.

---

## 1. Les personnes et la façon de travailler

- **Sabri** : directeur artistique / chef de projet côté agence. Il écrit **en français**, souvent par **dictée vocale** (phrases longues, mots mal transcrits : « le son, le griffage » voulait dire « le grain, les griffures » ; « en haut » pour « en ligne »). Reformuler sa demande en une phrase avant d'agir quand c'est ambigu, et lui montrer vite le résultat.
  - Il veut **voir** : captures d'écran fréquentes, vidéos du défilement, planches avant/après, liens localhost.
  - Il valide en local, puis dit « publie ». Il aime qu'on propose des **variantes** (A, B, C, D…) quand une direction n'est pas claire, puis il choisit et demande d'« aller plus loin ».
  - Exigences constantes : **minimalisme premium, niveau « Awwwards »**, **nombre d'or** partout, **réalisme photographique** (pas d'« aspect IA »), **lumière tamisée / clair-obscur**, ombres **franches**, fluidité (pas d'à-coups, un seul mouvement continu).
- **Nolwenn** : interlocutrice côté LIBRERY (cliente). Elle envoie ses retours par WhatsApp (vocaux, captures) ou PDF annoté ; les images arrivent par WeTransfer. Les réponses à ses questions vont dans un PDF **sans citer ses messages** (seulement les corrections faites).
- **Interdits** : ne jamais coller de mot de passe ou de jeton dans le chat (variables d'environnement `SHOPIFY_FLAG_STORE`, `SHOPIFY_CLI_THEME_TOKEN`, `SHOPIFY_ADMIN_TOKEN`) ; **aucune génération d'image Higgsfield sans demande explicite** ; ne jamais agrandir (upscale) une photo de flacon par IA (lettrage réinventé) ; pas de photos détourées sur fond blanc (seuls les packshots officiels).

---

## 2. Où en est le site (15/10/2026)

> **Version simplifiée (15/10, retour de Nolwenn et Rafiq, mise en ligne visée pour le week-end)** : les animations du tableau
> ci-dessous sont **masquées, pas supprimées**. Interrupteur `ANIMATIONS = false` dans `maquette/assets/js/main.js` et
> `maquette/build.py` ; l'accueil et la Préface reprennent le balisage du 12/10 (film Skin Obsession, livre du catalogue,
> mosaïques légendées) ; le balisage animé est gardé dans `maquette/src/_anime/`. Le film de Sabri (bouchon doré) passe en
> tête de la collection Summer Vibes (`data.js`). Gardés : toutes les corrections de contenu, images de Nolwenn, nombre d'or,
> moyens de paiement. Pour réactiver : les deux interrupteurs à `true` et `src/_anime/*.html` à la place de `src/index.html`
> et `src/preface.html`.

**En ligne** depuis les commits `ead6a58` (boutique) et `88e3c77` (catalogue 3D), puis `7cc2f33` (« Feuilleter » dans le décor du chevet sur un vrai réseau, questions du Portrait olfactif) :

| Fonction | Où | Fichiers principaux |
|---|---|---|
| En-tête **A1 « recul et pile »** : le film Skin Obsession plein écran recule en tirage, des photos de campagne s'empilent, puis trois tirages se posent pile au-dessus des trois cartes Skin Obsession (Vanilla Plum, Magnetic Flowers, Tonka Love) | accueil, haut | `main.js` `initEntete`, `style.css` « Ouverture au défilement », `src/index.html` `section.entete` |
| **Chevet 3D** photoréaliste (commode Poly Haven, 18 flacons en clair-obscur sur deux étagères : Summer Vibes en haut, Skin Obsession en bas) : la caméra part de trois quarts et, **en un seul mouvement**, plonge à la verticale ; la table glisse et pivote pour que le catalogue **qui ne bouge jamais sur la table** tombe pile sur le livre CSS à droite ; puis le livre feuilletable (pages au défilement) | accueil, section `#catalogue` | `chevet3d.js`, `chevet-photo.js`, `assets/3d/chevet/`, `initFlip`, `.flip--chevet` |
| **« Feuilleter le catalogue » dans le même décor** : le catalogue 3D complet s'ouvre dans une iframe **sur la même image** (même table, même cadrage), sans glissement ; retour à l'identique | accueil → lecteur | `initLecteur` (mode `chevet`), catalogue : `src/chevet.js`, `src/plateau.js`, `src/integration.js`, `docs/chevet.md` |
| **Préchargement** des animations pendant l'écran de chargement LIBRERY (≤ 3 s ; prudent en 4G / Save-Data) | toutes les pages | `initLoader`, `initPrechauffe` |
| **Cadran du sillage** épuré : le vrai flacon 3D vu de haut, son ombre franche est l'aiguille sur un cercle Tête / Cœur / Fond ; une **onde colorée** (lavis) suit le cercle, teintée par les notes de chaque parfum ; pas d'intro | fiches produit `#sillage`, Lexique | `sillage3d.js` (palette `NOTES`), région horloge de `main.js` |
| **Photos de campagne en cascade 3D** : les photos arrivent une par une, les unes sous les autres, en profondeur (axe Z), dans un **quadrillage** fin en perspective (lignes d'or au nombre d'or) | mosaïques des collections et de l'accueil | `main.js` `initEdito` / `mosaic()` / `lattice()` |
| **Nombre d'or sur tous les packshots** (flacon = 1/φ de la hauteur du cadre, air au-dessus : air au-dessous = φ : 1 ; le 30 ml sur la même ligne de sol) | cartes, collections, fiches, panier, coffrets | `build.py` (mesure des packshots dans `IMGW`), `frameGold` |
| **Moyens de paiement** officiels en badges blanc cassé (logo découpé) | pied de page | `paiement.js` (`PAY_LOGOS`), `.pay` |
| **Images de Nolwenn (13/10)** : mosaïques Skin Obsession / Summer Vibes / Coffrets, tuiles Portrait olfactif (profil sur fond noir) et Nos adresses (bouchons dorés), Palmeira (bois strié), Mango Wave (reflet + mangue), familles olfactives (gros plans de matières) | voir planche `retours/nolwenn-13-10/avant-apres.jpg` | `data.js` (`FAMILY_ART`, `mosaic`, `scene`, `gallery`), `main.js` (`quizTile`, `storesTile`) |

Antérieur (déjà validé et en ligne) : retours de Nolwenn du 12/10 (prix, 25 boutiques, coffrets, film Skin Obsession, couverture du catalogue…), voir `retours/2026-10-12-nolwenn.md` et `retours/questions-nolwenn.md`.

---

## 3. Décisions validées par Sabri (ne pas revenir dessus sans lui)

- **En-tête** : variante **A** retenue parmi A/B/C/D, avec la fin **A1 « la donne »** (alignée sur la grille, plus rien de centré à la fin). Les prototypes des variantes restent dans `maquette/_proto/hero/`.
- **Chevet** :
  - une **seule courbe de caméra**, sans palier ni seconde accélération ;
  - le **catalogue reste immobile sur la table** ; c'est la table (la caméra) qui glisse et pivote pour l'amener à la place du livre ; **aucun livre centré** à aucun moment ;
  - à la fin : textes à gauche (encre sur papier), livre à droite **à la même place qu'avant**, table décalée à droite ; **aucune ombre sous la page de gauche** quand elle dépasse sur le papier (`.flip--chevet .flip__l { box-shadow: none }`) ;
  - flacons « sublimes » : direction **clair-obscur (Caravage) + or poli de la piste studio** ; dorures **sans aucune lueur** ; verre facetté plat ; jus lumineux de l'intérieur ; caustiques colorées ; grain fin, flou de profondeur ; plateau en **noyer 4k** net, sans traînées sur le bord avant.
- **Cadran du sillage** : garder la base (flacon + ombre-aiguille), **épurée** (un cercle en trois arcs, une ligne de lecture), avec l'onde colorée ; **pas d'intro** (pas de gros plan sur le vaporisateur, le flacon reste à sa place). Les autres pistes explorées (brume, strates, onde abstraite, journée) sont abandonnées.
- **Photos éditoriales** : une par une, **les unes sous les autres** (pas sur une même ligne), en **3D spatiale** (axe Z), traits en **quadrillage** (pas des traits qui relient).
- **Catalogue 3D** (site à part) : décor par défaut **noyer foncé** + studio ; en-tête = tracés du mot LIBRERY ; iPhone vertical = double page entière ; intro en lévitation (sauf en décor chevet) ; bouton « Mains » (MediaPipe) ; sons feutrés (ne pas remonter le niveau) ; mode cinéma.
- **Prix** : 100 ml 170 €, 30 ml 90 €, 2 ml 7 €, Coffret Découverte 2 ml 40 € (un seul coffret 8 × 2 ml), Coffret Collection 30 ml Summer Vibes 430 €, Skin Obsession 250 €. **Coffret à composer en pause** (`paused: true`).
- **Summer Vibes** : la collection est « intouchable » dans sa structure (mosaïque déclarée par collection, `tiles:'grid'`).

---

## 4. Règles de direction artistique

- Fond papier `#f8f5ef`, encre `#2f2b28`, or `#b7916a` ; typographies **Libre Caslon** (titres, texte) et **Hanken Grotesk** (petites capitales, interface).
- Packshots sur fond blanc : **uniquement** ceux du dépôt `librery-catalogue-3d` (`public/packshots/`), jamais de détourage.
- Images : réalistes, sans aspect IA ni grain artificiel ; flacon fidèle (bouchon doré carré à encoches en V, emblème LIBRERY gravé en creux sur le dessus, proportions d'un vrai 100 ml).
- Génération d'images (seulement sur demande) : GPT Image 2.5 qualité `max` / 4K ; Soul 2.0 pour les visages puis réintégration du flacon.
- Mise en page : **nombre d'or** (colonnes φ : 1, lignes d'or 0,382 / 0,618, rectangles 1 : φ) ; beaucoup d'air ; légendes numérotées « 01 — … » en petites capitales.
- Animation : liée au défilement, réversible, transformations seulement, 60 i/s, version « mouvement réduit » statique, rien qui « flotte bizarrement ».

---

## 5. Ce qui reste à faire (par ordre de priorité)

1. ~~« Feuilleter » en ligne~~ — **réglé et vérifié en ligne le 15/10 (`7cc2f33`)** : `CATALOGUE_DECOR_CHEVET = true`, cadre « chevet » préparé avant le clic, « Ouverture… » si l'on clique trop tôt, secours à 10 s. Mesures sur le site publié, cache vide : bascule finie 578 ms après le clic (ordinateur, visiteur qui défile), 829 ms (clic immédiat), 942 ms (iPhone émulé) ; l'adresse contient toujours `decor=chevet`. Test de bout en bout rejouable sur le site en ligne : `node tests/live-feuilleter.cjs desktop|mobile lecture|presse|bloque` (vrai GPU ; sorties, captures et film dans `tests/sorties/`, ignoré par git). Restent, côté catalogue : la couverture 3D un peu plus douce que celle du livre CSS (écart moyen 5/255, pas de décalage), les commandes du catalogue en anglais (« Click or drag a page », « Sound », « Download ») et un second téléchargement de `pages/uhd/p01.webp` au retour.
2. **Validation de Nolwenn** sur les images du 13/10 : légendes des mosaïques proposées par nous (« Skin Obsession, la collection », « La collection en 30 ml »…), image `summer-duo` (fournie mais absente de son PDF, non utilisée), photo carrée des 3 flacons sur les livres recadrée dans un cadre vertical.
3. **Vérifications sur vrai iPhone** : fluidité du chevet et de la cascade 3D (~50 lignes en 3D), Safari (barre du bas), grain.
4. **Détails 3D connus** : coins avant arrondis du plateau en facettes visibles au zoom ×2 (`plateau.glb`, partagé avec le catalogue) ; couverture du catalogue en 640 px (`assets/img/catalogue/p01.webp`) un peu molle en Retina — une version HD de la couverture serait utile ; jus clairs de Skin Obsession un peu ternes dans l'ombre.
5. **Préface** : les portraits des parfumeurs arrivent encore tous ensemble (le traitement « un par un » n'y est pas appliqué) — à proposer à Sabri.
6. **Shopify** : passage dès réception des accès (thème caché, prévisualisation, publication). Chaque section `src/*.html` porte un commentaire `SECTION : …` et `main.js` indique les snippets Liquid correspondants (`header.liquid`, `main-product.liquid`, `sillage.liquid`, `paiements.liquid`…). Les modules 3D et le catalogue en iframe se portent tels quels (fichiers statiques).
7. En attente côté cliente : photos packagings / coffrets / discovery manquantes, contenu Bougies (collection masquée `hidden: true`).
8. Piste non démarrée : agents WhatsApp (VPS OVH + API WhatsApp Cloud).
9. **À trancher par Sabri** : le dépôt de la boutique est public et contient les transcriptions des vocaux WhatsApp de la cliente (`retours/whatsapp/*.txt`, 16 fichiers) ainsi que ses retours. Passer le dépôt en privé (Vercel continue de déployer) ou retirer ces fichiers.

---

## 6. Pièges rencontrés (à connaître avant de lancer de gros rendus)

- **Disque du Mac** : il s'est rempli plusieurs fois à 0 octet (rendus, images de vidéos), ce qui fait tomber le serveur local et échouer les commits. Supprimer les dossiers d'images intermédiaires juste après l'encodage ffmpeg ; surveiller `df -h /`.
- **Visibilité des dépôts** : `sabrilab/libreryShopify` est **public** (`librery-catalogue-3d` est privé). Rien de secret ni de personnel (e-mails, numéros, jetons, médias WhatsApp) dans les fichiers suivis.
- **`/private/tmp` est vidé au redémarrage** : ne jamais y garder un livrable ; copier les images et vidéos utiles dans `maquette/_proto/travaux/media/` (ignoré par git) ou `retours/`.
- **Coupures réseau** (`ENOTFOUND`) : relancer simplement ; les sous-agents perdent leur travail en mémoire mais pas les fichiers.
- **Vercel / catalogue** : un commit dont l'auteur est l'adresse locale du Mac est bloqué sur le dépôt du catalogue ; ce dépôt est configuré avec l'e-mail noreply GitHub de sabrilab. Sur la boutique, les commits sont signés `Claude <noreply@anthropic.com>`.
- **Plusieurs agents en parallèle sur `main.js` / `style.css`** : n'éditer que la région concernée, par remplacements précis, relire avant d'éditer.
- **`sillage3d.js`, `chevet3d.js`, `chevet-photo.js`** sont versionnés via l'import map de `src/_head.html` : un import relatif `./x.js` depuis ces modules ne serait pas versionné (cache Vercel) — garder un seul fichier par module ou ajouter l'entrée à l'import map et à `build.py`.

---

## 7. Instructions à coller pour l'agent qui reprend

> Tu reprends la refonte du site LIBRERY. Lis `PASSATION.md` à la racine du dépôt `~/libreryShopify` (§0 à §6), puis `CLAUDE.md`. Travaille en local (`python3 build.py`, serveur `npx -y serve@14 -l 4173 .` dans `maquette/`), vérifie chaque changement en navigateur avec la vraie carte graphique (Playwright, `--use-angle=metal`) sur ordinateur 1440×900 **et** iPhone 390×844, et montre à Sabri des captures ou une vidéo avant de lui demander de valider. Ne pousse (= publication Vercel) que sur son « publie ». Respecte les décisions du §3 et la direction artistique du §4. Réponds en français.

---

# Annexes techniques (relecture du code, 15/10/2026)


## A. Maquette boutique (`/Users/svbri/libreryShopify/maquette`)

État lu au commit `ead6a58` (branche `claude/zen-sagan-nuppbn`, remote `https://github.com/sabrilab/libreryShopify.git`). Au moment de la lecture, `maquette/assets/js/main.js` était identique à HEAD (aucune modification dans l'arbre de travail). Le correctif « Feuilleter » publié ensuite (`7cc2f33`) est intégré à la description de `initLecteur` ci-dessous ; les autres numéros de ligne (`main.js` : 1970 lignes à la lecture, 2020 depuis) peuvent être décalés d'une cinquantaine de lignes après `initLecteur`.

### A.0 En bref
- Site statique HTML/CSS/JS sans framework, sans `package.json` et sans étape de build côté Vercel. `.vercelignore` exclut `src`, `build.py` et `_proto`. **Les pages assemblées à la racine de `maquette/` (`index.html`, `produit.html`…) et `assets/js/imgw.js` sont versionnées et servies telles quelles.** Il faut donc lancer `python3 build.py` en local puis committer les fichiers générés.
- Vercel (projet `librery-refonte`, URL https://librery-refonte.vercel.app) déploie depuis la branche, dossier `maquette/`. Réglages de `maquette/vercel.json` :
  - `cleanUrls: true`, `trailingSlash: false` ;
  - `Cache-Control: public, max-age=86400` sur `/assets/img/*` ;
  - `max-age=0, must-revalidate` sur `/assets/(css|js)/*` et `/parfum/*` ;
  - `X-Robots-Tag: noindex, nofollow` partout.
- Chaque bloc `<!-- SECTION : … -->` de `src/*.html` correspond à une future section du thème Shopify. Les commentaires de `main.js` indiquent la correspondance Liquid : `header.liquid`, `footer.liquid`, `cart-drawer.liquid`, `main-collection.liquid`, `main-product.liquid`, `sillage.liquid`, `icon.liquid`, `paiements.liquid`.

### A.1 Lancer en local
- Construire : `cd /Users/svbri/libreryShopify/maquette && python3 build.py`. Il faut Pillow (`from PIL import Image`). Le script affiche `ok <page>.html` pour chaque page.
- Servir : `npx -y serve@14 -l 4173 .` dans `maquette/` (commande de `CLAUDE.md`). `serve` applique les cleanUrls, donc `/produit?p=…` fonctionne. Un serveur tournait déjà sur `:4173` pendant cette lecture.
- `README.md` n'est plus à jour : il donne `npx serve .` sur le port 3000 et cite les polices « Cormorant/Marcellus », alors que le CSS utilise Libre Caslon et Hanken Grotesk.
- Paramètres d'essai :
  - `?cat=<url>` (sur localhost ou 127.0.0.1 seulement) : remplace `CATALOGUE_URL` dans `initLecteur`.
  - `?qualite=haute|mobile|basse` et les réglages `PARAMS` (ex. `?cle=1.8`) : lus par `chevet3d.js`.
  - `window.__prechauffe` : horodatages relevés par `initPrechauffe`.

### A.2 Pages et URL (cleanUrls)

| URL | src | `page` / `run` | Init JS |
|---|---|---|---|
| `/` | `src/index.html` (`body: page-home`) | `home` | `initEntete`, `initHome`, `initFlip`+`chevet`, `initEdito`, `filmControl` |
| `/bibliotheque[?f=<collection>&famille=<Famille>#familles]` | `bibliotheque.html` | `bibliotheque` / « La Bibliothèque » | `initLibrary` |
| `/collection?c=skin-obsession\|summer-vibes\|coffrets` | `collection.html` | `bibliotheque` (run = titre de la collection) | `initCollection` |
| `/produit?p=<handle>` | `produit.html` | `bibliotheque` | `initProduct` |
| `/preface[#parfumeurs]` | `preface.html` (4 scènes `data-ed`, 6 `{{pic}}`) | `preface` | `initEdito` |
| `/lexique` (ancres `#concentration #notes #familles-lexique #paliers #glossaire`) | `lexique.html` | `lexique` | `initFamilies`, `initLexClock` |
| `/points-de-vente` | `points-de-vente.html` (Leaflet 1.9.4 via jsDelivr, meta `scripts`) | `carte` / « La Carte » | `initStores` |
| `/portrait-olfactif` | `portrait-olfactif.html` | `portrait` | `initQuiz` |
| `/offrir` | `offrir.html` (`data-gift`) | `offrir` | `initGifts` |
| `/services`, `/contact` | idem | `services`, `contact` | `initContact` (`#contact-form`) |
| `/labo` | `labo.html` (+ `assets/css/labo.css`, `assets/js/labo.js`, 8 expériences) | `labo` | page non liée dans la navigation |
| `/parfum/` | `parfum/index.html` (visionneuse 3D du flacon : `flacon-100ml.glb`, `parfums.json`, `modele.json`, `studio.hdr`, `360/`, `labels/`) | — | chantier à part, **à ne pas montrer à la cliente** |
| `/livraison-site.pdf`, `/dossier-refonte.pdf`, `/video-site.mp4` | fichiers statiques à la racine | | |

- Ancres de l'accueil : `#catalogue` (section flip ; retour du lecteur vers le livre fermé), `#feuilleter` (lecteur ouvert), `#campagne` (posée en JS sur `[data-mosaic="skin-obsession"]`).
- Une collection masquée ou inconnue (`bougies`, `?c=toString`…) renvoie vers `summer-vibes` par `history.replaceState`.
- Un produit en pause (`coffret-a-composer`) renvoie vers `coffret-decouverte`.

### A.3 Assemblage : `build.py`
- La première ligne de chaque `src/<page>.html` est `<!-- title: … | page: … | body: … | run: … | folio: … | scripts: … -->` (regex `(\w+):\s*([^|]+?)\s*(?:\||-->)`). Dans `scripts`, `\n` est littéral.
- Pour chaque `src/[!_]*.html`, le script assemble :
  1. `src/_head.html`, avec `{{TITLE}}` remplacé par `title` ;
  2. `<body data-page="…" class="…" [data-run] [data-folio]>` (`data-folio` n'est lu par aucun script) ;
  3. le loader `<div class="loader" id="loader">` (SVG `logo-librery.svg` + `.loader__bar i`), puis `<div id="site-header">`, `<main>…</main>`, `<div id="site-footer">` ;
  4. les `scripts` de la page ;
  5. les scripts communs dans l'ordre `logo.js, imgw.js, data.js, paiement.js, main.js`, chacun suffixé `?v=<md5[:8]>` (fonction `ver`).
  - `style.css` reçoit aussi `?v=`, tout comme `sillage3d.js`, `chevet3d.js` et `chevet-photo.js` dans l'import map.
- Gabarits remplacés :
  - `{{pic nom|alt|sizes|eager}}` → `<img>` responsive (`nom-m.webp` + `nom.webp`, largeurs réelles ; `sizes` par défaut `(max-width: 900px) 100vw, 50vw` ; `fetchpriority="high"` si `eager`, sinon `loading="lazy"`) ;
  - `{{logo}}` (`logo-librery.svg`) et `{{logo-couverture}}` ;
  - toute adresse littérale `/assets/img/v2/<nom>(-m)?.webp"` reçoit `?v=<empreinte>`.
- **IMGW** : pour chaque paire `assets/img/v2/<n>-m.webp` + `<n>.webp`, le script calcule `IMGW[n] = [largeur petite, largeur grande, md5(petite+grande)[:8]]`. Il l'écrit dans `assets/js/imgw.js` (`const IMGW = {...}`, 90 entrées). Une image sans sa paire n'a pas d'entrée.
- **Mesure des packshots** (`gold(f)`) : seulement si le nom correspond à `PACKSHOT = /-pack(30)?$|^discovery-/` (22 images aujourd'hui : 8 `-pack`, 8 `-pack30`, 6 `discovery-*`).
  - L'image est réduite à 180 px de large. Un pixel est « produit » s'il s'écarte de plus de 28 niveaux du fond, interpolé entre les deux bords de sa rangée (l'ombre portée reste dehors).
  - Le script ajoute une 4ᵉ valeur `[x0, y0, x1, y1, h/l, "5 couleurs bord gauche + 5 couleurs bord droit"]` : boîte en fractions et teintes prélevées à 0, ¼, ½, ¾ et 1 de la hauteur.
- `head` (`src/_head.html`) contient :
  - Google Fonts : Hanken Grotesk 400/500, Libre Caslon Display, Libre Caslon Text 400 et italique ;
  - `<meta name="robots" content="noindex, nofollow">` ;
  - une import map : `three` → `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js`, `three/addons/` → `…/examples/jsm/`, `chevet3d`, `chevet-photo`, `sillage3d` → `/assets/js/…` ;
  - un script en ligne qui ajoute la classe `html.is-seen` si `sessionStorage['librery-vu']` existe (le loader ne s'affiche alors pas).

### A.4 Modèle de données : `assets/js/data.js`
Variables globales :
- `IMG='/assets/img/v2/'` ;
- `CATALOGUE_URL='https://librery-catalogue-3d.vercel.app/'` ;
- `CATALOGUE_PDF=…/telechargements/LIBRERY-catalogue-doubles-pages.pdf` (non utilisée dans `main.js` : l'URL du PDF est écrite en dur dans `src/index.html`) ;
- **`CATALOGUE_DECOR_CHEVET=true`** (depuis `7cc2f33`) : le catalogue en ligne a le décor « chevet » (contrat : `docs/chevet.md` du dépôt `librery-catalogue-3d`). Le repasser à `false` renvoie partout vers le lecteur habituel.

Autres objets :
- `FAMILIES` : 5 familles (`Gourmand`, `Floral`, `Fruité`, `Ambré`, `Boisé`), chacune avec sa phrase. `FAMILY_ART` : famille → image `famille-*`.
- `SERVICES` : 3 éléments `{i: icône vial|vials|parcel, t, d}`.
- `FORMATS` : `[{id:'100',price:170},{id:'30',price:90},{id:'2',price:7}]` (prix confirmés le 12/10).
- `PERFUMERS` : `chris-maurice`, `nathalie-feisthauer`, `coralie-spicher`, chacun `{name, role, image, works, bio[], quote?}`.
- `PRODUCTS` (11 déclarés ; 10 actifs après filtrage), champs :
  - `handle`, `name`, `collection` (`skin-obsession|summer-vibes|coffrets`), `folio` (numéro de page du catalogue, plus affiché), `isNew`, `exclusive`, `type:'Coffret'` (absent = parfum), `subtitle`, `perfumer`, `tagline`, `keyNotes` (séparateur ` · `), `families[]` (la première est la dominante) ;
  - visuels :
    - `pack` (packshot 100 ml) et `pack30` (30 ml) ;
    - `card` (repli si `pack` absent ; coffrets) ;
    - `scene` (mise en situation révélée au survol) ;
    - `video` (facultatif : boucle à la place de `scene`) ;
    - `gallery[]` (fiche produit, ordre d'affichage) ;
    - `fmtImages: {formatId: [images]}` (la galerie suit le format choisi ; ex. `coffret-collection` `sv`/`so`) ;
  - contenu : `formats[]` (remplace `FORMATS` ; coffrets `8x2` 40 €, `sv` 430 €, `so` 250 €), `description[]` (les 2 premiers paragraphes sont visibles, la suite est derrière « Lire la suite »), `coda[]`, `notes{tete,coeur,fond}`, `materials{title, list{tete,coeur,fond}, text[]}` (si `materials` existe, `materials.list` fait foi pour la pyramide et l'horloge) ;
  - `builder: 5` (coffret à composer) ;
  - **`paused: true`** : en fin de fichier, ces produits sont copiés dans `PAUSED_PRODUCTS` puis retirés de `PRODUCTS`. Aujourd'hui : `coffret-a-composer`. Pour le rallumer, supprimer `paused` et lui donner un prix.
- `COLLECTIONS` (`skin-obsession`, `summer-vibes`, `coffrets`, `bougies`), champs :
  - `title`, `chapter`, `epigraph`, `intro[]`, `chapters[{h,p[]}]` ;
  - `hero` (image de tête si pas de vidéo), `video` / `videoMobile` (boucle muette ; Skin Obsession : `/assets/video/skin-obsession(-m).mp4`) ;
  - `mosaic: [[img, légende]×3]` (cascade éditoriale), `wide` (grande tuile sur 2 colonnes dans les grilles), `tiles: 'end'|'grid'` (rangée de 3 tuiles en fin de page, ou une tuile dans la grille) ;
  - `soon` (formulaire « être prévenu ») ;
  - **`hidden: true`** (`bougies` : ôtée du méga-menu et de l'URL) ;
  - `folio`, `number`, `kicker` : non lus par `main.js` (données destinées à Shopify).
- `SHELF` : 7 éléments `{img, t, h}` pour l'étagère des matières de l'accueil.
- `STORES` : 25 éléments `{name, address, city, country, phone?, url?, lat, lng, note?, online?}`, géocodés avec Nominatim. `BeautyLIV` est `online: true` (sans repère sur la carte).

Petits fichiers générés à côté :
- `logo.js` : `LOGO_SVG`.
- `paiement.js` : `PAY_LOGOS = [[clé, nom, <g> SVG]]`, clés `cb, visa, mastercard, amex, apple, google, shop, paypal` (Simple Icons CC0 et activemerchant MIT ; fichier généré, ne pas l'éditer à la main).
- `imgw.js` : `IMGW`.

### A.5 Carte de `main.js` (IIFE, `'use strict'`)
**Outils (l.11-84)**
- `$`, `$$`, `eur`, `esc`, `byHandle`, `formatsOf`, `minPrice`, `FREE_SHIPPING=100`, `nm()` (second mot en `<em>`).
- `src(name, big)` construit l'adresse `-m.webp?v=` (ou `.webp?v=` pour la grande). `pic(name, alt, sizes, cls, eager)` construit l'`<img>` avec srcset.
- `payBadge` : badge 38×24 avec masque. `ICONS` + `icon(k)`.

**Nombre d'or des packshots (l.33-73)**
- `PHI`, puis `gold(name)` → `{ia, kh = 1/(φ·rh·ia), kw = .84/(largeur produit), cx, cy, edge}`. Un `-pack30` reprend l'échelle et la ligne de sol de son `-pack`.
- `goldBox(g, W, H)` → `{sw, sh, L, T, inset}` :
  - `sw = min(H·kh, W·kw)` : le produit fait 1/φ de la hauteur et au plus 84 % de la largeur ;
  - `T = max(H/φ + sw·cy, min(0, H − sh))` : l'air se partage φ:1, plus d'air au-dessus.
- `goldVars` : variables CSS `--kh --kw --cx --cy --ia --e0..--e9`.
- `packPic(name, alt, sizes, cls, eager, ar=1.25)` : `<span class="gold">` dans un cadre fixe (cartes, tuiles, panier). Le placement est fait en CSS (`cqw`/`cqh`) ; les `sizes` sont multipliés par `z`.
- `frameGold(fig)` : galerie de la fiche produit. Placement en pixels, `ResizeObserver`, classes `is-set` et `is-inset`, variables `--t` et `--sh`.

**Gabarits communs**
- `renderHeader` (l.89) :
  - bandeau `#announce` (2 messages, rotation toutes les 4,5 s), méga-menu `.has-sub > .mega` ;
  - le lien Bougies n'apparaît que si `!COLLECTIONS.bougies.hidden` ; le tiroir mobile `#drawer` a ses liens en dur ;
  - titre courant `.runhead` si `body.dataset.run` ;
  - au défilement : `is-hidden` (y > 500 en descendant) ; `is-top`/`is-solid` seulement sans `.entete`.
- `renderFooter` (l.181) : bloc Services (sauf sur la page Services), lettre `form[data-news]` (sauf si la page en a déjà une), colonnes, `.footer__pay` (`PAY_LOGOS.map(payBadge)`), mentions légales en `data-toast`.

**Panier (l.226-318)**
- Clés `localStorage` : `librery-cart-v2` (lignes `{h, f, q, sel?}`) et `librery-cart-extras` (`{samples:[h,h]}`).
- Fonctions : `addToCart`, `renderCartShell` (`#overlay`, `aside#cart`, `#toast`), `openCart`, `closeAll`, `renderCart`.
- Contenu de `renderCart` :
  - barre de livraison offerte ;
  - pour chaque flacon 100/30 du panier, une ligne « 2 ml offert » ;
  - 2 échantillons au choix, présélectionnés parmi les parfums absents du panier (nouveautés en tête) ;
  - vignettes `packPic` du format choisi ;
  - le bouton « Commander » ouvre un toast.
- Toasts : `toast()` et `bindToasts()` sur `[data-toast]`.

**Cartes et tuiles (l.320-412)**
- `card(p)` : packshot 100 ml + `card__30` (révélé au survol de `[data-f30]`) ; `scene` ou `video` au survol ; glisser au doigt sur mobile avec `.card__dots`.
- `bindCards` : délégation des survols, des vidéos et des points de défilement.
- Tuiles :
  - `tile(href, img, title, meta)` ;
  - `wideTile(key, img)` (`card--wide`) ;
  - `trialTile()` → Coffret Découverte ;
  - `storesTile()` (image `bouchons-or`) ;
  - `quizTile()` (image `portrait-profil`).
- Autres :
  - `mosaic(key)` : `.ed-c.ed-cas > .ed-mos[data-ed]`, avec `.ed-grid`, l'en-tête, 3 `figure.ed-f--a|b|c` et l'épigraphe `.ed-q` ;
  - `balanceGrids` : `grid--lead` si le nombre de cartes simples est impair ;
  - `accordions` ;
  - `newsletters`.

**`initEdito` (l.433-575)** : mise en page éditoriale animée au défilement.
- Chaque scène `[data-ed]` reçoit `--p` (traversée, 0→1), `--t` (1→0→−0,3) et `--e` (1→0). `.s-figure` de l'accueil, Préface, `.card--wide` et `.perfumer` sont habillés automatiquement par `scan()`.
- **Cascade 3D** (`.ed-cas` → `.ed-seq.ed-3d`) :
  - `lattice()` dessine un quadrillage au trait dans `.ed-grid` : plan de face (`ed-pl--f`), mur du fond (`--b`), parois (`--w`), lignes d'or `ed-g--au` ;
  - profondeur `D = 900` et perspective `P = 1500` (écran étroit : 260 et 950) ;
  - `cascade()` fait voyager chaque `.ed-fr` sur l'axe Z (`translate3d`, `rotateX`, `rotateY`) et pose les classes `is-in`, `is-set` et `is-end` (épigraphe) ;
  - point de fuite `--oy`.
- `.ed-rv` / `.ed-pre` / `.ed-in` : apparition unique.
- Observateurs : `IntersectionObserver` (rootMargin 30 %), `ResizeObserver`, `MutationObserver` sur `main` (grilles re-rendues). Avec `prefers-reduced-motion`, la mise en page finale reste fixe.

**Pages**
- `initHome` (l.580) :
  - `#so-grid` : les 3 cartes Skin Obsession ;
  - `#sv-grid` : 3 cartes, puis `wideTile('summer-vibes','hero-summer')`, le reste, puis les tuiles essai et portrait ;
  - `[data-mosaic]`, `#shelf` (SHELF) et boutons `[data-shelf]`.
- `initHero` (l.594) : ancien diaporama `[data-hero]`. **Code mort** : aucun `src` ne contient `data-hero`.
- **`initEntete` (l.638-874)**, en-tête A1 « La donne » (validée le 13/10, future section Shopify `hero-scroll`) :
  - le film `.entete-film` (vidéo `.s-hero__film`, `<source media>` mobile/ordinateur, affiches `data-poster(-m)`) part plein cadre, recule en tirage φ:1, puis les 3 photos `MODS` (`tonka-love-mod`, `magnetic-flowers-mod`, `vanilla-plum-mod`) montent en tirages 1:φ et s'empilent ;
  - la pile est ensuite « distribuée » sur les colonnes de `#so-grid`, mesurées par `measureGrid` (chaque tirage au-dessus de la carte de son parfum) ; le film devient un bandeau φ³:1 et la phrase `.entete-cap` se cale ;
  - calendrier, en part du défilement : `T0 = .21`, `TS = .58`, `DEAL = [.62, .2, .055]`, `FILM = [.64, .9]`, `CAP = [.86, .1]` ;
  - section haute de `100lvh + 420lvh` (CSS), débordement `--ovf`, mesure du petit écran par `.entete-svh` (100svh) ;
  - lissage à la molette (facteur 0,18) ; bouton rond `.entete-pp` qui prend le relais du bouton Pause ;
  - `syncHeader()` gère `is-top`/`is-solid` et `header.style.top`, sauf quand `html.lecteur-ouvert`.
- `initLibrary` (l.876) :
  - filtres `?f=` (`#lib-cols [data-f]` : all/skin-obsession/summer-vibes/coffrets), `?famille=` (`#lib-fams .fam`), tri `#lib-sort` (`default|az|asc|desc`) ;
  - mise à jour de l'adresse par `replaceState` ;
  - vue par défaut groupée selon `ORDER`, avec les tuiles intercalées.
- `initCollection` (l.920, appelée **avant** `renderHeader` pour fixer `body.dataset.run`) :
  - ordre des blocs : hero vidéo ou image (+ bouton `[data-film]`), intro, formulaire si `soon`, grille (+ `trialTile` si `tiles: 'grid'`), mosaïque, chapitres, rangée de 3 tuiles si `tiles: 'end'`.
- `initProduct` (l.1715) :
  - galerie `#gallery` : une `figure` par élément de `gallery` ; `data-fmt` vaut 100, 30 ou une clé de `fmtImages` ; un seul packshot visible à la fois (`showPack`), `figure.is-gold[data-gold]` → `frameGold` ;
  - formats `#sizes`, `#add`, `#try` (2 ml), builder (produit en pause), barre collante `#sticky` (insérée **après** `<main>`), accordéons, « Lire la suite » ;
  - sections `.materials` et `#sillage` (horloge), `#parfumeur` ;
  - « Sur la même étagère » (`grid--rail`) ;
  - livraison estimée par `eta()` : +3 jours ouvrés.
- `initStores` (l.1859) : Leaflet (`L.map('map')`, tuiles OSM, `.librery-pin`), onglets pays (France en premier), recherche `#stores-q`, `fitBounds` limité aux longitudes −30..60.
- `initQuiz` (l.1894) :
  - `.quiz__step`, `[data-next][data-for=offrir]` fait basculer le texte `data-gift` des questions ;
  - score : famille ×1 (la deuxième ×0,7), collection `palier` +0,6, nouveauté +0,05 ;
  - résultat : 3 cartes ; CTA vers `/offrir` ou vers le Coffret Découverte.
- `initGifts` (l.1919) : `[data-gift="handle[@fmt],quiz"]` (`@30` remplace `pack` par `pack30`).
- `initFamilies` : `#fam-list`.
- `initLexClock` : `#lex-clock`, horloge avec sélecteur de parfum (défaut `hot-sand`) et `el.sillage.setPerfume`.
- `initContact`.

**Écran de chargement et préchauffe**
- **`initLoader` (l.968-1007)** :
  - supprimé si `html.is-seen` ou si l'adresse porte `#feuilleter` ;
  - tâches attendues : polices, `load`, vidéo `.s-hero__film, .coll-hero video` (`loadeddata`), pages `p01..p15` du catalogue si `[data-flip]`, `decode()` des tirages `.entete-pr img` ;
  - limite `max(2750, now + 1500)` ms ; ensuite, le chevet (`chevetEcran`) seulement sur une connexion jugée rapide (4,3 Mo arrivés en 1200 ms ou moins), au plus jusqu'à 2400 ms ;
  - à la fin : `.is-done` et `sessionStorage['librery-vu']='1'` ; le CSS l'efface de toute façon à 6 s (`@keyframes loader-securite`) ;
  - promesses partagées : `ecranParti`, `essentiel`.
- **`initPrechauffe` (l.1035-1123)** :
  - rien sur une connexion lente (`saveData`, 2G, 3G) ; rien ne part avant `load` et `essentiel` ;
  - `preconnect` vers jsDelivr ;
  - chevet : `modulepreload` de `chevet3d`, `chevet-photo`, `three` et 12 modules `three/addons/*` ; sous Chromium, `preload as=fetch` à basse priorité de tous les fichiers du chevet (gltf/bin/textures du chevet, `/parfum/flacon-100ml.glb`, `parfums.json`, `studio.hdr`, `plateau.glb`, noyer 2k/4k, normale, rugosité, `emblem-gravure`, `caustiques.json/png`, 8 étiquettes). **Ces adresses doivent rester alignées sur celles de `chevet3d.js` et `sillage3d.js`** ;
  - `chevetEcran` (le loader attend la 3D) seulement sur une machine sans écran tactile, avec 8 cœurs et 8 Go ou plus ;
  - cadran : modules et fichiers `/parfum/*` et `/parfum/labels/<handle>.png` à basse priorité ; montage anticipé via `aMonter` au premier calme (0,3 s sans défilement) ;
  - `speculationrules` (prefetch `moderate`, sauf `[data-lecteur]`) ;
  - 12 images lazy dans les 8 écrans suivants, décodées 2 par 2.

**Catalogue feuilleté et chevet 3D**
- **`initFlip` (l.1126-1195)** :
  - `.flip[#catalogue]` contient `[data-flip]` ; 7 feuilles × 20 bandes (`N = 20`) ; pages `/assets/img/catalogue/pNN.webp` (`p01..p14` pour les feuilles, `p02`/`p15` en statique) ;
  - libellés `CH[]`, `[data-flip-n|t|bar]`, variable `--ouvre` ;
  - appelle `chevet(track, draw)`.
- **`chevet()` (l.1206-1246)** :
  - phases `CHEVET = {txt:.43, vol:.535, fondu:.562, livre:.581}` ;
  - pas de 3D (`.flip__chevet` retiré) si pas de WebGL 2, mouvement réduit ou `saveData` ;
  - sinon : `flip--chevet`, puis `import('chevet3d').mount(fond, track, {...CHEVET, perdu: repli})`, puis la classe `is-3d` ;
  - `IntersectionObserver` avec une marge de `2500%` sur l'accueil (`300%` ailleurs) ;
  - retour par `#catalogue` : la page se replace au livre fermé.
- **`initLecteur` (l.1256-1577)**, le catalogue 3D dans le site :
  - **Déclencheurs** : tout `a[href]` vers la racine de `CATALOGUE_URL` reçoit `?retour=<adresse courante (hash catalogue si dans #catalogue)>`, perd `target` et gagne `data-lecteur` ; le livre `#catalogue [data-flip]` devient un bouton (`tabIndex 0`, Entrée et Espace). Clic du milieu ou avec modificateur : navigation normale.
  - **Lecteur habituel** :
    - `div#lecteur.lecteur[role=dialog]` contient `.lecteur__retour` et `iframe.lecteur__vue` (`src = CAT + '?embed=1'`) ;
    - entrée par animations Web : glissement 750 ms `cubic-bezier(.7,0,.2,1)`, ou fondu 350 ms en mouvement réduit ;
    - `html.lecteur-ouvert` ; la page (`.runhead`, `main`, `#sticky`, `#site-footer`) devient `inert` ; les vidéos sont mises en pause ;
    - position de défilement et focus restaurés à la fermeture.
  - **Protocole `postMessage`** (vérifie `e.source === vue.contentWindow`, `e.origin === ORIGINE` et la `source`) :
    - catalogue → site `{source:'librery-catalogue', type:'pret'|'fermer'|'revenu', decors?:string[]}`. `pret` peut porter `decors` (met à jour `decorChevet`) ;
    - site → catalogue `{source:'librery-boutique', type:'ferme'|'ouvert'|'revenir', ...cadre}`. Rien n'est envoyé avant `pret` (`dire()`).
  - **Historique** :
    - `history.pushState({lecteur:1[, chevet:1]}, '', '#feuilleter')` ;
    - `popstate`/`hashchange` appellent `suivre()` ;
    - `demander()` (bouton Retour, Échap en capture sauf si panier ou menu ouvert, message `fermer`) : `history.back()` si l'entrée est la nôtre, sinon `replaceState` sans ancre ;
    - lien direct vers `#feuilleter` : ouverture immédiate, sans animation.
  - **Mode chevet** (`ouvrirChevet`) : seulement si `decorChevet` (`CATALOGUE_DECOR_CHEVET || CAT !== CATALOGUE_URL`, ou `pret.decors` contient `chevet`) et si la 3D est vivante.
    - `allerCle()` fait défiler jusqu'à l'image clé (P entre `fondu` et `livre`) et attend `fond.dataset.rendu === 'net'` (2,5 s au plus).
    - `cadreChevet()` mesure `{cadre, optique, table, vignette, papier}`, en fractions du cadre, et les passe en paramètres d'URL `?embed=1&decor=chevet&…`.
    - États `etatChevet` : `''`, `attente`, `ouvert`, `retour`, `fondu` ; `dataset.etat` vaut aussi `prepa`.
    - Délais : garde de 3000 ms une fois le catalogue `pret`, **10 000 ms** s'il ne l'est pas encore (au-delà, `secours()` ouvre le lecteur habituel) ; fondu de 180 ms ; textes de la section `TEXTES = 350` ms ; garde de retour de 6000 ms.
    - **Clic avant `pret`** (`patienter`) : l'image clé reste, le bouton garde sa largeur et lit « Ouverture… » avec un filet d'or qui va et vient (`html.lecteur-patience`, `style.css`) ; à `pret`, les textes s'effacent, puis le fondu.
    - **Un cadre déjà chargé ne change jamais d'adresse** : `aller(url)` remplace l'iframe par un clone neuf (un `src` réaffecté ajoutait une entrée d'historique, et « Retour » reculait alors dans le cadre caché). Toute nouvelle navigation du cadre doit passer par `aller()`.
    - Classes : `html.lecteur-chevet`, `lecteur-retour`, `lecteur-attente`, `.lecteur--chevet`, `.is-vu`.
    - `preparer()` laisse le cadre invisible et inerte, à sa place, pour la fois suivante.
  - **Préchargement** (`prechargerChevet`, `prechauffer`) : sur l'accueil, le cadre est préparé **en décor chevet** (jamais le lecteur habituel d'abord). À la souris : dès que la 3D de la section est prête (`is-3d`) et que le visiteur est à moins de 3 écrans (`IntersectionObserver` 300 %, puis `requestIdleCallback`). Au doigt : seulement une fois le mouvement de caméra fini (P ≥ `CHEVET.vol`) et 500 ms sans défilement (sur téléphone, l'iframe partage le fil de la page). Ailleurs : au `pointerenter` souris ou au `focus-visible` des liens (`?embed=1`). Jamais sur connexion lente (`lent` : Save-Data, 2G, 3G), où le clic ouvre directement le lecteur habituel.
  - Le livre a `-webkit-tap-highlight-color: transparent` (pas de rectangle bleu au toucher sur Android).
- `filmControl(root)` (l.1581) : lecture muette forcée, bouton `[data-film]` Pause/Lecture, `data-mobile` sous 800 px.

**Horloge du sillage (l.1595-1713)**
- Fonctions : `cleanNote` (retire `STT|SFE|Ess|NP|FirAbs|Abs`, `®`, parenthèses), `notesOf(p)`, `clockTime`.
- Curseur : `STOPS = [0, 60, 120, 240, 480]`, `posMin` (position 0-480 → minutes, non linéaire), `phaseAt` (<60 tête, <360 cœur, sinon fond).
- `clockHTML(p, head)` produit `[data-clock=<handle>]`, `.clock__stage` (affiche `/assets/img/sillage/<h>(-m).webp`), un `range` 0-480 pas de 5, `[data-clock-play]`.
- `bindClock(el)` :
  - rendu ; lecture « Laisser le temps passer » sur 7 s ;
  - lecture automatique une seule fois, quand la scène est visible à 74 % ou plus ;
  - `min-height` figée par `fige()` (la liste ne saute pas quand la phase change).
- `sundial(el, now)` : `import('sillage3d').mount(stage, handle, t01, {notes})` → `{ready, setTime, setPerfume, dispose}`, chargé à 300 px de l'écran ou en avance via `aMonter`. Sans WebGL 2 : `.clock__stage` retiré.

**Ordre d'initialisation (l.1962-1969)**
1. `initCollection` ;
2. `renderHeader`, `renderFooter`, `renderCartShell` ;
3. `initLoader`, `initHero`, `initHome`, `initEntete`, `initFlip`, `filmControl(document)`, `initLibrary`, `initProduct`, `initStores`, `initQuiz`, `initGifts`, `initFamilies`, `initLexClock`, `initContact` ;
4. `initLecteur` (quand tous les liens existent) ;
5. `renderCart`, `bindToasts`, `bindCards`, `accordions`, `newsletters`, `balanceGrids` ;
6. `initEdito` (en dernier) ;
7. `initPrechauffe` (après tout).

### A.6 Modules 3D (ES modules via l'import map, Three.js r170)
- `assets/js/chevet3d.js` (1826 lignes), `export async function mount(fond, track, PH)` :
  - chevet Poly Haven `ClassicNightstand_01` (CC0) garni de 18 flacons, plateau en noyer, caustiques précalculées ;
  - qualité `haute`, `mobile` ou `basse` ;
  - écrit `fond.dataset.rendu` = `charge` → `vif` → `net`, et la variable `--bois` (clip-path de l'ombre du livre) ;
  - expose `fond.chevet = {arret, mesure(), cle(), invalider, dispose}` (`cle()` → `{fov, pose{x,z,ry}, hc, ecart, vignette}`) ;
  - en cas de perte du contexte WebGL : `PH.perdu()` (repli).
- `assets/js/chevet-photo.js` : `Photo`, `TONE` ; rendu « photographique » (MSAA en mouvement, TAA 32 échantillons et GTAO à l'arrêt, développement puis tirage, scène sur fond transparent).
- `assets/js/sillage3d.js` : cadran solaire (flacon de `/parfum`, ombre servant d'aiguille, onde colorée) ; `export const NOTES = [[clé, famille, nuance, teinte, chaleur]]`, futur métaobjet « note ».
- Fichiers : `assets/3d/chevet/` (`ClassicNightstand_01_1k.gltf/.bin`, `textures/*_1k.jpg`, `plateau.glb`, `plateau-noyer-{2k,4k}.webp`, `-normale-2k`, `-rugosite-2k`, `emblem-gravure.webp`, `caustiques.json/png`, `labels/<handle>.webp`, `source.txt`) et `parfum/` (glb, hdr, json, `labels/<handle>.png`).

### A.7 `assets/css/style.css`
- **Jetons `:root`** :
  - couleurs : `--paper #f8f5ef`, `--paper-2 #f1ece3`, `--studio #f0eeef` (fond des packshots), `--ink #2f2b28`, `--grey #6a6159`, `--line #e2d8c9`, `--gold #b7916a` (filets et folios uniquement), `--espresso #3a2a1e` ;
  - polices : `--serif-d` (Libre Caslon Display), `--serif` (Libre Caslon Text), `--sans` (Hanken Grotesk) ;
  - mesures : `--gutter clamp(20px, 3.2vw, 48px)`, `--max 1440px`, `--header-h 72px` (60 px sous 800 px), `--block 96px` (64 px) ;
  - éditorial : `--ed-ease`, `--ed-out`.
  - Point de rupture principal : 800 px.
- **Sections** (n° de ligne) :

| Ligne | Section | Ligne | Section |
|---|---|---|---|
| 39 | Typographie | 483 | Pied de page |
| 52 | Liens et boutons | 521 | Filtres |
| 62 | Mise en page | 542 | Collection |
| 72 | Bandeau et en-tête | 557 | Fiche produit |
| 119 | Titre courant | 652 | Panier |
| 124 | page-head | 691 | Pages éditoriales |
| 130 | Hero `.s-hero` | 737 | Portrait |
| 162 | Ouverture `.entete` | 753 | Carte |
| 211 | Cartes, dont `.gold` (l.219) | 774 | Contact |
| 287 | Éditorial (cascade l.323, `.ed-3d` l.372, `.s-figure` l.415) | 796 | Familles |
| 435 | Étagère | 837 | Horloge |
| 453 | Livre | 878 | Flip |
| 458 | Image pleine largeur | 938 | Chevet |
| 462 | Services et lettre | 970 | Lecteur |
| | | 1010 | Loader |

- **`.gold`** : `container-type: size`, avec :
  - `--sw = min(100cqh·kh, 100cqw·kw)` ;
  - `--t = max(61.8034cqh + sw·cy, min(0, 100cqh − sh))` ;
  - `::before`/`::after` peignent des dégradés `--e0..--e9` qui prolongent les bords de l'image.
- `labo.css` est propre à `/labo`.

### A.8 Conventions d'images
- Images de contenu dans `assets/img/v2/<nom>.webp` (grande) + `<nom>-m.webp` (petite), en paire obligatoire pour figurer dans IMGW.
  - Les largeurs réelles varient : petites 600–1100 px (surtout 720, 900, 600), grandes 957–2400 px (surtout 1200, 1600). Pas de taille fixe « 1600 / 900 ».
  - Toujours appeler l'image par son nom (`pic`, `packPic`, `{{pic}}`) : la version `?v=` est ajoutée automatiquement.
  - Relancer `build.py` après tout ajout ou modification d'image.
- Packshots (`-pack`, `-pack30`, `discovery-*`, fond studio `--studio`) : règle du nombre d'or partout (cartes, tuiles, panier, builder, fiche produit).
  - Le produit fait 1/φ de la hauteur du cadre, au plus 84 % de sa largeur, centré.
  - L'air se partage φ:1 (dessus : dessous).
  - Le 30 ml est à l'échelle et sur la ligne de sol de son 100 ml.
  - Fond blanc : uniquement les packshots du dépôt `librery-catalogue-3d` (règle de direction artistique de `CLAUDE.md`).
- Autres dossiers :
  - `assets/img/catalogue/` : `p01..p15.webp`, `bureau(-m).webp`, `chevet-poster(-m).webp` ;
  - `assets/img/entete/` : `film-poster(-m).jpg` ;
  - `assets/img/sillage/` : `<handle>(-m).webp`, 8 parfums ;
  - `assets/video/` : `skin-obsession.mp4` et `-m.mp4` ;
  - `assets/img/v2/` contient aussi `emblem-*.png`, `logo-*.svg`.

### A.9 `_proto/` (ignoré par git : `maquette/_proto/` dans `/Users/svbri/libreryShopify/.gitignore` ; ignoré aussi par Vercel)
- `_proto/index.html` : page « Travaux en cours » qui renvoie vers la maquette en local (`localhost`). Médias dans `_proto/travaux/media/` : `cadran.mp4`, `chevet-*.mp4/png`, `lecteur-*.png`, `nombre-dor.png`…
- `_proto/hero/` : variantes de l'ouverture A, A1–A4, B, C, D (`index.html`, `hero.js`, `hero.css`, `rendus/variante-*-{desktop,mobile}.mp4`, planches). **A1 « La donne » est la variante validée et intégrée** (`initEntete`).
- `_proto/meuble/` : prototype validé du chevet (`index.html`, `photo.js`, `cuisson-caustiques.js`, `caustiques.*`, `lookdev-{caravage,joaillier,studio}`, `model/`), source de `chevet3d.js` et `chevet-photo.js`.
- `_proto/sillage/` : prototypes du cadran (`onde.html`, `brume.html`, `journee.html`, `strates.html`).
- `_proto/catalogue/` : variantes 3D de la section catalogue (`p/` pages).
- `_proto/tables/` : planche de vignettes Poly Haven.
- `_proto/wf-*.js` (scripts de workflows passés) et `chevet-accueil-issues.json`.

### A.10 `retours/` (racine du dépôt)
- `2026-10-12-nolwenn.md` : liste des corrections et décisions, avec contre-vérifications. `questions-nolwenn.md` : réponses proposées (code coffret `COFFRET40`, paiement en 3 fois, vidéo, renvois au catalogue).
- `pdf/` : `build.py`, `render.cjs`, `shots.cjs` → `LIBRERY-retours-12-octobre.pdf`. Les captures « avant » sont prises sur le site en ligne : **les refaire avant de pousser des corrections**.
- `whatsapp/` : seules les transcriptions `*.txt` sont versionnées.
- `discovery-photos/` : `d01–d21`, `outils`, `refs`.
- Non suivis par git : `bois/` (`bois.html`, `cuire.cjs` → `bureau(-m).webp`), `nolwenn-13-10/` (`avant-apres.jpg`, `zip`), `tables/`, `video-catalogue/` (`capture.cjs`, `montage.py`, `LIBRERY-catalogue-feuillete.mp4`) ; également `generations/discovery-sets-nb21/`.

### A.11 Anomalies constatées (à traiter)
- **Corrigé le 15/10** (questions vides du Portrait olfactif) : `initGifts` traitait **tous** les `[data-gift]`, y compris les `h2.quiz__q`, dont l'attribut `data-gift` porte la formulation « cadeau » de la question ; `byHandle` échouait et vidait le titre. `initGifts` est désormais limité à `.grid[data-gift]`. Si l'on ajoute d'autres grilles « cadeau », garder la classe `grid`.
- `initHero` est du code mort (plus de `[data-hero]`). `CATALOGUE_PDF`, `PRODUCTS[].folio` et `COLLECTIONS[].folio|number|kicker` ne sont pas utilisés par le JS.
- `README.md` est obsolète (polices, port).
- Le lien Bougies du tiroir mobile n'existe pas, mais celui du méga-menu dépend de `hidden`. Pour réactiver Bougies : retirer `hidden: true` et ajouter le lien dans le tiroir de `renderHeader`.
- Le catalogue n'annonce toujours pas `decors: ['chevet']` dans `pret` (`signalerBoutique`) : la boutique s'appuie sur `CATALOGUE_DECOR_CHEVET = true`. L'ajouter côté catalogue rendrait le drapeau inutile.
---

## B. Les parties 3D (chevet de l'accueil, cadran du sillage, catalogue 3D, visionneuse /parfum)

État relevé le 15/10/2026, en lecture seule. Branche du site : `claude/zen-sagan-nuppbn` (HEAD `ead6a58`, aucun écart local sur ces fichiers). Dépôt du catalogue : `~/Projects/librery-catalogue-3d`, branche `main`, alignée sur `origin/main` (HEAD `88e3c77`, 15/10 02:24), sans modification locale ; `npm test` passe (79/79).

### B.0 Socle commun (site)
- **Three.js r170** chargé depuis le CDN par la carte d'import de `maquette/src/_head.html` : `three` → `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js`, `three/addons/` → `…/examples/jsm/`, plus les alias `chevet3d`, `chevet-photo` et `sillage3d` vers `/assets/js/*.js`. `build.py` versionne ces trois modules (`?v=hash`) dans la carte d'import.
- **Attention à la version de three** : `chevet3d.js` retouche le texte des morceaux de shader de r170 (`morceau()`, `chunkLumieres()` sur `lights_fragment_begin`, `transmission_fragment`, `envmap_physical_pars_fragment`). Si on change de version, on obtient `console.error("morceau introuvable"…)` ou `"lights_fragment_begin : boucle introuvable"` et le rendu se dégrade. Le catalogue, lui, tourne en `three ^0.186.0` (npm) : les deux ne sont pas interchangeables.
- **Préchargement** : `main.js` → `initPrechauffe()` (l. 1035), avec les listes de modules et de fichiers du chevet et du cadran (l. 1069-1099). **Ces listes sont à tenir à jour à la main** quand on change les imports ou les fichiers de `chevet3d.js` ou de `sillage3d.js`.
- Côté **écran de chargement** (`initLoader`, l. 968) : il n'attend le chevet (`chevetEcran`, 2,4 s au plus) que sous Chromium, sur un ordinateur sans écran tactile, avec 8 cœurs et 8 Go de mémoire au moins. Pour sauter l'écran pendant les essais : `sessionStorage['librery-vu']='1'`.
- **Cache Vercel** (`maquette/vercel.json`) : `/assets/(css|js)/*` et `/parfum/*` en `max-age=0, must-revalidate`, `/assets/img/*` 1 jour, aucune règle pour `/assets/3d/*`.
- `maquette/_proto/` est **exclu de git** (`.gitignore`) et du déploiement (`maquette/.vercelignore` : `src`, `build.py`, `_proto`). Le prototype validé (`_proto/meuble/` : `index.html`, `photo.js`, `lookdev-caravage*.{html,js}`, `lookdev-studio*`, `lookdev-joaillier*`, `cuisson-caustiques.js`) et les essais du sillage (`_proto/sillage/{brume,journee,onde,strates}`) **n'existent que sur le Mac**.

### B.1 Chevet de l'accueil : `maquette/assets/js/chevet3d.js` (1826 lignes) et `chevet-photo.js` (342 lignes)

**Intégration** (`main.js`, `initFlip` puis `chevet(track, draw)`, l. 1197-1245) :
- Phases : `CHEVET = { txt: .43, vol: .535, fondu: .562, livre: .581 }`, exprimées en fraction `P` du défilement de `.flip`.
- Hauteur de la section : `.flip--chevet { height: 575vh }`, 520vh à 800 px de large ou moins (`style.css` l. 942-968).
- La 3D est **refusée**, et la section d'avant gardée (bande de noyer + livre CSS, `fond.remove()`), dans quatre cas : `prefers-reduced-motion`, `navigator.connection.saveData`, absence d'`IntersectionObserver` ou de `ResizeObserver`, absence de WebGL 2.
- Sinon, `track.classList.add('flip--chevet')`. Un IntersectionObserver prend le relais, avec `rootMargin` `'2500% 0px'` si `.entete` existe (accueil), `'300% 0px'` sinon. Il pose `.is-proche` (affiche visible), puis attend `load` et `requestIdleCallback` (délai max 1200 ms), et appelle `import('chevet3d').then(m => m.mount(fond, track, {...CHEVET, perdu: repli}))`. À la fin, `.is-3d` est posé : coupe franche si `P > .02`, et l'affiche est retirée si `P ≥ vol`.
- `repli()` revient à la section d'avant au même point du feuilletage. Il est appelé si le montage échoue, ou par `PH.perdu` sur `webglcontextlost`.
- **Affiches** : `assets/img/catalogue/chevet-poster.webp` (1920×1080) et `chevet-poster-m.webp` (600×1292, portrait).
- **Variables CSS posées par la page** : `--chevet-txt` (fondu des textes de `txt` à `vol`), `--chevet-livre` (livre CSS de `vol` à `fondu`) et `--ouvre`. `chevet3d.js` pose `--bois` sur `.flip__r` : un polygone `clip-path` qui coupe l'ombre CSS du livre au contour du plateau (`ombreSurBois`).
- Une fois `vol` dépassé, le livre ne s'ouvre qu'à partir de `CHEVET.livre`.

**API** : `mount(fond, track, PH)`, où `fond = .flip__chevet` et `track = .flip` ; le canevas est inséré en tête de `fond`.
- La fonction renvoie `ctl`, aussi exposé en `fond.chevet` : `{ arret, qualite, mesure(), cle(), invalider(), dispose() }`.
- `cle()` → `{ fov, pose:{x,z,ry}, hc: CH, ecart: Y_CAT − dessus du plateau, vignette: VIGNETTE_FIN }`. Elle sert à `initLecteur` (`cadreChevet`).
- `mesure()` (essais) renvoie les coins de la couverture 3D et ceux du livre CSS, avec leur écart en px (`ecart`).
- État lisible dans `fond.dataset.rendu` : `charge` → `vif` → `net`. `allerCle` dans `initLecteur` attend `net`.

**Fichiers chargés** (`C = /assets/3d/chevet/`) :
- le meuble : `ClassicNightstand_01_1k.gltf` + `.bin` + `textures/*_1k.jpg` (Poly Haven, CC0, voir `source.txt`) ;
- le plateau : `plateau.glb` (dessus détaché, 226 triangles, uv dépliées) et `plateau-noyer-{4k|2k mobile}.webp`, `-normale-2k`, `-rugosite-2k` ;
- l'emblème et les étiquettes : `emblem-gravure.webp` (454×512) et `labels/{handle}.webp` (512², **copies réduites** des `/parfum/labels/*.png` en 2048²). **Aucun script versionné ne les régénère** ;
- les caustiques : `caustiques.json` + `caustiques.png` (768×1536, atlas de 6 colonnes × 3 lignes de tuiles 128×256, cuit par `_proto/meuble/cuisson-caustiques.js` via `_proto/meuble/index.html?cuire=1`). Elles sont facultatives : sans elles, pas de caustiques ;
- le flacon, partagé avec la visionneuse : `/parfum/flacon-100ml.glb`, `/parfum/parfums.json`, `/parfum/studio.hdr` (studio_small_09, CC0) ;
- les pages du catalogue : `/assets/img/catalogue/p01.webp` (couverture) et `p02.webp`.

**Scène** :
- Le meuble est relevé par rayons (`CAISSON` : plancher, plafond, fond, g, d, `avant .185`, `avantEtagere .155`).
- On ajoute une étagère (`BoxGeometry(.45,.014,.33)` à y = .405) et un bandeau.
- Le corps est coupé sous y = .6757 ; le plateau est remplacé par `plateau.glb` (`MeshPhysicalMaterial` : clearcoat .42/.32, specularIntensity .32, envMapIntensity .9, `normalScale (1,−1)`).
- **18 flacons** : `SUMMER` (niche 1, en haut, 9 flacons) et `SKIN` (niche 0, en bas, 9 flacons), décalés de `K.decalX = −.012`, posés par rayons (`poser()`), avec un liseré de contact.
- `HANDLES = palmeira, ambert-sunset, mango-wave, hot-sand, sun-ice, vanilla-plum, tonka-love, magnetic-flowers`.
- Les caustiques sont reliées aux poses par l'index `i`, le `handle` et la `niche` : **si l'on change les poses ou la géométrie, il faut recuire**.
- Le catalogue 3D : `CH = .36`, `CW = CH/1.4144`, `CT = .009`, `POSE = { x: −.15, y: .70+CT/2+.0005, z: −.045, ry: .085 }`. Il ne bouge jamais.

**Réglages** :
- `PARAMS`, l. 51-57 (environ 90 clés), surchargeable par l'adresse (`?cle=1.8&lfEtiqCarte=2`).
- Autres drapeaux d'essai : `?qualite=haute|mobile|basse`, `?adapte=0` (pas d'adaptation), `?etapes=N` (étapes d'affinage), `?verre2=0`, `?pack=0` (couleurs de `parfums.json` au lieu de `PACK`), `?caustiques=0`.

**Recette lookdev des flacons, « caravage + studio or »** :
- **Clair-obscur par niche** (cœur du prototype, validé le 14/10) :
  - lumière principale `SpotLight` `CLE (1,.66,.38)`, intensité `K.cle 1.5`, angle `.52`, pénombre `.65`, ombre 2048, cachée à l'avant gauche sous le plafond ;
  - contre-jour `DOS (1,.8,.6)`, `K.dos .22` en haut et `K.dosBas .16` en bas, ombre en qualité haute seulement ;
  - projecteur « du fond » `K.murSpot .55` (`userData.mur`), qui n'éclaire que le velours ;
  - velours noir chaud (`materiauFond`), avec une lueur de réglette LED au pied (`lueurPied`, festons tous les 2 cm) ;
  - drapeaux invisibles (`DRAPEAUX`, z = `K.zDrapeau .195`) qui coupent le soleil de la pièce ;
  - laque des étagères en miroir plan (`class Miroir`, plan de coupe oblique de Lengyel, calques 1/2, doublures simplifiées) ;
  - tri des projecteurs à la compilation (`spotsActifs`, `chunkLumieres`, `lumieresNiche`) : chaque matière ne calcule que les deux projecteurs de sa niche.
- **Studios de reflets** : `envNiche(i, pourOr)` génère un PMREM d'une petite scène, `ENV_VERRE` (le noir et la lueur) et `ENV_OR` (plus le scrim chaud, la carte en dégradé et le drapeau chaud ×`pieceOr 3`).
- **Lightformers analytiques** : `LF_N = 6` rectangles par niche (`studioNiche`) :
  - 1 : bande gauche (`lfG 25`) ;
  - 2 : bande droite (`lfD 14`) ;
  - 3 : boîte de la lumière principale (`lfCle 30`) ;
  - 4 : « dark field » du fond (`lfFond 2.5`) ;
  - 5 : réglette du plafond (`lfPlafond 25`) ;
  - 6 : bande face (`lfFace 6`).
  
  Il y a trois jeux, greffés par `avecLF` dans `lights_fragment_maps` : `LF_VERRE`, `LF_OR` (sources ×`lfOr .12`, plus `orCarte`, qui suit la caméra, et la carte « dessus » du capot) et `LF_ETIQ` (`etiqCarte`). `majLF(camera.position)` les replace à chaque vue, sans recompilation.
- **Parallaxe des reflets** : `parallaxe(sh, centre, R)` (`parOr .11`, `parV .22`).
- **Géométrie** : normales « optiques » (`aplatir`, seuil 30°) et arêtes arrondies (`aretesArrondies`, rayon `.0012`, éclat `areteVerre 3`, `areteOr 1`, `areteVif .4` en mouvement). `Poussoir`, `Col` et `Tige` sont retirés.
- **Matières** (`materiaux(handle, niche)`) :
  - verre : `ior 1.52`, `thickness .017` (socle `.036`), dispersion `.55` en haute, `.3` sur mobile, 0 en basse ; rugosité d'imperfections procédurale ;
  - jus : `ior 1.36`, Beer-Lambert sur le vrai trajet (`cheminJus`), « carte cachée », ménisque ;
  - couleurs des jus : `PACK` (relevées sur les packshots), `equilibre()` pour les jus froids, `ambrer()` pour les champagnes ;
  - or : zamak champagne sRGB `(.95,.88,.78)`, `metalness 1`, `roughness .06`, `anisotropy .12`, tangentes verticales, dégradé `oGrad` ;
  - étiquettes (« Serigraphie ») : dorure `(1,.95,.86)`, `metalness 1`, `roughness .14`, carte de normales tirée de l'alpha (`carteNormales`, Sobel), `envMapIntensity K.dorure 4`, aucune émission ;
  - emblème : décalque de 23×26 mm sur le dessus du capot (normales creuses, traits `#3a2614`, rugosité .45) ;
  - « LIBRERY Paris » en miroir au dos du socle (`GRAV_SOCLE`), visible seulement par réfraction.

**Caméra (un seul mouvement)** :
- Départ : `T0 = (decalX,.40,0)`, `AZ0 .38`, `EL0 .03`, `PRES0 .72` (`.84` en portrait), fov 30.
- Arrivée : d'aplomb, `az = POSE.ry`. La distance `R` donne au catalogue la hauteur de la couverture CSS (`arrivee(cv)`, `couverture(P)` mesure `.flip__leaf`).
- Les grandeurs suivent `PART = { el: 1−(1−v)^1.85, az: 1−(1−v)^10, R: v, y: v, xz: 1−(1−v)^2.2 }`.
- `tracer(cv)` échantillonne 400 pas et reparamètre le chemin à **vitesse d'écran constante** : des points témoins du meuble, les coins du catalogue et le dessus du plateau, pondérés 1 : 1,75 : 1,75. Il relève aussi `vF` (le contenu du caisson passe sous le plateau) et `vC` (le corps passe sous le plateau).
- Dans `frame`, `u = .5 − cos(π·Pe/vol)/2`, où `Pe` est figé à `vol` jusqu'à `fondu`, puis à `fondu`.
- `catalogue()` mène les fondus : aberration éteinte entre u .1 et .45, flou et grain entre .5 et .8, `uImage` (couverture → image exacte du livre CSS par l'inverse du tone mapping Neutral) entre .7 et 1. Le clair-obscur (`pied`, `virage`, exposition, vignette `.2 → .12`) se lève entre .5 et .8.
- **Relais** : le catalogue est masqué à `P ≥ fondu`, la contraction `lv` intervient entre `vol` et `fondu`. Au-delà, plus aucun rendu.
- `miseAuPoint(v)` fait glisser le point net des étiquettes vers le catalogue.

**Rendu à la demande** :
- `kick()` → `frame()`, seulement si la section est vue et que sa clé d'état change.
- En mouvement, `imageVive()` → `rendreVif()` : verre simple face, sans dispersion, réfraction `REFR.vif .5`, `photo.vif()` avec MSAA et caméra jumelle.
- **Affinage** 160 ms après le dernier mouvement : verre double face (qualité haute), dispersion, `REFR.net()` (1 en haute, .75 ailleurs), `photo.affiner()` à chaque image.
- Mise en place : coupée en tâches (`souffle()`), textures envoyées une par une (`initTexture`), programmes précompilés par `compileAsync` en lots de 6, pour les deux régimes et la face arrière, puis `photo.prechauffer()`.

**Qualité et budget** :
- `QUAL` = `basse` si `deviceMemory ≤ 4`, sinon `mobile` (`pointer:coarse` ou largeur < 800), sinon `haute`.
- Densité de pixels plafonnée à 2, 1,5 sur mobile, 1,25 en basse.
- `BUDGET` de pixels en mouvement : 1,8 Mpx (1,2 Mpx sur mobile), plancher `BUDGET_MIN` 0,9 / 0,6 Mpx, appliqué via `photo.ech`.
- Mesure en marche : 12 images après 3 de mise en route, médiane ÷ 1,1, deux séries. Au-delà du `SEUIL` (30 ms, 36 sur mobile), le budget est multiplié par `(SEUIL/med)²` ; au plancher, `passerBasse()` coupe les miroirs, les lightformers du verre, la dispersion et le GTAO, et descend à 8 étapes. Résultat dans `ctl.qualite`.
- Mobile : miroirs au tiers et 4 lightformers.
- `QUAL "moyenne"` apparaît dans le code mais n'est jamais choisi.

**`chevet-photo.js`, `class Photo(renderer, scene, camera, {mobile, tm, papier '#f8f5ef', flouN 80|128})`, export `TONE {agx, aces, neutral}`** :
- `renderer.render` est surchargé : la réfraction voit un fond `0x070504` et non du blanc à 50 %.
- Cibles en demi-flottant : `rtScene` (MSAA 4, ou 2 au-delà d'une densité de 1,75), `rtAO`, `rtH1`-`rtH4` (halo au 1/4, halation au 1/8), `rtDev` (moyenne glissante par `ConstantAlpha`), `rtProf`.
- `TAARenderPass` : `sampleLevel` 0 sur mobile ou au-delà de 3 Mpx, sinon 1 ; 16 ou 32 étapes. `GTAOPass` : rayon .05, calculé une seule fois à l'étape 0, puis seulement mélangé.
- Passe DEVELOP : profondeur de champ Gustafsson en spirale, aberration sur valeurs plafonnées, halo/halation, Neutral, pied de courbe, virage des noirs.
- Passe TIRAGE : vignetage et grain sur le sujet seul, puis le papier.
- Réglages du chevet : `ABERRATION .08`, `FLOU 28`, `GRAIN .034`, `COURBE .07`, `VIRAGE .55`, `EXPO .95`, `VIGNETTE .2`, `VIGNETTE_FIN .12`, `bloom .07`, `halo .03`, `seuil 2.6`, `flouMax 4`, `ao .6`.

### B.2 Cadran du sillage : `maquette/assets/js/sillage3d.js` (604 lignes)

**API** :
- `mount(el, handle, t0, { notes })` → `{ ready, setTime(t01), setPerfume(handle, notes), dispose() }`.
- Exports : `NOTES`, `noteDe`, `degrade`, `degrades`, `bande`, `PHASES_S = [0,.125,.75,1]`.

**Intégration** (`main.js` l. 1600-1715) :
- `clockHTML` produit `.clock[data-clock]` et `.clock__stage` ; l'affiche est posée par `clockPoster(h)` (`--poster`, `--poster-m`).
- `bindClock` gère le curseur `0…480` (`STOPS 0,60,120,240,480` minutes) et la lecture automatique sur 7 s (`play`).
- `sundial(el, now)` monte le cadran : `import('sillage3d')` quand la scène approche à 300 px, ou plus tôt via `aMonter` (`initPrechauffe`). Le canevas paraît à `ready` (`.clock__stage.is-on`).
- Sans WebGL 2 ou en cas d'échec, l'affiche reste, ou bien la scène est retirée.
- Dans le Lexique, `initLexClock` change de parfum par `setPerfume`.

**Scène** :
- Le flacon de `/parfum` est tourné de −.42 rad, au centre d'un cercle `R = .106` m.
- Course `A0 = 1.25π + ROT` → `A1 = −.25π + ROT`, avec `ROT = −.38`.
- Arcs Tête / Cœur / Fond découpés à t = .125 et .75 ; l'arc actif passe à l'or (`--gold`).
- Les noms des phases sont des textures canvas en Hanken Grotesk ; un point d'or marque le bout de l'ombre.
- Caméra fov 24, plongée `VUE 62°`, cadrage itératif dans `cadrer`.
- **Aiguille = ombre** : un seul `DirectionalLight`, dont la hauteur est cherchée par dichotomie (`hauteur(a)`) pour que le bout de l'ombre touche le cercle. Le sol est un `ShadowMaterial` éteint au-delà de R, teinté du jus ×.3.
- **Onde aquarelle** : `LAVIS_FRAG` (fbm, bord organique, auréole, halo `onde`, moucheture de la vaporisation, grain du papier). La couleur vient de `uBande`, `DataTexture` 256×1 générée par `bande(degrades(notes))` (mélanges OKLab, chaleur triée, `presence()` plafonne la clarté) ; une graine de bruit est tirée du handle.
- **Palette** `NOTES` : `[clé, famille, nuance, teinte hex, chaleur]`. La première clé contenue dans le nom normalisé l'emporte, d'où l'ordre du plus précis au plus général. Elle devrait devenir à terme le métaobjet Shopify « note ».
- **Matières** : la recette de la visionneuse (verre `ior 1.5`, dispersion .35 ; jus `1.36` ; or `(.95,.83,.70)`). Environnement `studio()` dessiné, puis remplacé par `studio.hdr`, attendu 800 ms au plus.
- Rendu à la demande uniquement, mis en pause hors écran ; `el.dataset.state` vaut `busy` ou `idle`.
- **Affiches** : `assets/img/sillage/{handle}.webp` (980×786) et `{handle}-m.webp` (780×782), pour les 8 parfums. **Aucun générateur versionné trouvé.**

### B.3 Catalogue 3D : `~/Projects/librery-catalogue-3d`

**Projet** :
- Vite 8 + three 0.186 ; dev sur le port 5174 (`npm run dev`), `npm run build` → `dist/`, `npm test` (`node --test tests/*.test.js`), `npm run pages`.
- Le plugin de dev `/__capture` écrit dans `captures/`.
- Projet Vercel `librery-catalogue-3d` ; **déploiement = `git push` sur `main`** (le `buildCommand npm run build` est dans `vercel.json`).
- En ligne : `https://librery-catalogue-3d.vercel.app/` (`CATALOGUE_URL`, `data.js` l. 10).

**`src/`** :
- `main.js` (1357 lignes) : livre, OrbitControls, décors `bureau` / `marbre` / `studio` mémorisés en `localStorage` (`librery-decor`, `librery-son`), plus le décor `chevet` imposé par l'adresse.
- `book.js` réexporte `livre/livre.js`. Les autres modules : `livre/*` (physique des feuilles), `decor.js`, `plateau.js` (`chargerChevet`, `EMPRISE`, `BORD`), `chevet.js` (lecture et cadrage sans three, testé), `rendu.js` (`class Rendu` : rapide en mouvement, puis TAA, GTAO et grain après 160 ms ; `BUDGET_LENT 20` ms, `BUDGET_RAPIDE 12` ms), `integration.js`, `retour.js`, `cinema/*`, `mains/*` (MediaPipe), `sons.js`, `musique.js`.
- **`integration.js` (mode intégré)** :
  - actif seulement avec `?embed=1` et dans un cadre ;
  - messages sortants `{source:'librery-catalogue', type:'pret'|'fermer'|'revenu'}`, envoyés à `*` ;
  - ordres acceptés `ferme`, `ouvert`, `revenir` (ce dernier peut porter `cadre`, `optique`, `table`, `vignette`), uniquement depuis le parent et une origine LIBRERY ;
  - sans réponse 3 s après `pret`, le catalogue se croit vu ;
  - Échap n'est transmis à la boutique que si rien d'interne ne le prend (`echapPourBoutique`).
- **`retour.js`** : liste blanche `HOTES` = `librery-refonte.vercel.app`, `localhost`, `127.0.0.1`, `*.librery.(fr|com|paris)` et `*.myshopify.com`. Elle s'applique à `?retour=` et à l'origine des messages.

**`public/`** :
- `pages/{uhd,hi,lo}/pNN.webp` (56 pages ; 4096, 2048 et 512 px de haut), `pages/dos.webp`, `pages/manifest.json` (`version` anti-cache) ;
- `chevet/` (copies des fichiers du site, plus `plateau.json` et `studio-1k.hdr`) ;
- `env/studio_small_09_2k.hdr`, `audio/aeria.{m4a,mp3}`, `packshots/` (fond blanc, `index.json`), `photos/` (page « Choix des photos »), `mediapipe/` ;
- `telechargements/LIBRERY-catalogue-doubles-pages.pdf` (`CATALOGUE_PDF`), `-impression.pdf`, `LIBRERY-couverture-impression.pdf`.

**Mise à jour depuis InDesign** : `./scripts/publier.sh` enchaîne l'export (`osascript` + `scripts/export_web.jsx`, à sauter avec `--sans-export`), `build_pages.py --interieur ".../LIBRERY_A4_v4_EN_web.pdf"` (chemin Dropbox codé en dur ; PyMuPDF et Pillow requis), `vite build`, puis commit « Mise à jour du catalogue (date) » et push.

**Contrat du décor chevet** (`docs/chevet.md`, la référence) :
- Adresse : `?embed=1&decor=chevet&cadre=x,y,l,h&optique=cx,cy,f[&table=a,dx,dy,hc[,e]][&vignette=k[,r]][&papier=rrggbb][&lumiere=lampe]`. Toutes les fractions sont rapportées à l'iframe.
- Valeurs par défaut : `TABLE_BOUTIQUE` tirée de `POSE` (`4.870141,0.404550,0.159923,0.36,0.0265`), `FOCALE_BOUTIQUE` (30°), vignette .12, papier `f8f5ef`.
- Côté site, l'adresse est construite par `initLecteur` → `cadreChevet()` et `chargerChevet()` (`main.js` l. 1364-1420), à partir de `fond.chevet.cle()`.
- **Si l'on change la lumière ou le plateau du chevet de l'accueil, il faut reporter les valeurs dans `decor.js` → `appliquer("chevet")`** (soleil `#fffaf5` 3,4 venant de `(−.7,1.75,1)`, contre-jour 0,3, hémisphère 0,03, environnement 0,1 tourné de −0,9 rad) et recopier les fichiers dans `public/chevet/`.
- **Activé en ligne le 15/10** : le décor chevet est servi par `88e3c77` et la boutique l'utilise depuis `7cc2f33` (`CATALOGUE_DECOR_CHEVET = true`). `signalerBoutique('pret')` n'envoie toujours pas de `decors` (amélioration possible). En local, `?cat=http://localhost:5174/` branche le catalogue de développement.

### B.4 Visionneuse autonome `maquette/parfum/` (chantier à part, à ne pas montrer à la cliente)
- `index.html` : `<base href="/parfum/">`, three 0.170 non minifié, OrbitControls en rotation automatique (`?fixe` l'arrête), choix du parfum par `#handle` (`tonka-love` par défaut), nuancier, bouton « Ôter le capot ».
- `window.flacon.photo([yaw,pitch,dist,f,cx,cy], w, h)` pose la caméra comme une photo (comparaisons via `3d/scripts/comparer_web.mjs`). La vue photo 360° est désactivée (`AVEC_360 = false`), mais `360/{handle}/00-36.webp` (37 images par parfum) restent sur disque.
- `flacon-100ml.glb` (539 ko) : maillages `Capot, Col, Etiquette, Jus, Poussoir, Tige, TubePlongeur, Verre, Virole`, matériaux `Or, Serigraphie, Jus, Plastique, Verre, VerreSocle`. **`chevet3d.js` et `sillage3d.js` dépendent de ces noms.**
- `parfums.json` donne `{nom, verre[rgb], jus[rgb]}` pour les 8 handles. `modele.json` donne la date et les cotes (verre 63×48×103,5 mm, capot 36,5×31,3×28,3 mm, hauteur 135,2 mm). S'y ajoutent `labels/{handle}.png` (2048²), `emblem-gravure.png` (1844×2080) et `studio.hdr`.
- Ces fichiers sont **écrits par `3d/scripts/build_flacon.py`** (Blender en module Python, `pip install bpy`, Python 3.11 ; `--render HANDLE` ajoute des rendus Cycles), qui exporte directement dans `maquette/parfum/`. Les étiquettes et `parfums.json` viennent de `3d/scripts/labels.py`.
- Après un nouvel export : vérifier les noms des maillages et matériaux, refaire les copies 512 px de `assets/3d/chevet/labels/*.webp` et de `emblem-gravure.webp`, recuire les caustiques et régénérer les affiches du sillage et du chevet.

### B.5 Vérifier sur place
- Site : `cd maquette && python3 build.py && npx -y serve@14 -l 4173 .`.
- Pour le chevet : `http://localhost:4173/?qualite=basse&etapes=2`. Au relais, `document.querySelector('.flip__chevet').chevet.mesure().ecart` doit valoir 2 px au plus.
- Catalogue : `cd ~/Projects/librery-catalogue-3d && npm test && npm run dev`. Pour le brancher sur le site local : `http://localhost:4173/?cat=http://localhost:5174/`.
- Sous WebGL logiciel (Playwright en SwiftShader), tout est environ 10 fois plus lent : comptez 10 à 20 s pour une image affinée.

---

## C. Outillage, déploiement, historique et pièges

*Tout ce qui suit a été vérifié le 15/10/2026 vers 02:30, en lecture seule.*

### C.1 Dépôts et branches

**`/Users/svbri/libreryShopify`** (remote `origin` = `https://github.com/sabrilab/libreryShopify.git`)
- Branche de travail et branche par défaut : `claude/zen-sagan-nuppbn`.
  - Elle est synchronisée avec `origin/claude/zen-sagan-nuppbn` (HEAD `ead6a58` à la lecture, puis `7cc2f33` et le commit de ce dossier).
  - Aucune modification suivie n'est en cours. Seuls cinq dossiers ne sont pas suivis (voir C.8).
- Autre branche distante : `origin/claude/busy-brahmagupta-7hq8bi`, non fusionnée.
  - Dernier commit le 01/10, base commune `af3c188`, environ 20 commits propres.
  - Contenu : vidéos 3D « Seedance », animatiques grises et `3d/videos/*.mp4`.
  - Ancien chantier : il ne faut pas la fusionner sans demande.
- Il y a environ 96 commits au total.
- `user.email` n'est configuré ni en local ni en global. Les commits de Claude sont faits avec :
  `git -c user.name=Claude -c user.email=noreply@anthropic.com commit …`
  - Message en français, terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Sans ces options, l'auteur devient `Svbri <svbri@MacBook-Pro-de-Svbri-13806.local>`. C'est le cas du commit `5d3d127`.
- `.claude/launch.json` déclare le serveur `maquette` :
  `{"runtimeExecutable":"npx","runtimeArgs":["-y","serve@14","-l","4173","maquette"],"port":4173}`.
  - Un serveur écoute déjà sur `*:4173` (node, PID 74061).

**`/Users/svbri/Projects/librery-catalogue-3d`** (remote `https://github.com/sabrilab/librery-catalogue-3d.git`)
- Branche `main`, synchronisée avec `origin/main`, HEAD `88e3c77`, arbre propre.
- Identité locale imposée par `git config --local` : `user.name=sabrilab`, `user.email=195383669+sabrilab@users.noreply.github.com`.
  - C'est l'adresse noreply de GitHub. Les 25 derniers commits l'utilisent.
- Stack : Vite 8 et three 0.186, plus `@mediapipe/tasks-vision`. Scripts npm :
  - `dev` (port 5174) ;
  - `build` (sortie `dist/`) ;
  - `test` = `node --test tests/*.test.js` (79 tests passaient au dernier essai) ;
  - `pages` = `python3 scripts/build_pages.py`.
- `scripts/publier.sh` enchaîne quatre étapes, puis Vercel redéploie :
  1. export InDesign via `osascript` et `export_web.jsx` ;
  2. `build_pages.py --interieur ".../Librery Catalogue/LIBRERY_A4_v4_EN_web.pdf"` ;
  3. `vite build` ;
  4. commit « Mise à jour du catalogue (date) » puis push.
- `docs/chevet.md` décrit le contrat de l'adresse décor chevet :
  - paramètres `?embed=1&decor=chevet&cadre=…&optique=…&table=…&vignette=…&papier=…` ;
  - fonction de référence `adresseChevet()` ;
  - côté boutique : `initLecteur` → `cadreChevet`, `ouvrirChevet`, `basculer`, `fermerChevet`.

### C.2 Déploiement Vercel (équipe `downing`, id `team_41gFn1vjGvvQpCpgCMNlPLGk`, CLI `vercel` 50.37.1)

**Projet `librery-refonte`** (`prj_XovvOmuJZC8mNO08rCXhOklAUO66`)
- Réglages : Root Directory `maquette`, preset `Other`, Node 24.x.
  - Il n'y a pas de `package.json` dans `maquette/`, donc aucun build ne tourne sur Vercel. Les pages HTML générées sont servies telles qu'elles sont commitées.
- Adresses :
  - production : `https://librery-refonte.vercel.app` ;
  - alias de branche : `librery-refonte-git-claude-zen-sagan-nuppbn-downing.vercel.app`.
- **L'intégration Git fonctionne de nouveau.**
  - Le push de `ead6a58` (02:25:00) a déclenché le déploiement `dpl_Hf4UxBKnpjSVvLUJy6jnGZnrubC3` (02:25:10, prêt).
  - Le 12/10, elle était en panne (`errorCode: git_info_fail`). Contournement utilisé alors : copier `maquette/` dans `/private/tmp/claude-501/deploy-librery`, puis `vercel deploy --prod --yes --scope downing`.
- `maquette/vercel.json` :
  - `cleanUrls: true`, `trailingSlash: false` ;
  - `/assets/img/(.*)` → `max-age=86400` ;
  - `/assets/(css|js)/(.*)` et `/parfum/(.*)` → `max-age=0, must-revalidate` ;
  - `X-Robots-Tag: noindex, nofollow` sur tout le site.
- `maquette/.vercelignore` : `src`, `build.py`, `_proto` ne sont pas envoyés.
- Contrôle :
  - `vercel ls librery-refonte --scope downing`
  - `vercel inspect <url> --scope downing`

**Projet `librery-catalogue-3d`** (`prj_FFACuXZhjPjHk2DUpumTk4pIfXuj`)
- Réglages : preset Vite, `npm run build`, sortie `dist`, Root `.`. Redéploie à chaque push sur `main`.
- Dernier déploiement prêt : `88e3c77` (le décor « chevet » est en ligne).
- `vercel.json` :
  - `/pages/(uhd|hi|lo)/` → immutable 1 an ;
  - `/pages/manifest.json` → no-cache ;
  - `/mediapipe/` → 7 jours ;
  - redirection `/photos` → `/photos/`.
- **Piège signalé** : Vercel bloque le déploiement d'un commit dont l'auteur porte l'e-mail local du Mac (`…@MacBook-Pro-de-Svbri-13806.local`).
  - Il faut toujours committer avec l'identité noreply GitHub. Elle est déjà dans la config locale : ne pas la surcharger.
- Côté boutique : `maquette/assets/js/data.js` a `const CATALOGUE_DECOR_CHEVET = true;` depuis `7cc2f33` (15/10).
  - Le décor est maintenant en ligne. `initLecteur` le détecte aussi tout seul via le message `pret` (`d.decors.includes('chevet')`, main.js l.1531).
  - En local, `?cat=http://localhost:5174/` remplace le catalogue (seulement sur localhost ou 127.0.0.1, main.js l.1257-1262).

### C.3 Build de la maquette et invalidation du cache (`maquette/build.py`, Python 3.9.6 + Pillow 11.3.0)

- Sources : `src/[!_]*.html` plus l'en-tête commun `src/_head.html`. La sortie va dans `maquette/<page>.html`.
  - Les pages générées sont commitées : il faut **toujours** lancer `python3 build.py` avant de committer.
- Format de la 1re ligne de chaque source : `<!-- title: … | page: … | body: … [| run: …][| folio: …][| scripts: …] -->`.
- Gabarits et remplacements :
  - `{{pic nom|alt|sizes|eager}}` → `<img>` avec srcset `nom-m.webp` et `nom.webp`, largeurs réelles ;
  - `{{logo}}` et `{{logo-couverture}}` → SVG insérés dans la page.
- Fichier généré `assets/js/imgw.js` (`const IMGW = {nom: [l_petite, l_grande, hash8, gold?]}`) :
  - ne pas l'éditer à la main ;
  - `gold()` mesure les packshots dont le nom correspond à `-pack(30)?$|^discovery-` (boîte produit, ratio h/l, couleurs des bords).
- Versionnement `?v=` :
  - images : md5 de `-m.webp` et `.webp` ;
  - `style.css` ;
  - scripts `logo.js`, `imgw.js`, `data.js`, `paiement.js`, `main.js`, chargés dans cet ordre ;
  - modules de la carte d'import : `sillage3d.js` (remplacé dans `_head.html`), `chevet3d.js` et `chevet-photo.js` (chaîne `"/assets/js/<m>"` remplacée dans la page).
- **`sillage3d.js` doit rester un seul module**, sans import relatif.
  - Seul son URL racine reçoit un `?v=`. Un sous-module `./x.js` ne serait ni versionné ni connu de la carte d'import, ni du préchargement de `initPrechauffe`, qui lit les adresses dans `script[type=importmap]`.
  - Il faut aussi garder la chaîne exacte `/assets/js/sillage3d.js` dans `_head.html`.
  - Même règle pour `chevet3d.js` : il n'importe que `three`, `three/addons/…` et `chevet-photo`.
- Carte d'import : `three` → `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js` (r170). Le catalogue 3D est en r186.
- `maquette/README.md` est obsolète sur un point : il indique `npx serve .` et le port 3000. La référence est `npx -y serve@14 -l 4173 .` dans `maquette/`.

### C.4 Tester

- Serveur : `cd /Users/svbri/libreryShopify/maquette && npx -y serve@14 -l 4173 .`
  - Appeler les URL **sans `.html`** : `serve` perd la query string sur `x.html`.
- Playwright 1.61.1 : `require('/Users/svbri/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')`.
  - `executablePath: '/Users/svbri/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell'`.
- **Vrai GPU** : `args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']`, environ 3 à 6 s par image affinée en 1280×720.
- **Éviter SwiftShader** (`--use-angle=swiftshader --enable-unsafe-swiftshader`) :
  - environ 5 min par image affinée ;
  - un tour de page met environ 1 min à se stabiliser ;
  - sur la page desktop, aucun IntersectionObserver ne se déclenche après le premier rappel, donc le chevet 3D et la cascade éditoriale ne se chargent jamais.
- Sauter l'écran de chargement : `page.addInitScript(() => sessionStorage.setItem('librery-vu','1'))`.
  - C'est la classe `is-seen` posée par `_head.html`.
- Mesures de préchargement : `window.__prechauffe = { depart, chevet, fichiers, cadran, images, monte }` (ms).
- Catalogue 3D : `npm test` et `npm run dev` (port 5174) dans `librery-catalogue-3d`.
- **Test en ligne de « Feuilleter »** : `node tests/live-feuilleter.cjs desktop lecture` (aussi `mobile`, `presse` = clic immédiat, `bloque` = catalogue refusé, le secours doit prendre le relais à 10 s). Il relève les messages `pret`/`revenu`, l'adresse de l'iframe (`decor=chevet` attendu), les temps depuis le clic et filme la bascule.

### C.5 Notes de migration Shopify trouvées dans le code

- `data.js` (en-tête) :
  - correspondance 1:1 avec des produits, plus les métachamps `accroche`, `notes`, `parfumeur`, `matières` ;
  - collections ;
  - métaobjets « parfumeur » et « point de vente » ;
  - métaobjet « famille » (nom, texte, image), relié par un métachamp liste dont la 1re entrée est la famille principale ;
  - métaobjet « matiere » (étagère) ;
  - `video` et `videoMobile` = métachamps de collection ; `scene`/`video` produit = métafield ;
  - collection en pause = collection dépubliée plus redirection d'URL ;
  - prix du 12/10 : 170 / 90 / 7 €, coffrets 40 / 430 / 250 €.
- `main.js` :
  - gabarits `header.liquid`, `footer.liquid`, `cart-drawer.liquid`, `main-collection.liquid`, `main-product.liquid` ;
  - snippets `icon.liquid` et `sillage.liquid` (notes lues dans les métachamps) ;
  - section `hero-scroll` et bloc `image-mosaic` ;
  - fournis par Shopify : compte client, CGV, paiement (« Commander »), INCI.
- `paiement.js` : snippet `paiements.liquid`, une entrée par `shop.enabled_payment_types`.
- `sillage3d.js` : métaobjet « note » (clé, famille, nuance, teinte, chaleur). Pour l'instant, le tableau `NOTES` est en dur.
- `style.css` : chaque bloc `.s-*` correspond à une section Shopify.
- Marqueurs `<!-- SECTION : … -->` :
  - `index.html` : hero-scroll, product-grid ×2, image-mosaic ×2, flipbook (section « catalogue »), shelf, image-banner ;
  - `bibliotheque.html` : families, faq ;
  - `preface.html` : spread ×3, people, catalogue ;
  - `lexique.html` : sillage, families.
- `CLAUDE.md` :
  - jetons uniquement par variables d'environnement (`SHOPIFY_FLAG_STORE`, `SHOPIFY_CLI_THEME_TOKEN`, `SHOPIFY_ADMIN_TOKEN`) ;
  - plan prévu : thème caché, prévisualisation, puis publication.
- `contenu-actuel/` : relevé du site actuel libreryparfum.com au 25/09 (thème Minimog OS 2.0 v5.5.0).
  - Contient `CONTENU.md`, `donnees/{collections,meta,pages,products}.json` et `images/`.

### C.6 Dossiers annexes (suivis)

- **`retours/`**
  - `2026-10-12-nolwenn.md` : liste des corrections faites. Exemple : pour réactiver Bougies, retirer `hidden: true` dans data.js et remettre le lien dans main.js.
  - `questions-nolwenn.md` : code du coffret, paiement en 3 fois, etc.
  - `whatsapp/*.txt` : transcriptions whisper. Seuls les `.txt` sont suivis. Les médias (≈ 274 Mo) et `_chat.txt` sont ignorés.
    - Outil : `/opt/homebrew/bin/whisper-cli` avec `~/.whisper-modeles/ggml-large-v3-turbo-q5_0.bin` et `transcrire.sh`.
  - `discovery-photos/` : `d01–d21.jpg`, `refs/*-pack(30).jpg`, `outils/{masque.swift,packshot.py}`.
  - **`pdf/`** (PDF « Vos retours, appliqués », 1600×900), en trois étapes :
    1. `node shots.cjs https://librery-refonte.vercel.app avant` puis `node shots.cjs http://localhost:4173 apres` ;
    2. `python3 build.py` ;
    3. `node render.cjs` → `LIBRERY-retours-12-octobre.pdf`.
    - `avant/`, `apres/`, `img/`, `.pages/` et `retours.html` sont ignorés.
- **`livraison/`** : `python3 build_livraison.py` puis `node render.js` → `livraison/LIBRERY-livraison-site.pdf` (ignoré).
  - Il faut le copier à la main en `maquette/livraison-site.pdf`.
- **`dossier/`** : `build_dossier.py` puis `render.js` → `LIBRERY-refonte-dossier.pdf` (A4 paysage, ignoré). La version publiée est `maquette/dossier-refonte.pdf`.
- **Chemins cloud** : `livraison/render.js`, `dossier/render.js` et `video/capture.js` font `require('/opt/node22/lib/node_modules/playwright')`. Ce chemin n'existe pas sur le Mac : remplacer par le chemin npx ci-dessus.
- **`video/`** (Remotion 4.0.529, React 19) :
  - `npx remotion render Film out/LIBRERY-site.mp4` → copier en `maquette/video-site.mp4` (41 Mo).
  - `node_modules` n'est pas installé sur le Mac.
  - `remotion.config.js` pointe vers `/opt/pw-browsers/.../headless_shell` (Linux) : définir `REMOTION_CHROME`.
- **`3d/`** : flacon 100 ml en Blender.
  - Script principal `scripts/build_flacon.py`, qui exporte vers `maquette/parfum/` (`flacon-100ml.glb`, `parfums.json`, `modele.json`, `labels/`).
  - Le dossier contient aussi `flacon-100ml.blend`, `renders/` et `bureau/{bois.html,cuire.cjs}` (bois de noyer procédural « cuit » en `maquette/assets/img/catalogue/bureau(-m).webp`).
- **`generations/`** : images Higgsfield.
  - Série retenue : `skin-obsession-soul-final/`.
  - Higgsfield via MCP : `nano_banana_2_1`, `4k`, envoi des images par `media_upload` → PUT → `media_confirm`.
- **`maquette/_proto/`** (80 Mo) : ignoré par git et par Vercel, donc **local au Mac uniquement**.
  - Prototypes `hero`, `meuble`, `catalogue`, `sillage`, `tables`, `travaux`.
  - Scripts de workflow `wf-*.js` et `chevet-accueil-issues.json`.

### C.7 Historique récent

**libreryShopify (25 derniers commits)**
- `7cc2f33` 15/10 ~03:30 — « Feuilleter le catalogue » dans le décor du chevet sur un vrai réseau (préparation anticipée, « Ouverture… », secours 10 s, cadre remplacé au lieu d'être renavigué) ; questions du Portrait olfactif
- `ead6a58` 15/10 02:25 — Accueil : en-tête « recul et pile » ; chevet 3D photoréaliste ; « Feuilleter » dans le même décor ; préchargement ; cadran épuré à onde colorée ; cascade 3D ; nombre d'or sur tous les packshots ; images Nolwenn 13/10 ; logos de paiement
- `5d3d127` 12/10 23:26 — Fiche produit : packshot au nombre d'or, liens vers le catalogue 3D dans le même onglet (auteur : e-mail du Mac)
- `6e0143c` 12/10 23:08 — Catalogue sur bureau en noyer ; écran de chargement
- `626a873` 12/10 20:52 — Catalogue feuilleté : bande beige, livre de face
- `899d143` 12/10 20:48 — Accueil : catalogue feuilleté au défilement
- `9d6aef4` 12/10 19:27 — PDF retours : coffrets, film, captures (17 p.)
- `9091828` 12/10 19:22 — Film Skin Obsession remplace le diaporama
- `786a8c0` 12/10 18:31 — PDF retours sans citations
- `a9573b5` 12/10 18:30 — Discovery Sets : packshots Nano Banana 2.1 4K
- `9e3630a` 12/10 18:29 — PDF retours final (16 p.)
- `9cbfb17` 12/10 18:17 — Couverture A « Haute parfumerie »
- `92dcad7` 12/10 18:12 — Film sans image d'attente
- `9703b2a` 12/10 18:12 — Film muet forcé (Safari/iPhone) et bouton Pause
- `cd8dc61` 12/10 17:47 — Captures « après » du site en ligne
- `a9a44c9` 12/10 17:32 — Retours Nolwenn 12/10 : corrections, prix, 25 points de vente
- `2bcdba6` 12/10 13:37 — Note de passation (CLAUDE.md)
- `16bd90d`, `6f866a7`, `59c973a`, `8c470c7`, `90282f3`, `876a26d`, `3f714a7`, `6a49610`, `205b1e4` (11/10) — séries d'images Skin Obsession (Soul 2.0, GPT Image 2.5 max/4K, Nano Banana 2.1, Seedream 5.0 Pro)

**librery-catalogue-3d (25 derniers commits)**
- `88e3c77` 15/10 — Décor « chevet » pour la boutique (decor/cadre/table, plateau noyer 4k, boucle arrêtée à la fermeture)
- `330edf4` 13/10 — Mode intégré `?embed=1` : messages `pret`/`fermer`, Échap
- `f2dca24` 12/10 — Bouton « Back to the shop », `?retour=` limité aux domaines LIBRERY
- `f9916f4`, `99f3325`, `39ae31b` (08/10) — Mises à jour du catalogue
- `e4571ec`, `801988a`, `adf6424` (06/10) puis `abbffa1`, `ebdd864`, `e6901c7` (26-27/09) — Propositions de couvertures
- `c3ebe64` 26/09 — Packshots fond blanc (22 prises, 3 formats)
- `73343da`, `e8230b6`, `1687bad`, `114e4fc`, `60785cd` (24-25/09) — Mises à jour du catalogue
- `fdebda9`, `1fc72a4`, `422f114` (23/09) — Ouvertures de chapitre, textes, catalogue d'après la maquette de Nolwenn
- `4c329bf` 21/09 — Page `/photos/`
- `7aadffd`, `7642df4`, `6e342c9` (19/09) — Mobile, mode cinéma, packshots des fiches

### C.8 Dossiers non suivis (`git status`)

- **`generations/discovery-sets-nb21/`** (115 Mo) : packshots Nano Banana 2.1 en 4K.
  - `2ml-ouvert/ferme.png`, `30ml-{skin-obsession,summer-vibes}-{ouvert,ferme}.png`, `planche-discovery-sets.jpg`.
  - `2ml-ferme-v1-LIBRIERY.png` est une version au logo mal orthographié.
  - Les dérivés web sont déjà suivis : `maquette/assets/img/v2/discovery-*.webp`.
- **`retours/bois/`** (3,3 Mo) : copie identique de `3d/bureau/{bois.html,cuire.cjs}`, plus les sorties `bureau(-m).png/.webp`.
  - Les `.webp` sont identiques à `maquette/assets/img/catalogue/bureau(-m).webp`. Doublon.
- **`retours/nolwenn-13-10/`** (69 Mo) : `avant-apres.jpg` et `zip/Site web/` (18 images de Nolwenn du 13/10, intégrées dans `ead6a58`).
- **`retours/tables/`** (2 Mo) : `tables-polyhaven.png`, planche de tables Poly Haven (CC0).
- **`retours/video-catalogue/`** (360 Mo) :
  - `capture.cjs` capture le flipbook de librery-refonte.vercel.app en desktop 1440×900 et iPhone 390×844, à 30 i/s ;
  - `montage.py` monte les deux côte à côte en 1920×1080 sur fond espresso → `LIBRERY-catalogue-feuillete.mp4` (1,6 Mo) ;
  - `frames/` (690 PNG, 218 Mo) et `comp/` (140 Mo) sont des intermédiaires qu'on peut supprimer.

### C.9 Pièges connus

- **Disque presque plein** : il est tombé à 300 Mo libres le 15/10 vers 03 h 30 (1,9 Go après nettoyage des essais). Vérifier `df -h /` avant tout rendu.
  - Il restait environ 17 Go après le redémarrage précédent. Les rendus (frames PNG, films) le remplissent vite.
  - Gros postes : `retours/` 976 Mo, `.git` de la boutique 421 Mo, `.git` du catalogue 948 Mo, `dist` du catalogue 195 Mo, transcription de session 97 Mo.
  - Supprimer les dossiers de frames après chaque encodage.
- **`/tmp` vidé au redémarrage** : le scratchpad (`/private/tmp/claude-501/...`) et `deploy-librery` ont disparu. Ne rien y garder d'important.
- **Coupures réseau `ENOTFOUND`** (110 occurrences) : `api.anthropic.com` injoignable fait échouer les agents de workflow, et un push peut aussi échouer. Relancer quand le réseau revient.
- **Machine surchargée** (load > 100) : un lot de rendus a été bloqué environ 17 min.
- **E-mail d'auteur** :
  - catalogue : noreply GitHub obligatoire, sinon Vercel bloque ;
  - boutique : `git -c user.name=Claude -c user.email=noreply@anthropic.com`.
- **Cache** : toute modification d'image, de CSS ou de JS demande `python3 build.py`, sinon le `?v=` ne change pas. Les images sont en `max-age=86400`.
- **`sillage3d.js`, `chevet3d.js`, `chevet-photo.js`** : un fichier chacun, sans import relatif (voir C.3).
- **Chantiers en parallèle** : plusieurs agents ont souvent travaillé en même temps sur `main.js` et `style.css`. Faire `git pull` et `git diff` avant de toucher ces fichiers, et n'éditer que sa région.
- **Client** : `maquette/parfum/` (visionneuse 3D) ne doit pas être montré pour l'instant.
- **Retours en attente côté cliente** : photos des packagings, coffrets et discovery, mosaïques, contenu Bougies, validations du PDF.