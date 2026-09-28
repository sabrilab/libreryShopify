"""Construit le flacon Librery 100 ml dans Blender, l'exporte en GLB pour
Three.js et, en option, en fait des rendus Cycles.

La géométrie est dans geometrie.py ; ses cotes sont ajustées sur les photos
par ajuster.py (résultat dans ajustement.json, relu ici).

    python 3d/scripts/build_flacon.py                      # GLB + .blend
    python 3d/scripts/build_flacon.py --render tonka-love  # + rendus Cycles

Nécessite le module Blender pour Python (`pip install bpy`, Python 3.11).
"""
import argparse
import json
import math
import os
import struct
import sys

import bpy  # doit précéder bmesh
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geometrie as G  # noqa: E402
from parfums import PARFUMS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MM = G.MM
AJUSTEMENT = os.path.join(ROOT, "scripts", "ajustement.json")
WEB = os.path.join(ROOT, "..", "maquette", "parfum")  # page /parfum du site Vercel


def cotes():
    p = dict(G.P)
    if os.path.exists(AJUSTEMENT):
        with open(AJUSTEMENT) as f:
            p.update(json.load(f)["cotes"])
    return p


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.unit_settings.system = "METRIC"
    s.unit_settings.length_unit = "MILLIMETERS"


def mesh_object(name, bm):
    return G.mesh_object(name, bm)


def smooth_by_angle(ob, degrees=30):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(degrees), keep_sharp_edges=True)


# --------------------------------------------------------------- matériaux
def srgb_to_linear(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def principled(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat, mat.node_tree.nodes["Principled BSDF"]


def make_materials(handle):
    _lines, glass_tint, juice = PARFUMS[handle]
    mats = {}

    m, p = principled("Verre")
    p.inputs["Base Color"].default_value = (*srgb_to_linear(glass_tint), 1)
    p.inputs["Roughness"].default_value = 0.0
    p.inputs["IOR"].default_value = 1.5
    p.inputs["Transmission Weight"].default_value = 1.0
    mats["Verre"] = m
    if glass_tint != (1.0, 1.0, 1.0):
        add_absorption(m, glass_tint, 12)

    m, p = principled("Jus")
    p.inputs["Base Color"].default_value = (*srgb_to_linear(juice), 1)
    p.inputs["Roughness"].default_value = 0.0
    p.inputs["IOR"].default_value = 1.36
    p.inputs["Transmission Weight"].default_value = 1.0
    mats["Jus"] = m
    add_absorption(m, juice, 10)

    m, p = principled("Or")
    p.inputs["Base Color"].default_value = (*srgb_to_linear((0.96, 0.84, 0.66)), 1)
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.12
    mats["Or"] = m

    m, p = principled("OrBrosse")
    p.inputs["Base Color"].default_value = (*srgb_to_linear((0.90, 0.76, 0.56)), 1)
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.28
    mats["OrBrosse"] = m

    m, p = principled("Plastique")
    p.inputs["Base Color"].default_value = (0.95, 0.95, 0.95, 1)
    p.inputs["Roughness"].default_value = 0.15
    p.inputs["Transmission Weight"].default_value = 1.0
    p.inputs["IOR"].default_value = 1.45
    mats["Plastique"] = m

    # Sérigraphie : or clair, l'alpha de la texture découpe les lettres.
    m, p = principled("Serigraphie")
    tex = m.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(WEB, "labels", handle + ".png"))
    m.node_tree.links.new(tex.outputs["Alpha"], p.inputs["Alpha"])
    p.inputs["Base Color"].default_value = (*srgb_to_linear((1.0, 0.96, 0.88)), 1)
    p.inputs["Metallic"].default_value = 0.45
    p.inputs["Roughness"].default_value = 0.3
    m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    mats["Serigraphie"] = m
    return mats


def add_absorption(mat, color, density):
    """Absorption dans la masse (Cycles) : les zones épaisses se teintent plus."""
    nt = mat.node_tree
    vol = nt.nodes.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = (*srgb_to_linear(color), 1)
    vol.inputs["Density"].default_value = density
    nt.links.new(vol.outputs[0], nt.nodes["Material Output"].inputs["Volume"])


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)


# ------------------------------------------------------------------ export
def build(handle):
    reset()
    p = cotes()
    mats = make_materials(handle)
    glass = G.verre(p)
    juice = G.jus(p)
    ferrule = G.virole(p)
    collar, actuator, act_stem, tube = G.vaporisateur(p)
    cap = G.capot(p)
    label = G.etiquette(p)

    for ob, m in ((glass, "Verre"), (juice, "Jus"), (ferrule, "Or"), (collar, "Or"),
                  (actuator, "Or"), (act_stem, "Plastique"), (tube, "Plastique"),
                  (cap, "Or"), (label, "Serigraphie")):
        assign(ob, mats[m])
        if ob is not label:
            smooth_by_angle(ob)

    # Hiérarchie : le capot peut être animé séparément dans Three.js.
    root = bpy.data.objects.new("Flacon", None)
    bpy.context.collection.objects.link(root)
    for ob in (glass, juice, ferrule, collar, actuator, act_stem, tube, cap, label):
        ob.parent = root
    return root


def export_glb(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_texcoords=True,
        export_normals=True, export_materials="EXPORT",
        export_draco_mesh_compression_enable=False,
    )
    add_volume_extension(path)


