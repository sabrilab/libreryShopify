"""Rend le flacon depuis la caméra ajustée de chaque photo et monte
photo | rendu côte à côte (3d/renders/comparaison-<photo>.jpg).

    python 3d/scripts/comparer.py            # rendu matière (verre, or)
    python 3d/scripts/comparer.py --argile   # rendu argile, pour la forme seule
"""
import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Vector
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_flacon as BF  # noqa: E402
from ajuster import DETOURES, HAUTEUR, camera_basis  # noqa: E402

ROOT = BF.ROOT


def place_camera(cam, w, h, scale):
    yaw, pitch, dist, f, cx, cy = cam
    pos, *_ = camera_basis(yaw, pitch, dist)
    target = Vector((0, 0, 65.0))
    data = bpy.data.cameras.new("cam")
    data.sensor_fit = "HORIZONTAL"
    data.sensor_width = 36.0
    data.lens = f * 36.0 / w
    # Avec sensor_fit horizontal, le décalage s'exprime en largeurs d'image.
    data.shift_x = (w / 2 - cx) / w
    data.shift_y = (cy - h / 2) / w
    data.clip_start = 0.01
    ob = bpy.data.objects.new("cam", data)
    bpy.context.collection.objects.link(ob)
    ob.location = Vector(pos) * BF.MM
    ob.rotation_euler = (target * BF.MM - ob.location).to_track_quat("-Z", "Y").to_euler()
    s = bpy.context.scene
    s.camera = ob
    s.render.resolution_x = round(w * scale)
    s.render.resolution_y = round(h * scale)


def clay():
    m = bpy.data.materials.new("argile")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.36, 0.34, 0.32, 1)
    bsdf.inputs["Roughness"].default_value = 0.45
    bpy.context.view_layer.material_override = m
    # Éclairage neutre : ciel uniforme + un soleil rasant pour lire les facettes.
    for o in list(bpy.data.objects):
        if o.type == "LIGHT":
            bpy.data.objects.remove(o)
    w = bpy.context.scene.world
    w.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.7
    sun = bpy.data.objects.new("soleil", bpy.data.lights.new("soleil", "SUN"))
    sun.data.energy = 2.5
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    bpy.context.collection.objects.link(sun)
    for n in ("Etiquette", "Jus", "TubePlongeur"):
        o = bpy.data.objects.get(n)
        if o:
            o.hide_render = True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--argile", action="store_true")
    ap.add_argument("--echelle", type=float, default=2.0)
    ap.add_argument("--samples", type=int, default=96)
    ap.add_argument("--photos", default="")
    args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])

    fit = json.load(open(BF.AJUSTEMENT))
    photos = args.photos.split(",") if args.photos else list(fit["cameras"])
    for handle in photos:
        BF.build(handle)
        BF.studio(handle)
        s = bpy.context.scene
        s.cycles.samples = args.samples
        cyc = bpy.data.objects.get("Cyclo")
        if cyc:
            cyc.hide_render = True
        if args.argile:
            clay()
        photo = Image.open(os.path.join(DETOURES, handle + ".webp")).convert("RGBA")
        w = round(photo.width * HAUTEUR / photo.height)
        place_camera(fit["cameras"][handle], w, HAUTEUR, args.echelle)
        s.render.film_transparent = True
        out = os.path.join(ROOT, "renders", f"_tmp-{handle}.png")
        s.render.filepath = out
        bpy.ops.render.render(write_still=True)

        r = Image.open(out).convert("RGBA")
        ph = photo.resize(r.size, Image.LANCZOS)
        bg = (236, 230, 221, 255)
        board = Image.new("RGBA", (r.width * 2 + 20, r.height), bg)
        for i, im in enumerate((ph, r)):
            tile = Image.new("RGBA", r.size, bg)
            tile.alpha_composite(im)
            board.paste(tile, (i * (r.width + 20), 0))
        suffix = "-argile" if args.argile else ""
        board.convert("RGB").save(os.path.join(ROOT, "renders", f"comparaison-{handle}{suffix}.jpg"), quality=90)
        os.remove(out)
        print("comparaison", handle)


if __name__ == "__main__":
    main()
