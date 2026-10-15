#!/bin/bash
# Finalise la vidéo et le PDF récap une fois la séquence iPhone HD du chevet rangée dans le dossier partagé.
set -e
cd "$(dirname "$0")"
SRC=/mnt/project-files/chevet-blender/hd/iphone
mkdir -p public/recap/chevet/full
python3 -I - "$SRC" public/recap/chevet/full <<'PY'
import sys, pathlib
from PIL import Image
src, dst = map(pathlib.Path, sys.argv[1:])
for i, f in enumerate(sorted(src.glob('*.jpg'))):
    im = Image.open(f).convert('RGB'); im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
    im.save(dst / f'{i:03d}.jpg', quality=90)
PY
node gen-recap-data.js
npx remotion render Recap out/recap.mp4 --log=error
(cd ../retours/recap-15-octobre && python3 build.py && node render.cjs)
cp out/recap.mp4 /mnt/project-files/video-recap/LIBRERY-depuis-le-12-octobre.mp4
cp ../retours/recap-15-octobre/LIBRERY-depuis-le-12-octobre.pdf /mnt/project-files/video-recap/
echo FINI
