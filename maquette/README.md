# Maquette LIBRERY — refonte

Site statique (HTML/CSS/JS) de présentation de la refonte, déployé sur Vercel.
Chaque bloc commenté `<!-- SECTION : … -->` correspond à une future section du thème Shopify.

- `src/*.html` : contenu des pages — `python3 build.py` assemble les pages finales à la racine.
- `assets/js/data.js` : produits, collections, parfumeurs, points de vente (→ produits / métachamps / métaobjets Shopify).
- `assets/css/style.css` : direction artistique (noir, blanc cassé, crème — Cormorant Garamond + Jost).

Local : `npx serve .` puis http://localhost:3000
