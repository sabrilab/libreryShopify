"""Flacon Librery 30 ml : même dessin que le 100 ml, mais pas la même forme.

Relevé sur les photos du site (tonka-love-1, vanilla-plum-1), en prenant le
capot comme étalon : il est identique sur les deux formats (36,5 mm de large,
rapport hauteur / largeur 0,75 sur les deux photos).

- verre 45,3 × 63,9 mm (rapport 0,71 contre 0,61 au 100 ml) : flacon trapu ;
- épaules courtes (8 mm), dessus large (35,4 mm) : le capot déborde à peine ;
- socle épais (16,8 mm sous le jus) avec des rainures d'angle proportionnellement
  plus grandes ;
- parois fines : le jus remplit presque toute la largeur ;
- étiquette réduite aux deux tiers, logo à 41 mm du pied.

    python 3d/scripts/build_flacon30.py [--sortie chemin.glb]
"""
import argparse
import math
import os
import sys

import bpy  # noqa: F401
from mathutils import Vector, Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geometrie as G  # noqa: E402
import build_flacon as B  # noqa: E402

P30 = {
    "A": 22.65, "B": 16.4, "C": 5.0, "H": 63.9, "EP": 8.0,
    "TA": 17.7, "TB": 13.0, "TC": 2.6, "PIED": 1.0,
    "G_HAUT": 22.0, "G_POINTE": 14.2, "G_BAS": 7.8, "G_PROF": 3.6,
    "CAV_MUR": 3.4, "CAV_Z0": 16.8, "CAV_HAUT": 3.0, "CAV_R": 2.2,
    "REMPLI": 0.93,
}
ETIQUETTE = {"z0": 19.6, "size": 32.2}


def cotes30():
    p = B.cotes()          # capot, virole : les cotes validées du 100 ml
    p.update(P30)
    return p


def vaporisateur30(p):
    z = p["H"] + p["VIR_H"] + 3.0
    col = G.cylinder("Col", 7.6, z, z + 2.2)
    G.soften_edges(col, 0.3, segments=2)
    act = G.cylinder("Poussoir", 6.3, z + 2.6, z + 13.0)
    G.soften_edges(act, 0.6, segments=3)
    buse = G.cylinder("buse", 0.55, -3, 3, 24)
    buse.matrix_world = Matrix.Translation((0, -6.3 * G.MM, (z + 9.5) * G.MM)) @ Matrix.Rotation(math.pi / 2, 4, "X")
    G.boolean(act, buse)
    tige = G.cylinder("Tige", 1.6, z + 1.5, z + 3.0, 32)
    cu = bpy.data.curves.new("TubePlongeur", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 0.7 * G.MM
    cu.bevel_resolution = 3
    sp = cu.splines.new("BEZIER")
    H = p["H"]
    pts = [(0, 0, H + 1), (0, 0, H * 0.66), (-4, -3, H * 0.42), (-p["A"] + p["CAV_MUR"] + 3, -4, p["CAV_Z0"] + 1.0)]
    sp.bezier_points.add(len(pts) - 1)
    for bp, q in zip(sp.bezier_points, pts):
        bp.co = Vector(q) * G.MM
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    tube = bpy.data.objects.new("TubePlongeur", cu)
    bpy.context.collection.objects.link(tube)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = tube
    tube.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return col, act, tige, bpy.context.view_layer.objects.active


def build30(handle):
    B.reset()
    p = cotes30()
    mats = B.make_materials(handle)
    glass = G.verre(p)
    juice = G.jus(p)
    ferrule = G.virole(p)
    collar, actuator, act_stem, tube = vaporisateur30(p)
    cap = G.capot(p)
    label = G.etiquette(p, **ETIQUETTE)
    for ob, m in ((glass, "Verre"), (juice, "Jus"), (ferrule, "Or"), (collar, "Or"),
                  (actuator, "Or"), (act_stem, "Plastique"), (tube, "Plastique"),
                  (cap, "Or"), (label, "Serigraphie")):
        B.assign(ob, mats[m])
        if ob is not label:
            B.smooth_by_angle(ob)
    root = bpy.data.objects.new("Flacon", None)
    bpy.context.collection.objects.link(root)
    for ob in (glass, juice, ferrule, collar, actuator, act_stem, tube, cap, label):
        ob.parent = root
    return p


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--sortie", default=os.path.join(B.WEB, "flacon-30ml.glb"))
    args = ap.parse_args(argv)
    p = build30("tonka-love")
    B.socle_separe(bpy.data.objects["Verre"], p)
    B.export_glb(args.sortie)
    print("export", args.sortie, os.path.getsize(args.sortie) // 1024, "Ko")
    print("verre", 2 * p["A"], 2 * p["B"], p["H"], "total", p["H"] + p["VIR_H"] + p["CH"])
