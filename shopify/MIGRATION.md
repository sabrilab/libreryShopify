# Migration de la maquette LIBRERY sur Shopify

Préparé le 15/10/2026, avant de recevoir les accès. Tout ce qui se fait sans accès est fait ; il reste les étapes du
jour J, qui demandent la boutique. Rien ne doit être publié sans le feu vert de Sabri.

La boutique existe déjà : **libreryparfum.com** (`5rnnyv-yz.myshopify.com`, thème Minimog, 5 parfums Summer Vibes
« Épuisé » au relevé du 25/09, variantes « 100ML » à 198 € et « 2ML » à 7 €). On n'en crée pas une nouvelle : on y
installe un **nouveau thème caché**, on y importe les produits et les textes, puis on bascule.

---

## 1. Ce qui est prêt

| Élément | Où | État |
|---|---|---|
| Thème Shopify complet, généré depuis la maquette | `shopify/theme/` (source écrite à la main : `shopify/theme-src/`, générateur : `shopify/build_theme.py`) | Theme Check : 0 erreur. Aperçu local : 18 pages × 2 écrans sans erreur JavaScript, caisse, stock et prix vérifiés |
| Script d'import (produits, prix, variantes, métachamps, pages, collections, redirections) | `shopify/import/` (voir son `README.md`) | Essai à blanc et tests hors ligne |
| Aperçu local du thème, sans boutique | `shopify/tests/` (`npm install && npm run essai`) | Rejouable après chaque changement |
| Catalogue 3D : domaine `libreryparfum.com` accepté (retour à la boutique, mode intégré) | dépôt `librery-catalogue-3d`, branche `claude/project-thread-4wwge2` | **À fusionner sur `main` avant le jour J** (sans cela, « Feuilleter » perd le décor chevet et le bouton retour sur le vrai domaine) |
| Médias lisibles depuis la boutique (en-tête CORS) | `maquette/vercel.json` | **À publier avant le jour J** (sans cela, le chevet 3D et le cadran du sillage ne chargent pas leurs fichiers depuis libreryparfum.com) |

## 2. Comment le thème est construit (le « pont »)

