# LIBRERY — refonte du site (notes pour les sessions Claude Code)

Branche de travail : `claude/zen-sagan-nuppbn`. Faire `git pull` avant de commencer et `git push` en fin de tâche :
la session cloud et la session locale (Mac) travaillent sur cette même branche.

## Projet
Refonte du site de parfums LIBRERY (Paris). Maquette statique validée avant le passage sur Shopify.
- Maquette en ligne : https://librery-refonte.vercel.app (déployée par Vercel depuis cette branche, dossier `maquette/`).
- Client : LIBRERY (interlocutrice : Nolwenn).

## Dossiers
- `maquette/` — le site statique. `src/*.html` + `assets/` ; `python3 build.py` assemble les pages et versionne
  les images (`?v=hash`). Serveur local : `npx -y serve@14 -l 4173 .` dans `maquette/`.
  - Données produits dans `assets/js/data.js` (PRODUCTS, COLLECTIONS…), logique dans `assets/js/main.js`.
  - Galerie fiche produit en « pleine colonne » ; « horloge du sillage » sur chaque fiche parfum et dans le Lexique.
  - `maquette/parfum/` : visionneuse 3D du flacon (chantier à part, ne pas la montrer au client pour l'instant).
- `livraison/` — PDF de livraison (`build_livraison.py` puis `node render.js`) → `maquette/livraison-site.pdf`.
- `dossier/` — dossier de refonte (PDF d'analyse).
- `video/` — film de présentation (Remotion, musique « aeria »). `npx remotion render Film out/LIBRERY-site.mp4`
  → publié en `maquette/video-site.mp4`. Les flacons 3D ont été retirés du film à la demande.
- `3d/` — modélisation Blender du flacon 100 ml.
- `generations/` — images générées (Higgsfield). Série retenue en dernier :
  `generations/skin-obsession-soul-final/` (visages Soul 2.0 + vrai flacon réintégré par GPT Image 2.5, max/4K).

## Règles de la direction artistique
- Fond blanc : uniquement les packshots du dépôt GitHub `librery-catalogue-3d` (jamais de photos détourées).
- Images : réalistes, pas d'aspect « IA », pas de grain ; flacon fidèle (bouchon doré carré à encoches en V,
  logo LIBRERY gravé en creux sur le dessus du bouchon), proportions réelles d'un 100 ml.
- Génération d'images : GPT Image 2.5 en qualité `max` / 4K pour la meilleure définition ;
  Soul 2.0 pour les visages, puis réintégration du flacon en GPT Image 2.5.
- Ne jamais coller de mots de passe ou de jetons dans le chat : variables d'environnement uniquement
  (`SHOPIFY_FLAG_STORE`, `SHOPIFY_CLI_THEME_TOKEN`, `SHOPIFY_ADMIN_TOKEN`, etc.).

## En cours / à venir
- Retours de Nolwenn du 12/10 : traités et en ligne (liste et décisions dans `retours/2026-10-12-nolwenn.md`,
  réponses à ses questions dans `retours/questions-nolwenn.md`, PDF avant/après dans `retours/pdf/`).
  En attente côté cliente : photos packagings/coffrets/discovery, photos des mosaïques, contenu Bougies, validations du PDF.
- Produits / collections « en pause » : `paused: true` (produit) et `hidden: true` (collection) dans `data.js`.
- Passage sur Shopify dès réception des accès (thème caché, prévisualisation, puis publication).
- Agents WhatsApp : piste VPS OVH + API WhatsApp Cloud (numéro de test Meta pour commencer) ; rien d'installé.
