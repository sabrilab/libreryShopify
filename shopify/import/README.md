# Import LIBRERY → Shopify

`importer.mjs` charge `maquette/assets/js/data.js` et l'envoie dans la boutique (`5rnnyv-yz.myshopify.com`)
par l'API Admin GraphQL **2026-10**. Node ≥ 18, aucune dépendance.

## Ordre à suivre

```sh
cd shopify/import
node importer.mjs --essai                 # 1. simulation (aucune écriture)
node importer.mjs --sauvegarder           # 2. export de référence pour revenir en arrière
node importer.mjs --appliquer=preparation # 3. étapes invisibles pour les clients
#                                           4. aperçu du nouveau thème (thème caché, « Aperçu »)
node importer.mjs --appliquer=bascule     # 5. jour J : demande de taper BASCULE (sauf --oui)
```

Tests hors ligne : `node --test shopify/import/` depuis la racine du dépôt, ou `npm test` dans ce dossier.

## Ce que fait chaque mode

| Mode | Écrit ? | Contenu |
|---|---|---|
| `--essai` (par défaut) | non | Construit tous les envois depuis data.js et affiche le plan. Avec des identifiants, lit aussi la boutique (produits, collections, pages, définitions, métaobjets, redirections) et indique pour chaque élément création / mise à jour / inchangé. |
| `--sauvegarder` | non | Exporte produits (variantes, prix, options, descriptions, photos, statut, métachamps), collections, pages, redirections et définitions dans `sauvegardes/<horodatage>.json`. |
| `--appliquer=preparation` | oui, invisible | Définitions de métachamps `librery.*` (produits, collections) et de métaobjets ; entrées `parfumeur`, `famille`, `point_de_vente` ; **nouveaux** produits en **brouillon** (variantes, prix, SKU, photos, métachamps) ; métachamps des 5 produits en vente (lus seulement par le nouveau thème) ; 7 pages **non publiées** avec le gabarit `page.<handle>`. Rejouable sans risque. |
| `--appliquer=bascule` | oui, visible | Sauvegarde automatique, puis : les 5 produits existants (titre, description, SEO, option « Format » 100 ml / 30 ml / 2 ml, nouveaux prix, SKU `LIB-<HANDLE>-<FORMAT>`, photos de la galerie ; les ID de variantes 100ML et 2ML sont conservés) ; tous les produits passent **actifs** et sont publiés sur la Boutique en ligne ; collections `skin-obsession`, `summer-vibes`, `coffrets` (manuelles, ordre de data.js) publiées ; pages publiées ; `contact` → gabarit `page.contact` ; `nos-points-de-vente` dépubliée ; redirections. |

Chaque mode d'écriture laisse un journal dans `journaux/<horodatage>-<mode>.json` (ID créés ou modifiés,
`userErrors`). Au premier `userErrors`, l'import s'arrête net avec un message en français.
`sauvegardes/` et `journaux/` ne sont pas versionnés.

Options : `--oui` (pas de question), `--garder-medias` (la bascule ne remplace pas les photos actuelles des 5 produits).

Ce qui n'est **pas** fait : les quantités en stock (à saisir dans l'admin : les nouvelles variantes sont suivies et
refusent la vente en rupture, donc la 30 ml apparaît épuisée tant que le stock est à 0) ; le réglage
« prix TTC » (l'essai prévient s'il n'est pas activé) ; produits en pause et collection Bougies.

`redirections.csv` reprend les mêmes redirections au format d'import de Shopify
(Admin › Contenu › Menus › Redirections d'URL › Importer), en solution de secours.

## Identifiants (variables d'environnement uniquement)

```sh
export SHOPIFY_FLAG_STORE=5rnnyv-yz.myshopify.com
export SHOPIFY_ADMIN_TOKEN=…            # jeton shpat_… d'une application personnalisée
# ou, pour une application du Dev Dashboard :
export SHOPIFY_CLIENT_ID=…  SHOPIFY_CLIENT_SECRET=…
```

Ne jamais écrire ces valeurs dans un fichier du dépôt ni dans le chat.

**Créer l'accès.** Shopify ne permet plus de créer de nouvelles « applications personnalisées » dans l'admin
(celles qui existent continuent de marcher : Admin › Paramètres › Applications › Développer des applications ›
Identifiants API › jeton Admin API, affiché une seule fois). Pour une nouvelle application :
1. [Dev Dashboard](https://dev.shopify.com) › Créer une application, dans l'organisation qui possède la boutique ;
2. dans la version de l'application, cocher les autorisations ci-dessous, publier la version ;
3. installer l'application sur la boutique ;
4. Paramètres de l'application › copier Client ID et Client secret dans `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET`.
   L'importeur échange ces valeurs contre un jeton valable 24 h (« client credentials »). Cela ne fonctionne que si
   l'application et la boutique sont dans la même organisation.

## Autorisations (scopes) à cocher

| Scope | Pour |
|---|---|
| `read_products`, `write_products` | produits, variantes, photos des produits, collections, définitions de métachamps produit/collection, `metafieldsSet` |
| `read_online_store_pages`, `write_online_store_pages` (ou l'ancien couple `read_content`, `write_content`) | pages |
| `read_metaobject_definitions`, `write_metaobject_definitions` | définitions `parfumeur`, `famille`, `point_de_vente` |
| `read_metaobjects`, `write_metaobjects` | entrées de métaobjets |
| `read_publications`, `write_publications` | trouver la Boutique en ligne, publier produits et collections |
| `read_online_store_navigation`, `write_online_store_navigation` | redirections d'URL |
| `read_files`, `write_files` | recommandé : envoi des photos depuis une URL externe |

## Points d'attention

- Les variantes sont reliées au thème par leur valeur d'option, qui doit être **exactement** le `label` de data.js
  (« 100 ml », « 8 × 2 ml »…). Ne pas les renommer dans l'admin.
- `summer-vibes` doit rester une collection **manuelle** ; si elle est automatique, la bascule s'arrête avant d'écrire.
- La bascule remplace les photos des 5 produits existants par la galerie (les anciennes sont dans la sauvegarde).
  Les images sont tirées de `https://librery-refonte.vercel.app/assets/img/v2/` : la maquette doit rester en ligne
  pendant l'import.
- Les anciennes adresses de la maquette `/produit?p=…` et `/collection?c=…` (paramètres d'URL) ne sont pas
  redirigées : les redirections Shopify portent sur le chemin.
