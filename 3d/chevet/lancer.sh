#!/bin/bash
# rendu de la séquence, du grossier au fin (pas de 8, 4, 2, 1), iPhone puis ordinateur à chaque niveau,
# puis les passes d'ombre (u > ,45 : l'ombre au sol s'efface en fin de mouvement) et le développement
cd "$(dirname "$0")"
PY=${PY:-python3}
niveau() { python3 -c "
import sys; p=int(sys.argv[1]); s=[i for i in range(0,121) if i%p==0 and (p==8 or i%(2*p)!=0)]; print(','.join(map(str,s)))" $1; }
for p in 8 4 2 1; do
  L=$(niveau $p)
  $PY chevet_scene.py mobile $L --samples 48 --echelle 1.8 2>&1 | grep --line-buffered "^image"
  $PY chevet_scene.py desktop $L --samples 48 --echelle 1 2>&1 | grep --line-buffered "^image"
done
$PY chevet_scene.py mobile 54-120 --ombre --samples 12 --echelle 1.8 2>&1 | grep --line-buffered "^image"
$PY chevet_scene.py desktop 54-120 --ombre --samples 12 --echelle 1 2>&1 | grep --line-buffered "^image"
$PY post.py mobile 0-120 && $PY post.py desktop 0-120 && $PY publier.py
echo FINI