def add_volume_extension(path):
    """Ajoute KHR_materials_volume (épaisseur + absorption) au verre et au jus :
    c'est ce qui donne au verre épais sa couleur plus dense sur les tranches."""
    with open(path, "rb") as f:
        data = bytearray(f.read())
    json_len = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20:20 + json_len])
    settings = {
        "Verre": {"thicknessFactor": 0.012, "attenuationDistance": 0.15},
        "Jus": {"thicknessFactor": 0.03, "attenuationDistance": 0.05},
    }
    for mat in doc.get("materials", []):
        if mat["name"] in settings:
            base = mat.get("pbrMetallicRoughness", {}).get("baseColorFactor", [1, 1, 1, 1])
            vol = dict(settings[mat["name"]], attenuationColor=base[:3])
            mat.setdefault("extensions", {})["KHR_materials_volume"] = vol
    used = set(doc.get("extensionsUsed", [])) | {"KHR_materials_volume"}
    doc["extensionsUsed"] = sorted(used)
    raw = json.dumps(doc, separators=(",", ":")).encode()
    raw += b" " * ((4 - len(raw) % 4) % 4)
    rest = data[20 + json_len:]
    out = bytearray(data[:12]) + struct.pack("<I", len(raw)) + b"JSON" + raw + rest
    struct.pack_into("<I", out, 8, len(out))
    with open(path, "wb") as f:
        f.write(out)


def write_version(p):
    """Date et cotes principales, affichées sur /parfum pour savoir d'un coup
    d'œil quelle version du modèle est en ligne."""
    import datetime
    total = p["H"] + p["VIR_H"] + p["CH"]
    info = {
        "date": datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
        "verre": [round(2 * p["A"], 1), round(2 * p["B"], 1), round(p["H"], 1)],
        "capot": [round(2 * p["CA"], 1), round(2 * p["CB"], 1), round(p["CH"], 1)],
        "hauteur": round(total, 1),
    }
    with open(os.path.join(WEB, "modele.json"), "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False, indent=1)


# ------------------------------------------------------------------ rendus
def studio(handle):
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = 256
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 24
    s.cycles.transmission_bounces = 24
    s.cycles.glossy_bounces = 8
    s.cycles.caustics_refractive = True
    # Même rendu des couleurs que la visionneuse web (PBR Neutral de Khronos).
    s.view_settings.view_transform = "Khronos PBR Neutral"
    s.render.film_transparent = False

    world = bpy.data.worlds.new("Studio")
    s.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.62, 0.58, 0.53, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.12

    # Fond et sol continus (cyclorama).
    bm = bmesh.new()
    prof = [(0, -0.5, 0.0), (0, 0.15, 0.0), (0, 0.30, 0.02), (0, 0.36, 0.12), (0, 0.36, 0.5)]
    vs = [(bm.verts.new((-0.6, y, z)), bm.verts.new((0.6, y, z))) for _, y, z in prof]
    for (a0, a1), (b0, b1) in zip(vs, vs[1:]):
        bm.faces.new((a0, a1, b1, b0))
    cyc = mesh_object("Cyclo", bm)
    mod = cyc.modifiers.new("sub", "SUBSURF")
    mod.levels = mod.render_levels = 3
    for p in cyc.data.polygons:
        p.use_smooth = True
    m, p = principled("Fond")
    p.inputs["Base Color"].default_value = (*srgb_to_linear((0.56, 0.54, 0.52)), 1)
    p.inputs["Roughness"].default_value = 0.6
    assign(cyc, m)

    def area(name, loc, size, energy, color=(1, 0.97, 0.92), shape="RECTANGLE", sy=None):
        d = bpy.data.lights.new(name, "AREA")
        d.shape, d.energy, d.color = shape, energy, color
        d.size = size[0]
        d.size_y = size[1]
        ob = bpy.data.objects.new(name, d)
        bpy.context.collection.objects.link(ob)
        ob.location = loc
        direction = Vector((0, 0, 0.06)) - Vector(loc)
        ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        return ob

    # Deux bandes verticales pour les longs reflets sur le verre et l'or,
    # une boîte à lumière au-dessus, un contre-jour pour faire briller le jus.
    area("BandeG", (-0.22, -0.16, 0.10), (0.05, 0.40), 7)
    area("BandeD", (0.24, -0.10, 0.12), (0.05, 0.40), 5)
    area("Dessus", (0.0, -0.05, 0.40), (0.30, 0.30), 5)
    area("ContreJour", (0.0, 0.14, 0.09), (0.18, 0.14), 2.5, color=(1, 0.93, 0.82))


def camera(name, loc, target, lens=85):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.dof.use_dof = False
    ob = bpy.data.objects.new(name, cam)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


def render(handle, out_dir, size=1200, samples=256):
    studio(handle)
    s = bpy.context.scene
    s.cycles.samples = samples
    s.render.resolution_x, s.render.resolution_y = int(size * 0.8), size
    target = (0, 0, 0.064)
    views = {
        "face": camera("Face", (0, -0.44, 0.068), target, 100),
        "trois-quarts": camera("TroisQuarts", (0.24, -0.36, 0.12), target, 100),
    }
    for view, cam in views.items():
        s.camera = cam
        s.render.filepath = os.path.join(out_dir, f"{handle}-{view}.png")
        bpy.ops.render.render(write_still=True)
        print("rendu", s.render.filepath)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--render", metavar="HANDLE", help="rendus Cycles de ce parfum")
    ap.add_argument("--samples", type=int, default=256)
    ap.add_argument("--size", type=int, default=1200)
    args = ap.parse_args(argv)

    handle = args.render or "tonka-love"
    build(handle)
    import rendu  # noqa: E402  (importe build_flacon : pas en tête de fichier)
    rendu.logo_capot(cotes(), None, grille=(130, 147))   # emblème gravé en creux (grille allégée pour le web)
    glb = os.path.join(WEB, "flacon-100ml.glb")
    export_glb(glb)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "flacon-100ml.blend"))
    print("export", glb, os.path.getsize(glb) // 1024, "Ko")
    write_version(cotes())
    if args.render:
        render(handle, os.path.join(ROOT, "renders"), args.size, args.samples)
