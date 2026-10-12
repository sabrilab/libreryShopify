"""Packshot produit sur fond blanc studio à partir d'une photo de téléphone, sans retoucher les pixels du produit.

python3 packshot.py <photo.jpg> <nom> [--largeur 0.78] [--rot 0] [--exclure x0,y0,x1,y1 ...] [--sortie DOSSIER]

1. masque Vision (outil ./masque) ; on garde le plus grand objet (étiquettes et objets autour exclus) ;
2. balance des blancs : le fond blanc de la photo (hors produit) devient neutre ; exposition douce, hautes lumières protégées ;
3. composition 4:5 au rendu des packshots des parfums : mur 239, sol 245, ombre de contact douce ;
4. sorties <nom>.webp (1200 × 1500) et <nom>-m.webp (720 × 900), plus <nom>-controle.jpg (avant / après)."""
import argparse, pathlib, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter

ICI = pathlib.Path(__file__).parent
ap = argparse.ArgumentParser()
ap.add_argument('photo'); ap.add_argument('nom')
ap.add_argument('--largeur', type=float, default=.78, help='largeur du produit / largeur du cadre')
ap.add_argument('--hauteur-max', type=float, default=.70, help='hauteur max du produit / hauteur du cadre')
ap.add_argument('--rot', type=float, default=0, help='rotation (degrés) pour remettre le produit d’aplomb')
ap.add_argument('--exclure', nargs='*', default=[], help='zones à retirer du masque, en px de la photo : x0,y0,x1,y1')
ap.add_argument('--expo', type=float, default=None, help='gain d’exposition imposé (sinon calculé)')
ap.add_argument('--sortie', default=str(ICI.parent / 'packshots'))
a = ap.parse_args()
out = pathlib.Path(a.sortie); out.mkdir(parents=True, exist_ok=True)

photo = Image.open(a.photo).convert('RGB')
with tempfile.TemporaryDirectory() as t:
    subprocess.run([str(ICI / 'masque'), a.photo, f'{t}/m'], check=True, capture_output=True)
    masks = [np.asarray(Image.open(p).convert('L')) for p in sorted(pathlib.Path(t).glob('m-[0-9]*.png'))]
m = max(masks, key=lambda x: (x > 128).sum()).astype(np.float32) / 255
for z in a.exclure:
    x0, y0, x1, y1 = map(int, z.split(',')); m[y0:y1, x0:x1] = 0

img = np.asarray(photo).astype(np.float32)
# --- balance des blancs sur le fond : pixels clairs, hors produit, près du produit (même lumière)
ys, xs = np.nonzero(m > .5)
y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
pad = int(.25 * max(y1 - y0, x1 - x0))
zone = np.zeros_like(m, dtype=bool); zone[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = True
dil = np.asarray(Image.fromarray((m > .05).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(41))) > 0
lum = img.mean(2)
fond = zone & ~dil & (lum > np.percentile(lum[zone & ~dil], 40))
ref = np.median(img[fond], axis=0)                      # couleur du fond blanc dans la photo
gain_c = ref.mean() / ref                                # neutralise la dominante
expo = a.expo or float(np.clip(232 / ref.mean(), 1.0, 1.25))   # le fond blanc vers ~232 : studio, sans brûler
lin = img * gain_c * expo
corr = np.where(lin > 200, 200 + (lin - 200) * (55 / np.maximum(lin.max() - 200, 55)), lin)   # protège l'or et les reflets
corr = np.clip(corr, 0, 255)

prod = Image.fromarray(corr.astype(np.uint8)); alpha = Image.fromarray((m * 255).astype(np.uint8))
if a.rot:
    prod = prod.rotate(a.rot, resample=Image.BICUBIC, expand=True, fillcolor=(255, 255, 255))
    alpha = alpha.rotate(a.rot, resample=Image.BICUBIC, expand=True)
bb = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
prod, alpha = prod.crop(bb), alpha.crop(bb)

# --- composition 4:5, 2× la taille finale
W, H = 2400, 3000
s = min(a.largeur * W / prod.width, a.hauteur_max * H / prod.height)
pw, ph = round(prod.width * s), round(prod.height * s)
prod = prod.resize((pw, ph), Image.LANCZOS); alpha = alpha.resize((pw, ph), Image.LANCZOS)
yy = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
horizon = .66
t = np.clip((yy - (horizon - .06)) / .12, 0, 1); t = t * t * (3 - 2 * t)
bg = 239 + 6.5 * t                                        # mur 239 → sol 245,5 (packshots des parfums)
vx = np.linspace(-1, 1, W)[None, :]; bg = bg - 2.0 * vx ** 2  # vignettage très léger
canvas = Image.fromarray(np.dstack([bg] * 3).astype(np.uint8))
px = (W - pw) // 2; py = round(horizon * H + .10 * H - ph)   # le produit repose un peu sous l'horizon
py = min(py, H - ph - round(.07 * H))
# ombres : contact (serrée) + portée (large, très légère), dérivées de la base du masque
A = np.asarray(alpha).astype(np.float32) / 255
base = np.zeros_like(A); rows = np.nonzero(A.max(1) > .5)[0]
foot = rows.max() - int(.10 * ph)
base[foot:, :] = A[foot:, :]
def ombre(mask, flou, dy, sy, op):
    lay = Image.new('L', (W, H), 0)
    sh = Image.fromarray((mask * 255).astype(np.uint8)).resize((pw, max(1, round(ph * sy))))
    lay.paste(sh, (px, py + ph - sh.height + dy))
    return np.asarray(lay.filter(ImageFilter.GaussianBlur(flou))).astype(np.float32) / 255 * op
sh = ombre(base, 18, 10, 1, .42) + ombre(A, 70, 40, .35, .16)
cv = np.asarray(canvas).astype(np.float32) * (1 - np.clip(sh, 0, .6)[..., None])
canvas = Image.fromarray(cv.astype(np.uint8))
canvas.paste(prod, (px, py), alpha)

final = canvas.resize((1200, 1500), Image.LANCZOS)
final.save(out / f'{a.nom}.webp', quality=88, method=6)
final.resize((720, 900), Image.LANCZOS).save(out / f'{a.nom}-m.webp', quality=86, method=6)
# planche de contrôle : source recadrée | packshot
src = photo.crop((max(0, x0 - pad), max(0, y0 - pad), min(photo.width, x1 + pad), min(photo.height, y1 + pad)))
src.thumbnail((900, 1125)); fin = final.copy(); fin.thumbnail((900, 1125))
ctl = Image.new('RGB', (1830, 1125), 'white'); ctl.paste(src, (0, 0)); ctl.paste(fin, (930, 0))
ctl.save(out / f'{a.nom}-controle.jpg', quality=85)
print(a.nom, 'fond source', ref.round(1).tolist(), 'gain', gain_c.round(3).tolist(), 'expo', round(expo, 3), 'objets', len(masks))
