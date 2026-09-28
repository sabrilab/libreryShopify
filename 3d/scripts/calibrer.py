"""Calibre la couleur du jus de chaque parfum dans les rendus Cycles.

Pour chaque parfum : rendu de face (petit, rapide), mesure de la couleur
du jus sous l'étiquette, comparaison avec la couleur relevée sur la photo
détourée (parfums.py), puis correction canal par canal de l'épaisseur
optique du jus (en espace linéaire, la lumière transmise suit exp(−τ)).
Trois ou quatre passes suffisent. Résultat : calibration.json, lu par
rendu.py.

    python 3d/scripts/calibrer.py [handle ...]
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rendu as R  # noqa: E402
from parfums import PARFUMS  # noqa: E402

OUT = os.path.join(R.ROOT, "scripts", "calibration.json")
TMP = os.path.join(R.ROOT, "renders", "_calibration.png")


def mesure(handle, tau):
    R.scene(handle, tau)
    s = bpy.context.scene
    s.cycles.samples = 32
    cam = bpy.data.cameras.new("c")
    cam.lens = 100
    ob = bpy.data.objects.new("c", cam)
    s.collection.objects.link(ob)
    ob.location = (0, -0.5, 0.06)
    ob.rotation_euler = (Vector((0, 0, 0.06)) - ob.location).to_track_quat("-Z", "Y").to_euler()
    s.camera = ob
    s.render.resolution_x, s.render.resolution_y = 200, 250
    s.render.filepath = TMP
    bpy.ops.render.render(write_still=True)
    im = Image.open(TMP).convert("RGBA")
    fond = Image.new("RGBA", im.size, (236, 230, 221, 255))
    fond.alpha_composite(im)
    a = np.array(fond.convert("RGB")).astype(float) / 255
    # Jus sous l'étiquette, au-dessus du fond de la cavité (z ≈ 28 à 34 mm).
    return a[148:162, 84:116].reshape(-1, 3).mean(0)


def to_lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def main(handles):
    data = json.load(open(OUT)) if os.path.exists(OUT) else {}
    for h in handles:
        cible = to_lin(PARFUMS[h][2])
        tau = np.array(data.get(h, -np.log(np.maximum(cible, 1e-3)) * 1.2))
        gain = np.full(3, -0.8)          # d log(rendu) / d τ, réestimé à chaque passe
        prec = None
        for it in range(10):
            rendu = to_lin(mesure(h, tau.tolist()))
            log_r = np.log(np.maximum(rendu, 1e-4))
            ecart = log_r - np.log(np.maximum(cible, 1e-4))
            print(h, it, "rendu", (rendu ** (1 / 2.2) * 255).round(), "cible",
                  (cible ** (1 / 2.2) * 255).round(), flush=True)
            if np.abs(ecart).max() < 0.04:
                break
            # Méthode de la sécante, canal par canal : la réponse est très
            # non linéaire (tone mapping, parcours variable dans le jus).
            if prec is not None:
                dt = tau - prec[0]
                ok = np.abs(dt) > 1e-3
                g = np.where(ok, (log_r - prec[1]) / np.where(ok, dt, 1), gain)
                gain = np.where((g < -0.02) & ok, g, gain)
            prec = (tau.copy(), log_r)
            pas = np.clip(-ecart / gain, -1.5, 1.5)
            tau = np.clip(tau + pas, 0.0, 6.0)   # au-delà, plus d'effet (reflets de surface)
        data[h] = [round(float(t), 3) for t in tau]
        json.dump(data, open(OUT, "w"), indent=1)
    if os.path.exists(TMP):
        os.remove(TMP)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    main(argv or list(PARFUMS))