La maquette reste la seule source. `build_theme.py` reprend ses pages assemblées, son CSS et ses scripts presque tels
quels ; il ne change que trois choses, toutes vérifiées à chaque génération (le script s'arrête si la maquette a changé
à un endroit qu'il retouche) :

1. **Les adresses** : `/produit?p=x` → `/products/x`, `/collection?c=x` → `/collections/x`,
   `/bibliotheque`, `/preface`, `/lexique`… → `/pages/…`. Compte client → `/account` ; CGV, mentions légales,
   confidentialité → les pages existantes de la boutique.
2. **Les médias** (images, films, 3D) restent servis par le site Vercel de la maquette (réglage du thème
   « Hébergement des médias », par défaut `https://librery-refonte.vercel.app`). Les scripts sont, eux, sur le CDN
   de Shopify.
3. **Le commerce** vient de Shopify :
   - prix, variantes et stock : lus dans la boutique (`snippets/librery-shop.liquid`) et fusionnés avec `data.js`
     (`assets/librery-shopify.js`). Les formats sont reconnus par le libellé exact de l'option « Format »
     (« 100 ml », « 30 ml », « 2 ml », « 8 × 2 ml »…) ;
   - un format épuisé ou absent de la boutique ne s'ajoute pas au panier (message) ;
   - « Commander » envoie le panier du tiroir au panier Shopify (lignes marquées `_librery`), avec les attributs
     « Échantillons offerts » et « 2 ml pour essayer » visibles dans la commande, puis ouvre la caisse Shopify ;
   - lettre de la maison → client Shopify avec le tag `newsletter` ; formulaire de contact → e-mail de la boutique ;
   - un produit ou une collection créés plus tard dans l'admin, inconnus de `data.js`, s'affichent avec une fiche
     ou une grille générique rendue par Shopify (aussi servie aux moteurs de recherche, sans JavaScript) ;
   - titre, description, Open Graph et données structurées `Product` par page. La balise `noindex` de la maquette
     n'est **pas** reprise : la boutique sera indexée.

Les textes éditoriaux (descriptions, chapitres, mosaïques, parfumeurs, points de vente) restent dans `data.js` en
phase 1 ; l'import les copie aussi dans des métachamps (`librery.editorial`) pour une phase 2 où Nolwenn les
modifiera dans l'admin.

Pages Shopify et modèles : accueil `index` ; fiche `product` ; collections `collection` ; pages `page.bibliotheque`,
`page.preface`, `page.lexique`, `page.points-de-vente`, `page.portrait-olfactif`, `page.offrir`, `page.services`,
`page.contact` ; CGV et autres textes `page` ; `cart`, `search`, `404`. `/collections/all` et `/collections`
renvoient vers `/pages/bibliotheque`. `/labo` et `/parfum/` (visionneuse) ne passent pas sur Shopify.

## 3. À demander avant le jour J

**Accès** (à Nolwenn, propriétaire de la boutique) :
- un compte collaborateur ou employé pour Sabri avec les droits Thèmes, Produits, Pages, Navigation, Préférences,
  Applications (pour créer l'application privée) ;
- une **application** pour l'import, avec les autorisations listées dans `shopify/import/README.md`. Shopify ne
  permet plus d'en créer de nouvelles depuis l'admin : soit un jeton `shpat_…` d'une application personnalisée qui
  existe déjà (`SHOPIFY_ADMIN_TOKEN`), soit une application du Dev Dashboard installée sur la boutique, dans la même
  organisation (`SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET`, échangés par le script contre un jeton de 24 h) ;
- l'application **Theme Access** (gratuite, Shopify) pour un mot de passe de thème → `SHOPIFY_CLI_THEME_TOKEN`.
  Jamais de jeton dans le chat ni dans un fichier : variables d'environnement seulement.

**Informations** :
1. Le stock de chaque parfum et format (100 ml, 30 ml, 2 ml, coffrets), ou « stock non suivi ».
2. Les SKU ou codes EAN existants, s'il y en a (sinon l'import pose `LIB-<PARFUM>-<FORMAT>`).
3. Livraison : tarifs, pays, et la livraison offerte dès 100 € (promesse affichée partout sur le site).
4. Paiement : moyens activés ; le « paiement en 3 fois » affiché dans le panier demande Shop Pay Installments,
   Alma ou Klarna (aujourd'hui `offers_shop_pay_installments: false`).
5. Codes promo : le code du Coffret Découverte (recrédité, 30 jours, Coffret Découverte uniquement) à créer dans
   Remises.
6. Applications installées sur Minimog (avis, lettre d'information, traduction…) : à garder ou non.
7. CGV, mentions légales, confidentialité : textes à jour (les pages actuelles sont reprises telles quelles).
8. Date et heure de bascule souhaitées (de préférence un moment creux).

## 4. Le jour J, dans l'ordre

Préalable sur le Mac : `export SHOPIFY_FLAG_STORE=5rnnyv-yz.myshopify.com`, `SHOPIFY_CLI_THEME_TOKEN=…`,
`SHOPIFY_ADMIN_TOKEN=…` ; Shopify CLI installé (`npm i -g @shopify/cli`).

**A. Préparer (invisible pour les clients)**
1. Régénérer le thème avec la maquette du jour : `cd maquette && python3 build.py && cd .. && python3 shopify/build_theme.py`
   (le chevet de l'accueil change dans un autre chantier : régénérer après sa fusion), puis
   `cd shopify/tests && npm run essai` (doit finir par « tout est passé »).
2. Contrôler : `shopify theme check --path shopify/theme --config shopify/.theme-check.yml`.
3. Sauvegarder la boutique : `node shopify/import/importer.mjs --sauvegarder` (export JSON des produits, prix,
   pages, redirections : la référence pour revenir en arrière). Dupliquer aussi le thème Minimog dans l'admin.
4. Essai à blanc : `node shopify/import/importer.mjs` (affiche ce qui serait créé ou modifié, n'écrit rien).
5. `node shopify/import/importer.mjs --appliquer=preparation` : définitions de métachamps et métaobjets, nouveaux
   produits en **brouillon**, nouvelles pages **non publiées**. Les 5 parfums existants ne bougent pas.
6. Pousser le thème caché : `shopify theme push --unpublished --theme "LIBRERY 2026" --path shopify/theme`.
7. Dans l'éditeur de thème : vérifier le réglage « Hébergement des médias ».

**B. Prévisualiser**
8. Ouvrir l'aperçu du thème caché (lien de prévisualisation partageable, à envoyer à Nolwenn). Limite connue :
   les produits en brouillon n'y apparaissent pas ; tant qu'ils le sont, les pages concernées montrent les prix de
   la maquette et le panier refuse ces produits (« Ce format arrive bientôt »). Si l'aperçu complet est voulu avant la
   bascule, publier les nouveaux produits plus tôt (risque faible : la boutique actuelle n'a qu'une collection et ne
   les lie nulle part) — à décider avec Sabri.
9. Parcours à faire sur ordinateur et iPhone : accueil (en-tête, chevet, Feuilleter), une fiche de chaque collection,
   coffrets, panier → caisse (sans payer, ou commande test avec le mode test de Shopify Payments), contact, lettre.

**C. Basculer (visible)**
10. `node shopify/import/importer.mjs --appliquer=bascule` : nouveaux prix (170 / 90 / 7 €, coffrets 40 / 430 / 250 €),
    option « Format », SKU, descriptions et métachamps des 5 parfums existants ; nouveaux produits et collections
    publiés ; nouvelles pages publiées ; redirections (`/pages/nos-points-de-vente` et les adresses de la maquette).
    Le script refait d'abord la sauvegarde et demande de taper BASCULE.
11. Publier le thème « LIBRERY 2026 » (Admin → Thèmes → Publier). Stock : saisi par Nolwenn ou suivi désactivé.
12. Vérifier en ligne : une commande test (puis remboursée), les e-mails de confirmation, le formulaire de contact,
    `libreryparfum.com/products/hot-sand` affiche 170 €, `/pages/nos-points-de-vente` redirige.
13. Google Search Console : soumettre `https://libreryparfum.com/sitemap.xml`.

**Retour arrière** : republier le thème Minimog (un clic, immédiat). Les prix et descriptions se remettent à partir
de la sauvegarde JSON de l'étape 3 (ou de 10).

## 5. Points de vigilance

- **Le chevet de l'accueil est en train d'être refait** (séquence d'images Blender, autre chantier, branche
  `claude/project-thread-85n3yx`). Rien à faire ici : une fois fusionné dans la maquette, relancer `build_theme.py`
  puis l'aperçu local. Si le nouveau code change une ligne que le générateur retouche, il s'arrête et dit laquelle.
- **Photos de packaging** (attendues) : les intégrer d'abord à la maquette (`assets/img/v2/` + `data.js`, `build.py`),
  puis régénérer le thème ; l'import les envoie comme médias produit.
- **Prix en direct** : changer un prix dans Shopify se voit tout de suite sur le thème en ligne. C'est pourquoi les
  prix des 5 parfums existants ne changent qu'à l'étape 10, avec la publication du thème.
- **Médias sur Vercel** : le site de la maquette doit rester en ligne tant que le thème y lit ses médias. Ses en-têtes
  `noindex` s'appliquent aussi aux images (pas d'indexation dans Google Images ; les pages, elles, sont indexées).
  Phase 2 possible : copier les médias dans Fichiers de Shopify.
- **Panier** : le tiroir garde le panier dans le navigateur ; il n'est pas partagé entre appareils, et les relances de
  panier abandonné de Shopify ne partent qu'une fois la caisse ouverte.
- **Nouveaux produits** créés plus tard directement dans l'admin : ils s'affichent avec la fiche générique tant qu'ils
  ne sont pas ajoutés à `data.js` (ou lus depuis les métachamps en phase 2).
- **Dépôt public** : ce dossier ne contient ni jeton, ni donnée client ; les sauvegardes et journaux de l'import sont
  ignorés par git (`shopify/import/.gitignore`).
