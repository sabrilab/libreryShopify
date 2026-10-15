"""Séquence du chevet → site : images webp numérotées, manifeste, affiches.

    python publier.py            (prend ce qui est rendu dans rendus/ et développé dans seq/)
"""
import os as _os
RACINE = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
TRAVAIL = _os.environ.get('CHEVET_TRAVAIL', _os.path.join(RACINE, '3d', 'chevet', 'travail'))
import hashlib, json, os, shutil, sys
from PIL import Image

W = TRAVAIL
SITE = _os.path.join(RACINE, 'maquette')
JEUX = {'mobile': 'portrait', 'desktop': 'paysage'}
MARGE = 1.12
for tag, nom in JEUX.items():
    CAM = json.load(open(f'{W}/out/camera-{tag}.json'))
    dst = f'{SITE}/assets/3d/chevet/seq/{nom}'
    os.makedirs(dst, exist_ok=True)
    h = hashlib.sha1()
    n = len(CAM['frames']); presents = 0
    for i in range(n):
        s = f'{W}/seq/{tag}-{i:03d}.webp'
        if os.path.exists(s):
            shutil.copyfile(s, f'{dst}/{i:03d}.webp'); h.update(open(s, 'rb').read()); presents += 1
    M = {'n': n, 'cw': CAM['cw'], 'ch': CAM['ch'], 'marge': MARGE, 'cv': CAM['cv'], 'bois': CAM['bois'], 'cle': CAM['cle'],
         'version': h.hexdigest()[:8]}
    json.dump(M, open(f'{dst}/manifest.json', 'w'), separators=(',', ':'))
    # l'affiche : la première image, recadrée sur le canevas de référence (sans la marge)
    s = f'{W}/seq/{tag}-000.webp'
    if os.path.exists(s):
        im = Image.open(s); w, hh = im.size; cw, ch = w / MARGE, hh / MARGE
        im = im.crop((round((w - cw) / 2), round((hh - ch) / 2), round((w + cw) / 2), round((hh + ch) / 2)))
        if tag == 'mobile': im = im.resize((600, round(600 * im.height / im.width)), Image.LANCZOS); im.save(f'{SITE}/assets/img/catalogue/chevet-poster-m.webp', quality=82, method=6)
        else: im.save(f'{SITE}/assets/img/catalogue/chevet-poster.webp', quality=82, method=6)
    print(nom, presents, '/', n, M['version'])
