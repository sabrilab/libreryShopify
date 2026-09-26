# Site LIBRERY — refonte (v2)

Site statique (HTML/CSS/JS) de présentation de la refonte, déployé sur Vercel (projet `librery-refonte`).
Direction artistique et contenus repris du **catalogue A4 v4** (dépôt `sabrilab/librery-catalogue-3d`) :
papier ivoire, brun espresso, or ; Caslon (texte), Cormorant (titres), Marcellus (logo), signatures manuscrites.

- `src/*.html` : contenu des pages — `python3 build.py` assemble les pages finales à la racine
  (`{{pic nom|alt|sizes|eager}}` → image responsive `nom-m.webp` 900 px + `nom.webp` 1600–2400 px).
- `assets/js/data.js` : produits, collections, parfumeurs, points de vente (→ produits / métachamps / métaobjets Shopify).
- `assets/img/v2/` : images extraites du PDF d'impression du catalogue (doubles pages recollées au pli)
  et de la galerie `public/photos` du dépôt catalogue.
- Chaque bloc `<!-- SECTION : … -->` correspond à une future section du thème Shopify.

Local : `npx serve .` puis http://localhost:3000
