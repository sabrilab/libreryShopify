# Génération Seedance 2.5 (Higgsfield)

`magnetic-flowers-seedance.mp4` : Seedance 2.5, mode « omni_reference », 720p, 9:16, 15 s, sans son.

Références données au modèle :
- vidéo : `3d/videos/magnetic-flowers.mp4` (animatique Blender) — mouvement, timing, cadrages ;
- image : `reference-photo-magnetic-flowers.jpg` (vraie photo du flacon sur fond blanc) — apparence du produit.

Prompt complet : `prompt-magnetic-flowers.txt`. Coût : 105 crédits Higgsfield.

## Essais v3 → v6 (refusés par le filtre, crédits remboursés)

Références : photo du flacon + image de look Midjourney (`reference-look-magnetic-flowers.jpg`)
+ animatique, d'abord en gris (`3d/videos/magnetic-flowers-gris.mp4`), puis en traits
(`3d/videos/magnetic-flowers-traits.mp4`, contours seuls via ffmpeg edgedetect).

| Essai | Vidéo | Image look | Texte | Son | Résultat |
|---|---|---|---|---|---|
| v3 | grise | oui | v3 | oui | refusé (nsfw) |
| v4 | grise | oui | v4 (mots neutres) | oui | refusé |
| v5 | traits | oui | v5 | oui | refusé |
| v6 | traits | non | v6 | oui | refusé |

Le seul essai accepté (v1) était sans son, alors qu'il employait des mots plus risqués :
le paramètre `generate_audio` est le suspect principal. Prochain essai : v5 sans son
(le son s'ajoute ensuite). Bloqué pour aujourd'hui par la limite quotidienne de
Higgsfield (compte en période de grâce).
