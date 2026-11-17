"""360° Cycles du flacon 30 ml : même studio et mêmes matières que rendu.py
(100 ml), avec la géométrie de build_flacon30.py.

    python 3d/scripts/tour30.py tonka-love --vues 36 --samples 128 --sortie DOSSIER
"""
import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_flacon as BF  # noqa: E402
import build_flacon30 as B30  # noqa: E402
import rendu as R  # noqa: E402

# rendu.py construit le flacon par BF.build / BF.cotes : on lui passe le 30 ml.
_cotes100 = BF.cotes
B30.B = type("B", (), {k: getattr(BF, k) for k in dir(BF) if not k.startswith("__")})
B30.B.cotes = staticmethod(_cotes100)
BF.build = B30.build30
BF.cotes = B30.cotes30


def tour30(handle, vues, samples, largeur, hauteur, sortie, debut=0, seule=None):
    from PIL import Image
    R.scene(handle)
    s = bpy.context.scene
    s.cycles.samples = samples
    s.render.resolution_x, s.render.resolution_y = largeur, hauteur
    root = bpy.data.objects["Flacon"]
    cam = bpy.data.cameras.new("tour")
    cam.lens = 105
    cam.sensor_width = 36
    ob = bpy.data.objects.new("tour", cam)
    bpy.context.collection.objects.link(ob)
    # même cadrage relatif que le 100 ml (hauteur 95,6 mm contre 135,2)
    k = 95.6 / 135.2
    ob.location = (0.0, -0.52 * k, 0.115 * k)
    ob.rotation_euler = (Vector((0, 0, 0.066 * k)) - ob.location).to_track_quat("-Z", "Y").to_euler()
    s.camera = ob
    os.makedirs(sortie, exist_ok=True)
    tmp = os.path.join(sortie, "_tmp.png")
    for i in ([seule] if seule is not None else range(debut, vues)):
        root.rotation_euler = (0, 0, 2 * math.pi * i / vues)
        s.render.filepath = tmp
        bpy.ops.render.render(write_still=True)
        Image.open(tmp).convert("RGB").save(os.path.join(sortie, f"{i:02d}.webp"), quality=88, method=6)
        print("vue", handle, i, flush=True)
    os.remove(tmp)
    with open(os.path.join(sortie, "info.json"), "w") as f:
        json.dump({"vues": vues, "largeur": largeur, "hauteur": hauteur}, f)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("handle")
    ap.add_argument("--vues", type=int, default=36)
    ap.add_argument("--debut", type=int, default=0)
    ap.add_argument("--seule", type=int)
    ap.add_argument("--samples", type=int, default=128)
    ap.add_argument("--taille", default="700x875")
    ap.add_argument("--sortie", required=True)
    a = ap.parse_args(argv)
    w, h = map(int, a.taille.split("x"))
    tour30(a.handle, a.vues, a.samples, w, h, a.sortie, a.debut, a.seule)
