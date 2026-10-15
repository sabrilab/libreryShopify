#!/bin/bash
# rendu de la séquence en haute définition : iPhone ×3 (écrans Retina 3x), ordinateur ×2 (Retina) ;
# tout l'iPhone d'abord, du grossier au fin (pas de 8, 4, 2, 1), puis les passes d'ombre (u > ,45 : l'ombre au sol
# s'efface en fin de mouvement), le développement et la publication dans le site
cd "$(dirname "$0")"
PY=${PY:-python3}
niveau() { python3 -c "
import sys; p=int(sys.argv[1]); s=[i for i in range(0,121) if i%p==0 and (p==8 or i%(2*p)!=0)]; print(','.join(map(str,s)))" $1; }
for tag in mobile desktop; do
  [ $tag = mobile ] && E=3 || E=2
  for p in 8 4 2 1; do
    $PY chevet_scene.py $tag $(niveau $p) --samples 24 --echelle $E 2>&1 | grep --line-buffered "^image"
  done
  $PY chevet_scene.py $tag 54-120 --ombre --samples 8 --echelle $E 2>&1 | grep --line-buffered "^image"
  $PY post.py $tag 0-120
done
$PY publier.py
echo FINI
