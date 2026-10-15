"""Développement des rendus du chevet : comme la finition de chevet-photo.js (tone mapping Neutral, pied de courbe,
virage des noirs, vignetage du sujet seul), puis posé sur le papier du site (#f8f5ef).

    python post.py desktop 0-160 --entree rendus --sortie seq [--qualite 80] [--largeur 1600]
"""
import os as _os
RACINE = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
TRAVAIL = _os.environ.get('CHEVET_TRAVAIL', _os.path.join(RACINE, '3d', 'chevet', 'travail'))
import argparse, json, os, sys
import numpy as np, OpenEXR
from PIL import Image

W = TRAVAIL
ap = argparse.ArgumentParser()
ap.add_argument('tag'); ap.add_argument('images')
ap.add_argument('--entree', default=W + '/rendus'); ap.add_argument('--sortie', default=W + '/seq')
ap.add_argument('--qualite', type=int, default=82); ap.add_argument('--largeur', type=int, default=0)
ap.add_argument('--jpg', action='store_true')
A = ap.parse_args()
CAM = json.load(open(f'{W}/out/camera-{A.tag}.json'))
PAPIER = np.array([0xf8, 0xf5, 0xef], np.float32) / 255
lisse = lambda t: t * t * (3 - 2 * t)
clamp = lambda v, a=0., b=1.: min(b, max(a, v))

def lire(p):
    with OpenEXR.File(p, separate_channels=True) as f:
        ch = f.channels(); g = lambda c: ch[f'ViewLayer.Combined.{c}'].pixels.astype(np.float32)
        return np.dstack([g('R'), g('G'), g('B')]), g('A')

def neutral(c):
    x = c.min(axis=2, keepdims=True); off = np.where(x < .08, x - 6.25 * x * x, .04); c = c - off
    peak = c.max(axis=2, keepdims=True); start = .76; d = 1 - start
    newp = 1 - d * d / (peak + d - start); comp = peak >= start
    cc = np.where(comp, c * newp / np.maximum(peak, 1e-6), c)
    g = 1 - 1 / (.15 * (peak - newp) + 1)
    return np.where(comp, cc * (1 - g) + newp * g, cc)

def srgb(x):
    x = np.clip(x, 0, 1); return np.where(x <= .0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - .055)

def developper(i):
    f = CAM['frames'][i]; u = f['u']
    C, a = lire(f'{A.entree}/{A.tag}-{i:03d}.exr'); a0 = a
    # l'ombre portée sur le papier s'efface (u ,45 → ,8), comme dans chevet3d.js : l'ombre seule (rendu --ombre, à
    # basse définition : elle est douce) est retirée de l'alpha — sujet par-dessus l'ombre : A = As + S (1 − As)
    om = f'{A.entree}/{A.tag}-{i:03d}-ombre.exr'
    k = lisse(clamp((u - .45) / .35)) if os.path.exists(om) else 0
    if k > 0:
        _, S = lire(om)
        if S.shape != a.shape: S = np.asarray(Image.fromarray(S).resize((a.shape[1], a.shape[0]), Image.BILINEAR))
        S = np.clip(S, 0, .98)
        As = np.clip((a - S) / (1 - S), 0, 1)
        As = np.where(As < .04, As * As / .04, As)  # le bruit du rendu entre les deux passes ne laisse pas de voile
        a = As + S * (1 - k) * (1 - As)
    fin = lisse(clamp((u - .5) / .3))
    expo = .95 + .05 * fin; pied = .07 * (1 - fin); virage = .55 * (1 - fin); vign = .2 + (.12 - .2) * fin
    ac = np.clip(a, 0, 1)[..., None]
    lin = np.maximum(C, 0) / np.maximum(np.clip(a0, 0, 1)[..., None], 1e-3) * expo
    t = neutral(lin)
    L = np.maximum((t * [.2126, .7152, .0722]).sum(2, keepdims=True), 1e-5)
    t = t * np.power(L, pied)
    s = 1 - np.clip((L - .002) / (.05 - .002), 0, 1); s = s * s * (3 - 2 * s)
    t = t * (1 - virage * s) + (L * np.array([1.08, 1, .9])) * virage * s
    c = srgb(t)
    # vignetage du sujet, centré sur l'image (le cadre rendu est élargi autour du canevas : centre identique)
    h, w = a.shape; asp = w / h
    yy, xx = np.mgrid[0:h, 0:w]; dx = ((xx + .5) / w - .5) * 2 * asp; dy = ((yy + .5) / h - .5) * 2
    v = np.sqrt(dx * dx + dy * dy) / np.sqrt(asp * asp + 1) * 1.12
    sv = np.clip((v - .3) / .75, 0, 1); sv = sv * sv * (3 - 2 * sv)
    c = c * (1 - vign * sv)[..., None]
    out = PAPIER * (1 - ac) + c * ac
    im = Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8))
    if A.largeur and im.width != A.largeur: im = im.resize((A.largeur, round(im.height * A.largeur / im.width)), Image.LANCZOS)
    os.makedirs(A.sortie, exist_ok=True)
    if A.jpg: im.save(f'{A.sortie}/{A.tag}-{i:03d}.jpg', quality=92)
    else: im.save(f'{A.sortie}/{A.tag}-{i:03d}.webp', quality=A.qualite, method=6)

if '-' in A.images: a0, z = map(int, A.images.split('-')); liste = range(a0, z + 1)
else: liste = [int(x) for x in A.images.split(',')]
for i in liste:
    if os.path.exists(f'{A.entree}/{A.tag}-{i:03d}.exr'): developper(i); print('ok', i, flush=True)
