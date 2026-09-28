"""Ajuste les cotes du flacon sur les photos détourées.

Pour chaque jeu de cotes, Blender construit le flacon ; sa silhouette est
projetée depuis une caméra (angle, distance, focale) elle-même ajustée
pour chaque photo, puis comparée au masque alpha du détouré (IoU).
L'optimiseur cherche les cotes qui maximisent l'accord sur toutes les
photos à la fois.

    python 3d/scripts/ajuster.py              # écrit ajustement.json
    python 3d/scripts/ajuster.py --controle   # superpositions de contrôle
"""
import argparse
import json
import math
import os
import sys

import bpy  # noqa: F401  (doit précéder bmesh)
import numpy as np
from PIL import Image, ImageDraw
from scipy.optimize import minimize

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geometrie as G  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DETOURES = os.path.join(ROOT, "..", "contenu-actuel", "images", "detoures")
OUT = os.path.join(ROOT, "scripts", "ajustement.json")
HAUTEUR = 420  # hauteur de travail des masques, en pixels

# Photos utilisées et point de départ de leur caméra (lacet, tangage en degrés).
PHOTOS = {
    "ambert-sunset": (0.0, 2.0),      # rendu de face
    "tonka-love": (18.0, 3.0),        # photo de trois-quarts
    "vanilla-plum": (-6.0, 8.0),      # légèrement plongeante
    "magnetic-flowers": (5.0, 4.0),
}

# Cotes ajustées : (nom, borne basse, borne haute). A (demi-largeur) reste
# fixe : c'est l'échelle, la focale de chaque caméra absorbe le reste.
RAINURES = [
    ("G_HAUT", 20.0, 36.0), ("G_POINTE", 12.0, 24.0), ("G_BAS", 2.0, 13.0), ("G_PROF", 1.0, 9.0),
]
PROPORTIONS = [
    ("H", 90.0, 110.0), ("EP", 7.0, 15.0), ("TA", 15.0, 23.0), ("TC", 0.5, 6.0),
    ("CA", 16.0, 22.0), ("CH", 22.0, 31.0), ("VIR_R", 11.0, 15.0), ("VIR_H", 1.5, 5.0),
    ("B", 15.0, 26.0), ("TB", 10.0, 20.0), ("CB", 12.0, 19.45),
]
GROUPE_FORMES = LIBRES = [
    ("B", 15.0, 26.0), ("C", 4.0, 11.0), ("TB", 10.0, 20.0),
    ("CB", 12.0, 19.45), ("CC", 2.0, 7.0),
    ("G_HAUT", 20.0, 36.0), ("G_POINTE", 12.0, 24.0), ("G_BAS", 3.0, 13.0), ("G_PROF", 0.5, 7.0),
    ("CG_HAUT", 7.0, 14.0), ("CG_POINTE", 3.0, 9.0), ("CG_BAS", 0.5, 5.0), ("CG_PROF", 0.5, 4.5),
]


def load_mask(handle):
    im = Image.open(os.path.join(DETOURES, handle + ".webp")).convert("RGBA")
    w = round(im.width * HAUTEUR / im.height)
    a = np.array(im.getchannel("A").resize((w, HAUTEUR), Image.BILINEAR)) > 128
    return a


def build_triangles(p):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    obs = [G.verre(p, detail=False), G.virole(p, detail=False), G.capot(p, detail=False)]
    tris = []
    for ob in obs:
        me = ob.data
        me.calc_loop_triangles()
        co = np.array([v.co[:] for v in me.vertices]) / G.MM
        idx = np.array([t.vertices[:] for t in me.loop_triangles])
        tris.append(co[idx])
    return np.concatenate(tris)


def camera_basis(yaw, pitch, dist):
    y, pch = math.radians(yaw), math.radians(pitch)
    target = np.array([0.0, 0.0, 65.0])
    pos = target + dist * np.array([math.sin(y) * math.cos(pch), -math.cos(y) * math.cos(pch), math.sin(pch)])
    fwd = (target - pos) / np.linalg.norm(target - pos)
    right = np.cross(fwd, [0, 0, 1.0]); right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    return pos, right, up, fwd


def render_mask(tris, cam, shape):
    yaw, pitch, dist, f, cx, cy = cam
    pos, right, up, fwd = camera_basis(yaw, pitch, dist)
    d = tris.reshape(-1, 3) - pos
    zc = d @ fwd
    u = cx + f * (d @ right) / zc
    v = cy - f * (d @ up) / zc
    uv = np.stack([u, v], 1).reshape(-1, 3, 2)
    img = Image.new("1", (shape[1], shape[0]), 0)
    draw = ImageDraw.Draw(img)
    for t in uv:
        draw.polygon([tuple(q) for q in t], fill=1)
    return np.array(img, dtype=bool)


