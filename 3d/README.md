# Flacon Librery en 3D

Modèle 3D du flacon d'extrait de parfum (100 ml) construit dans Blender
par script, exporté en GLB pour Three.js.

Les huit parfums partagent **le même flacon**. D'un parfum à l'autre,
seules changent trois choses : la teinte du verre, la couleur du jus et
l'étiquette. Le site charge donc un seul fichier 3D et applique la
déclinaison à la volée.

```
3d/
├── scripts/
│   ├── geometrie.py      géométrie paramétrique (cotes en tête de fichier)
│   ├── ajuster.py        ajuste les cotes sur les photos → ajustement.json
│   ├── comparer.py       photo | modèle rendu depuis la même caméra
│   ├── parfums.py        couleurs verre / jus et nom de chaque parfum
│   ├── labels.py         génère les étiquettes PNG + parfums.json
│   └── build_flacon.py   assemble le flacon, exporte le GLB, rendus Cycles
├── renders/              planche de validation, rendus Cycles
├── fonts/                Cinzel (OFL) pour le lettrage des étiquettes
└── flacon-100ml.blend    la scène Blender, à ouvrir pour retoucher

maquette/parfum/          page /parfum du site Vercel, écrite par les scripts
├── index.html            visionneuse Three.js (nuancier, capot amovible)
├── flacon-100ml.glb      le modèle
├── modele.json           date et cotes du modèle, affichées sur la page
├── parfums.json          déclinaisons, lu par la visionneuse
└── labels/*.png          sérigraphie de chaque parfum (blanc + alpha)
```

**Voir le modèle en ligne** : `build_flacon.py` exporte directement dans
`maquette/parfum/`. Un commit poussé suffit : Vercel (projet
`librery-refonte`, relié au dépôt) redéploie et la page `/parfum` affiche
le nouveau modèle, avec sa date et ses cotes en haut à droite.

## Le modèle

La géométrie est paramétrique (`scripts/geometrie.py`). Ses cotes ont été
**ajustées sur les photos**, faute de plan technique :

1. la silhouette de face des détourés (masque alpha, mesure au pixel)
   donne largeur, hauteurs, épaules, capot et virole ;
2. `scripts/ajuster.py` reconstruit le flacon dans Blender pour chaque
   jeu de cotes, projette sa silhouette depuis une caméra elle-même
   ajustée à chaque photo, et maximise l'accord (IoU) avec les photos
   réelles de Tonka Love, Vanilla Plum et Magnetic Flowers (≈ 98 %) ;
3. les entailles, qui ne se voient pas en silhouette de face, sont
   mesurées sur les photos de face (Vanilla Plum, Sun Ice).

`scripts/comparer.py` rend le modèle depuis la caméra ajustée de chaque
photo et monte photo | modèle côte à côte : voir
`renders/validation-geometrie.jpg`.

| Pièce | Cotes (mm) |
|---|---|
| Verre | 63 × 48 × 103,5 (l'ajustement photo donnait 60 × 37,8 ; élargi et approfondi à l'œil) ; arêtes verticales en pans coupés de 7,3 ; épaules à 45° sur 11 de haut |
| Dessus du verre | 40,3 × 38,2, pans coupés de 3,4 |
| Entailles du socle | V dans chaque arête, de 11 à 27,5 de haut, pointe à 19, profondeur 5 |
| Cavité (jus) | parois de 5,4, fond de verre de 22,5 |
| Virole | Ø 27 × 3 visibles |
| Capot | 36,5 × 31,3 × 28,3 ; pans coupés de 4,9 ; entailles en V de 1,8 à 11, pointe à 4,8, profondeur 2,8 |
| Hors tout | 134,8 |

Objets du GLB (chacun animable séparément) : `Verre`, `Jus`, `Virole`,
`Col`, `Poussoir`, `Tige`, `TubePlongeur`, `Capot`, `Etiquette`, regroupés
sous `Flacon`.

## Régénérer

Il faut le module Blender pour Python (Python 3.11), Pillow et SciPy :

```sh
python3.11 -m venv .venv && .venv/bin/pip install bpy pillow scipy
.venv/bin/python 3d/scripts/labels.py                      # étiquettes + parfums.json
.venv/bin/python 3d/scripts/build_flacon.py                # GLB + .blend
.venv/bin/python 3d/scripts/build_flacon.py --render palmeira --samples 256 --size 1600
.venv/bin/python 3d/scripts/ajuster.py --controle            # écarts silhouette / photos
.venv/bin/python 3d/scripts/comparer.py --argile             # planches photo | modèle
```

Ajouter un parfum : une ligne dans `parfums.py`, puis relancer
`labels.py`. La visionneuse le propose automatiquement.

## Visionneuse web

```sh
npx http-server maquette    # puis http://localhost:8080/parfum/#palmeira
```

`?fixe` coupe la rotation automatique. Three.js 0.170 est chargé depuis
jsDelivr.

Deux choix de rendu à connaître si vous intégrez le modèle ailleurs :

- **Jus double face, verre simple face.** Three.js ne montre un objet
  transmissif au travers d'un autre que par sa face arrière, et seulement
  s'il est double face : le jus l'est, le verre non, sinon ses parois
  intérieures masqueraient le jus. Le tube plongeur est opaque (translucide)
  pour rester visible.
- **Studio virtuel** (`studio()` dans index.html) : bandes lumineuses,
  plafonnier, réflecteur avant et drapeaux noirs, comme en photo produit.
  C'est lui qui dessine les reflets du verre et de l'or.
- **Tone mapping `NeutralToneMapping`** (PBR Neutral de Khronos), et le
  même dans les rendus Cycles : les couleurs restent fidèles aux photos,
  là où ACES ou AgX les délavent ou les virent au rose.

Il faut aussi un fond réel (`scene.background`) : sur un canvas
transparent, le verre n'a rien à réfracter et devient blanc.

## Limites connues

- Matières : réglées dans la visionneuse en comparant aux photos depuis la
  même caméra (`scripts/comparer_web.mjs`, planche `renders/comparaison-web.jpg`).
  Three.js n'applique qu'une épaisseur de verre pour tout le flacon : le
  socle massif est teinté artificiellement pour ne pas paraître dépoli.
- Gravure « LIBRERY Paris » sous le socle : pas encore modélisée.
- Format 30 ml : même flacon, à décliner en changeant les cotes.
- Dans le navigateur, la réfraction est une approximation (une seule
  couche de verre, pas de caustiques). Pour les visuels d'accueil, les
  rendus Cycles de `renders/` restent au-dessus.
