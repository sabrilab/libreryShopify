# Le chevet de l'accueil, rendu dans Blender

Depuis le 15/10/2026, la plongée du chevet (accueil, section catalogue) n'est plus de la 3D en temps réel : c'est une
séquence d'images rendues dans Blender (Cycles), jouée au défilement par `maquette/assets/js/chevet-seq.js`.
Même scène et même mouvement de caméra que l'ancienne scène Three.js (`maquette/assets/js/chevet3d.js`, gardée comme
référence : la caméra en est relevée image par image).

| Étape | Script | Sortie (dans `travail/`, ignoré par git) |
|---|---|---|
| 1. Relever la caméra et la scène dans le navigateur (site local sur le port 4173) | `node capture.mjs 1440 900 120 desktop glb` puis `node capture.mjs 390 844 120 mobile` | `out/camera-*.json`, `out/chevet-scene.glb` |
| 2. Construire les 8 flacons (matières Cycles de `3d/scripts/rendu.py`) | `python flacons.py palmeira ambert-sunset …` | `blend/flacon-*.blend` |
| 3. Rendre la séquence (du grossier au fin) | `PY=python ./lancer.sh` enchaîne 3 à 5 (ou `python chevet_scene.py desktop 0-120 --samples 48`) | `rendus/*.exr` |
| 3 bis. L'ombre au sol seule, pour l'effacer en fin de mouvement (u > ,45) | `python chevet_scene.py desktop 54-120 --ombre --samples 8` (même `--echelle` que le rendu) | `rendus/*-ombre.exr` |
| 4. Développer (Neutral, clair-obscur, vignetage, papier) | `python post.py desktop 0-120` et `python post.py mobile 0-120` | `seq/*.webp` |
| 5. Publier dans le site | `python publier.py` | `maquette/assets/3d/chevet/seq/{paysage,portrait}/` + affiches |

Il faut le module Blender pour Python (`pip install bpy` : Blender 5.2, Python 3.13), Pillow, NumPy et OpenEXR.
Le catalogue 3D (`CATALOGUE_3D`, par défaut `~/Projects/librery-catalogue-3d`) fournit la couverture en 4096 px.

Réglages de la scène (en tête de `chevet_scene.py`) : la recette « caravage » du prototype (projecteur principal
ambré à l'avant gauche de chaque niche, contre-jour, projecteur du velours, soleil de la pièce arrêté par un drapeau),
velours noir chaud avec la lueur de réglette au pied, laque des étagères, bandes de studio vues seulement dans le verre,
le jus et l'or. Définition : iPhone ×3 (1310 × 2634 px avec la marge), ordinateur ×2 (3226 × 1855 px), 24 échantillons + débruitage
OIDN. Durée sur 4 cœurs : ~150 s par image iPhone, ~260 s par image ordinateur, 242 images en tout.