def iou(a, b):
    return (a & b).sum() / max(1, (a | b).sum())


def initial_camera(mask, yaw, pitch):
    rows = np.where(mask.any(1))[0]
    cols = np.where(mask.any(0))[0]
    h = rows[-1] - rows[0]
    dist = 600.0
    f = h / 130.0 * dist
    return [yaw, pitch, dist, f, (cols[0] + cols[-1]) / 2, (rows[0] + rows[-1]) / 2]


def fit_camera(tris, mask, cam):
    def loss(x):
        return 1 - iou(render_mask(tris, x, mask.shape), mask)
    scale = np.array([4, 3, 150, 40, 4, 4.0])
    res = minimize(lambda z: loss(cam + z * scale), np.zeros(6), method="Nelder-Mead",
                   options={"xatol": 0.02, "fatol": 1e-4, "maxfev": 160, "initial_simplex":
                            np.vstack([np.zeros(6), np.eye(6) * 0.5])})
    return list(cam + res.x * scale), 1 - res.fun


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--controle", action="store_true")
    ap.add_argument("--iter", type=int, default=260)
    ap.add_argument("--proportions", action="store_true", help="ajuste les proportions")
    ap.add_argument("--rainures", action="store_true", help="ajuste les rainures du socle")
    ap.add_argument("--depart", default="", help="cotes de départ, ex. G_PROF=5")
    args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])

    global LIBRES
    if args.proportions:
        LIBRES = PROPORTIONS
    if args.rainures:
        LIBRES = RAINURES
    masks = {h: load_mask(h) for h in PHOTOS}
    state = {"cams": {h: None for h in PHOTOS}, "best": (-1, None)}
    p0 = dict(G.P)
    if os.path.exists(OUT):
        saved = json.load(open(OUT))
        p0.update(saved["cotes"])
        state["cams"].update(saved.get("cameras", {}))
    for kv in filter(None, args.depart.split(",")):
        k, v = kv.split("=")
        p0[k] = float(v)

    def evaluate(p, verbose=False):
        tris = build_triangles(p)
        scores = {}
        for h, m in masks.items():
            cam = state["cams"][h] or initial_camera(m, *PHOTOS[h])
            cam, s = fit_camera(tris, m, cam)
            state["cams"][h] = cam
            scores[h] = s
        total = sum(scores.values()) / len(scores)
        if total > state["best"][0]:
            keep = {k: p[k] for k in set(k for k, *_ in LIBRES + PROPORTIONS + GROUPE_FORMES + RAINURES)}
            state["best"] = (total, keep)
            json.dump({"cotes": state["best"][1], "cameras": state["cams"], "iou": scores},
                      open(OUT, "w"), indent=1)
        if verbose:
            print(" ".join(f"{h}={s:.4f}" for h, s in scores.items()), f"moy={total:.4f}", flush=True)
        return total, tris

    if args.controle:
        total, tris = evaluate(p0, verbose=True)
        for h, m in masks.items():
            r = render_mask(tris, state["cams"][h], m.shape)
            over = np.zeros(m.shape + (3,), np.uint8) + 255
            over[m & ~r] = (220, 40, 40)      # photo seulement : rouge
            over[r & ~m] = (40, 90, 230)      # modèle seulement : bleu
            over[m & r] = (200, 200, 200)
            Image.fromarray(over).save(os.path.join(ROOT, "scripts", f"controle-{h}.png"))
        return

    lo = np.array([b[1] for b in LIBRES]); hi = np.array([b[2] for b in LIBRES])
    x0 = np.array([p0[k] for k, *_ in LIBRES])
    n = [0]

    def objective(x):
        x = np.clip(x, lo, hi)
        p = dict(p0); p.update({k: float(v) for (k, *_), v in zip(LIBRES, x)})
        # Rainures : l'ordre haut > pointe > bas doit tenir.
        if p["TB"] > p["B"] - 3 or p["CB"] > p["CA"] or p["TA"] > p["A"] - 3:
            return 1.0
        if not (p["G_HAUT"] > p["G_POINTE"] + 1 > p["G_BAS"] + 2 and
                p["CG_HAUT"] > p["CG_POINTE"] + 0.5 > p["CG_BAS"] + 1 and p["TB"] < p["B"] - 3):
            return 1.0
        n[0] += 1
        total, _ = evaluate(p, verbose=(n[0] % 10 == 0))
        return 1 - total

    step = (hi - lo) * 0.12
    simplex = np.vstack([x0] + [x0 + np.eye(len(x0))[i] * step[i] for i in range(len(x0))])
    minimize(objective, x0, method="Nelder-Mead",
             options={"maxfev": args.iter, "initial_simplex": simplex, "xatol": 0.05, "fatol": 1e-5})
    print("meilleur", state["best"])


if __name__ == "__main__":
    main()
