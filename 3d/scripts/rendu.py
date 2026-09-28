"""Rendus photoréalistes du flacon (Blender Cycles) et 360° pour le web.

Reprend la géométrie de build_flacon (mêmes cotes que le GLB), y ajoute la
gravure « LIBRERY Paris » sous le socle, des matières physiques (verre et
jus réfractants, absorption dans la masse, or poli, dorure) et un studio de
photo produit : fond clair, boîtes à lumière, bandes de contour et drapeaux
noirs qui dessinent les arêtes du verre.

    python 3d/scripts/rendu.py --comparer                 # photo | rendu, caméras ajustées
    python 3d/scripts/rendu.py --tour tonka-love --vues 36  # 360° → maquette/parfum/360/
"""
import argparse
import json
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_flacon as BF  # noqa: E402
import geometrie as G  # noqa: E402
from parfums import PARFUMS  # noqa: E402

ROOT = BF.ROOT
MM = G.MM
FONT = os.path.join(ROOT, "fonts", "Cinzel-Regular.ttf")
lin = BF.srgb_to_linear
LUMIERE = 0.33  # niveau global du studio, calé sur la teinte du fond des photos
EXPOSITION = -1.3   # table et fond sous le blanc : le verre a de quoi réfracter


# ----------------------------------------------------------------- gravure
def gravure(glass, p):
    """« LIBRERY / Paris » gravé sous le socle, lisible par-dessous (vu à
    travers le verre depuis l'avant, il apparaît en miroir, comme sur les
    photos). La gravure (sablage) est modélisée comme une fine lame d'air
    dépolie juste sous la surface du fond : même rendu optique qu'un creux,
    sans opération booléenne sur le maillage du verre."""
    font = bpy.data.fonts.load(FONT)
    objs = []
    for text, size, y in (("LIBRERY", 6.2, 4.2), ("Paris", 5.2, -5.4)):
        cu = bpy.data.curves.new(text, "FONT")
        cu.body = text
        cu.font = font
        cu.size = size * MM
        cu.align_x = "CENTER"
        cu.align_y = "CENTER"
        cu.extrude = 0.15 * MM
        cu.fill_mode = "BOTH"
        cu.space_character = 1.08
        ob = bpy.data.objects.new(text, cu)
        bpy.context.collection.objects.link(ob)
        # Demi-tour autour de Y : lisible depuis le dessous.
        ob.location = (0, y * MM, 0.3 * MM)
        ob.rotation_euler = (0, math.pi, 0)
        objs.append(ob)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join()
    grav = bpy.context.view_layer.objects.active
    grav.name = "Gravure"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    grav.parent = glass.parent
    mat, nt, b = node_mat("GravureCycles")
    b.inputs["Base Color"].default_value = (1, 1, 1, 1)
    b.inputs["Roughness"].default_value = 0.45
    b.inputs["IOR"].default_value = 1.0 / 1.5      # lame d'air dans le verre
    b.inputs["Transmission Weight"].default_value = 1.0
    BF.assign(grav, mat)
    return grav


# --------------------------------------------------------------- matières
def node_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt, nt.nodes["Principled BSDF"]


def absorption(mat, color, parcours_mm):
    """Absorption dans la masse, calculée canal par canal pour qu'après
    `parcours_mm` de matière la lumière transmise ait exactement `color`
    (sRGB). Cycles absorbe selon σ = densité × (1 − couleur), en m⁻¹."""
    d = parcours_mm * MM
    sigma = [-math.log(max(c, 1e-3)) / d for c in lin(color)]
    dens = max(max(sigma), 1e-6)
    nt = mat.node_tree
    vol = nt.nodes.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = (*[1 - x / dens for x in sigma], 1)
    vol.inputs["Density"].default_value = dens
    nt.links.new(vol.outputs[0], nt.nodes["Material Output"].inputs["Volume"])


CALIBRATION = os.path.join(ROOT, "scripts", "calibration.json")


def absorption_tau(mat, tau, ref_mm=10.0):
    """Absorption donnée par l'épaisseur optique τ de chaque canal sur
    `ref_mm` de matière (valeurs issues de calibrer.py)."""
    sigma = [max(t, 0.0) / (ref_mm * MM) for t in tau]
    dens = max(max(sigma), 1e-6)
    nt = mat.node_tree
    vol = nt.nodes.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = (*[1 - x / dens for x in sigma], 1)
    vol.inputs["Density"].default_value = dens
    nt.links.new(vol.outputs[0], nt.nodes["Material Output"].inputs["Volume"])


def tau_jus(handle):
    if os.path.exists(CALIBRATION):
        data = json.load(open(CALIBRATION))
        if handle in data:
            return data[handle]
    jus = lin(PARFUMS[handle][2])
    return [-2.0 * math.log(max(c, 1e-3)) for c in jus]


def matieres(handle, tau=None):
    _lines, verre, jus = PARFUMS[handle]
    teinte = any(c < 0.95 for c in verre)
    m = {}

    mat, nt, b = node_mat("VerreCycles")
    b.inputs["Base Color"].default_value = (1, 1, 1, 1)
    b.inputs["Roughness"].default_value = 0.0
    b.inputs["IOR"].default_value = 1.5
    b.inputs["Transmission Weight"].default_value = 1.0
    if "Dispersion" in b.inputs:          # légère dispersion : liserés irisés
        b.inputs["Dispersion"].default_value = 0.08
    # Verre teinté dans la masse : dense dans le socle, léger sur les faces.
    absorption(mat, verre if teinte else (0.995, 0.99, 0.982), 60 if teinte else 30)
    m["Verre"] = mat

    mat, nt, b = node_mat("JusCycles")
    b.inputs["Base Color"].default_value = (1, 1, 1, 1)
    b.inputs["Roughness"].default_value = 0.0
    b.inputs["IOR"].default_value = 1.36
    b.inputs["Transmission Weight"].default_value = 1.0
    # Épaisseur optique calibrée sur les photos (calibrer.py).
    absorption_tau(mat, tau if tau is not None else tau_jus(handle))
    m["Jus"] = mat

    mat, nt, b = node_mat("OrCycles")
    b.inputs["Base Color"].default_value = (*lin((0.95, 0.79, 0.70)), 1)   # or rose champagne
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.045
    m["Or"] = mat

    mat, nt, b = node_mat("TubeCycles")
    b.inputs["Base Color"].default_value = (1, 1, 1, 1)
    b.inputs["Roughness"].default_value = 0.1
    b.inputs["IOR"].default_value = 1.49
    b.inputs["Transmission Weight"].default_value = 1.0
    m["Plastique"] = mat

    mat, nt, b = node_mat("DorureCycles")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(BF.WEB, "labels", handle + ".png"))
    nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    # Dorure à chaud : or très clair, satiné, avec une légère émission pour
    # rester lisible sur les jus sombres, comme sur les photos.
    b.inputs["Base Color"].default_value = (*lin((1.0, 0.95, 0.86)), 1)
    b.inputs["Metallic"].default_value = 0.35
    b.inputs["Roughness"].default_value = 0.3
    b.inputs["Emission Color"].default_value = (*lin((1.0, 0.95, 0.86)), 1)
    b.inputs["Emission Strength"].default_value = 1.6
    m["Serigraphie"] = mat
    return m


# ------------------------------------------------------------------ studio
FOND_PAGE = (236 / 255, 230 / 255, 221 / 255)   # --bg de la page /parfum


def studio(fond=FOND_PAGE):
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 32
    s.cycles.transmission_bounces = 32
    s.cycles.glossy_bounces = 12
    s.cycles.transparent_max_bounces = 16
    s.cycles.caustics_refractive = True
    s.cycles.caustics_reflective = False
    s.cycles.blur_glossy = 0.3
    # Transformation linéaire (sRGB standard) : les couleurs sont calibrées sur
    # les photos (calibrer.py), un tone mapping les décalerait de façon
    # imprévisible dans les tons clairs.
    s.view_settings.view_transform = "Standard"
    s.view_settings.look = "None"
    s.view_settings.exposure = EXPOSITION

    # Vrai plateau de studio : table et fond d'un seul tenant (cyclo), de la
    # couleur de la page. Le verre ne se voit que par ce qu'il déforme : la
    # ligne de table, le dégradé du fond, la lumière. Sur un fond uniforme
    # (essai précédent), socle et épaules devenaient invisibles.
    s.render.film_transparent = False
    world = bpy.data.worlds.new("Studio")
    s.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*lin(fond), 1)
    bg.inputs["Strength"].default_value = 0.3

    bm = bmesh.new()
    prof = [(-0.7, 0.0), (0.12, 0.0), (0.26, 0.015), (0.33, 0.1), (0.35, 0.6)]
    vs = [(bm.verts.new((-0.9, y, z)), bm.verts.new((0.9, y, z))) for y, z in prof]
    for (a0, a1), (b0, b1) in zip(vs, vs[1:]):
        bm.faces.new((a0, a1, b1, b0))
    cyc = G.mesh_object("Cyclo", bm)
    sub = cyc.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 3
    for poly in cyc.data.polygons:
        poly.use_smooth = True
    mat, nt, b = node_mat("Fond")
    b.inputs["Base Color"].default_value = (*lin(fond), 1)
    b.inputs["Roughness"].default_value = 0.45
    b.inputs["Specular IOR Level"].default_value = 0.35   # table légèrement satinée
    BF.assign(cyc, mat)

    def area(name, loc, size, energy, target=(0, 0, 0.06), color=(1, 0.99, 0.975), visible=False):
        d = bpy.data.lights.new(name, "AREA")
        d.shape = "RECTANGLE"
        d.size, d.size_y = size
        d.energy = energy * LUMIERE
        d.color = color
        ob = bpy.data.objects.new(name, d)
        bpy.context.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        ob.visible_camera = visible
        return ob

    # Boîte à lumière principale (avant gauche), plafonnier, bandes de contour
    # derrière le flacon (liserés lumineux sur les arêtes), contre-jour doux.
    principale = area("Principale", (-0.34, -0.36, 0.30), (0.45, 0.45), 8)
    principale.visible_glossy = False   # éclaire sans poser de bande blanche en reflet sur le jus
    area("Plafond", (0.02, -0.02, 0.48), (0.5, 0.35), 5)
    area("BandeG", (-0.26, 0.10, 0.10), (0.06, 0.5), 6)
    area("BandeD", (0.27, 0.06, 0.12), (0.06, 0.5), 5)
    # Réflecteur côté caméra, placé haut : un miroir vertical ne renvoie que
    # ce qui est à sa hauteur, donc le capot (vers 12 cm) le voit et devient
    # champagne clair, tandis que la face avant du jus (3 à 9 cm) ne le voit
    # pas (un réflecteur bas y posait un voile blanc, mesuré avec calibrer.py).
    haut = area("ReflecteurCapot", (0.05, -0.62, 0.215), (0.6, 0.09), 6,
                target=(0, -0.62, 0.0), color=(1, 0.97, 0.95))
    haut.rotation_euler = (math.radians(75), 0, 0)    # tourné vers le flacon, légèrement vers le bas
    haut.visible_diffuse = False    # ne sert qu'aux reflets
    # Liaison de lumière : ce réflecteur n'éclaire que les pièces dorées,
    # jamais le verre ni le jus (sinon, bande blanche en reflet sur le jus).
    dores = bpy.data.collections.new("PiecesDorees")
    for n in ("Capot", "Virole", "Col", "Poussoir"):
        if n in bpy.data.objects:
            dores.objects.link(bpy.data.objects[n])
    haut.light_linking.receiver_collection = dores
    area("ContreJour", (0.0, 0.3, 0.10), (0.35, 0.2), 3.0, color=(1, 0.97, 0.94))

    # Drapeaux noirs, invisibles pour la caméra mais vus en reflet.
    for name, loc in (("DrapeauG", (-0.2, -0.16, 0.08)), ("DrapeauD", (0.2, -0.2, 0.08))):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
        ob = G.mesh_object(name, bm)
        ob.scale = (0.18, 0.5, 1)
        ob.location = loc
        ob.rotation_euler = (Vector((0, 0, 0.07)) - Vector(loc)).to_track_quat("Z", "Y").to_euler()
        mat, nt, b = node_mat("Noir")
        b.inputs["Base Color"].default_value = (0.005, 0.005, 0.005, 1)
        b.inputs["Roughness"].default_value = 0.9
        BF.assign(ob, mat)
        # Vus seulement en reflet (arêtes sombres), jamais au travers du verre.
        ob.visible_camera = False
        ob.visible_shadow = False
        ob.visible_transmission = False
        ob.visible_diffuse = False
        ob.visible_volume_scatter = False


def contact_jus(p, m):
    """Contact réel verre / jus. Sous le niveau du liquide, la paroi de la
    cavité n'est plus une interface verre / air : on la retire du verre et
    c'est la surface du jus, un peu plus large, qui fait la frontière, avec
    l'indice relatif du jus dans le verre (1,36 / 1,5). Seule la surface
    libre du jus (en haut) voit l'air de la cavité, avec l'indice 1,36.
    Sans cela, la lame d'air crée des réflexions totales : liseré sombre
    autour du jus et parois blanches, loin des photos."""
    from mathutils.bvhtree import BVHTree
    glass = bpy.data.objects["Verre"]
    old = bpy.data.objects["Jus"]
    parent = old.parent
    bpy.data.objects.remove(old)
    jus = G.jus(p, grow=0.03)      # léger recouvrement dans le verre : pas de fente
    jus.parent = parent

    # Retire du verre les faces de la cavité noyées dans le jus.
    bmj = bmesh.new()
    bmj.from_mesh(jus.data)
    tree = BVHTree.FromBMesh(bmj)
    bm = bmesh.new()
    bm.from_mesh(glass.data)
    noyees = []
    for f in bm.faces:
        c = f.calc_center_median()
        loc, nrm, _i, dist = tree.find_nearest(c)
        if loc is not None and dist < 0.2 * MM and c.z < G.niveau(p) * MM - 0.05 * MM:
            noyees.append(f)
    bmesh.ops.delete(bm, geom=noyees, context="FACES")
    bm.to_mesh(glass.data)
    bm.free()
    bmj.free()
    for poly in jus.data.polygons:
        poly.use_smooth = True

    contact = m["Jus"]
    libre = contact.copy()
    libre.name = "JusSurfaceLibre"
    contact.node_tree.nodes["Principled BSDF"].inputs["IOR"].default_value = 1.36 / 1.5
    libre.node_tree.nodes["Principled BSDF"].inputs["IOR"].default_value = 1.36
    jus.data.materials.clear()
    jus.data.materials.append(contact)
    jus.data.materials.append(libre)


def cartes_noires():
    """Cartes noires de part et d'autre, en retrait (fond noir « dark field ») :
    vues au travers des arêtes épaisses, elles dessinent le contour du verre
    comme sur les photos, sans assombrir le centre du jus."""
    for i, x in enumerate((-0.11, 0.11)):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
        ob = G.mesh_object(f"Carte{i}", bm)
        ob.scale = (0.08, 0.48, 1)
        ob.location = (x, 0.1, 0.07)
        ob.rotation_euler = (Vector((0, -0.5, 0.07)) - ob.location).to_track_quat("Z", "Y").to_euler()
        mat, nt, b = node_mat("CarteNoire")
        b.inputs["Base Color"].default_value = (0.01, 0.01, 0.01, 1)
        b.inputs["Roughness"].default_value = 0.8
        BF.assign(ob, mat)
        ob.visible_camera = False
        ob.visible_shadow = False


def scene(handle, tau=None):
    BF.build(handle)
    p = BF.cotes()
    glass = bpy.data.objects["Verre"]
    gravure(glass, p)
    m = matieres(handle, tau)
    for ob in bpy.data.objects:
        if ob.type != "MESH" or not ob.data.materials:
            continue
        name = ob.data.materials[0].name
        if name in m:
            BF.assign(ob, m[name])
    contact_jus(p, m)
    studio()
    cartes_noires()
    return p


# --------------------------------------------------------------- sorties
def comparer(samples, echelle, photos=None):
    """Planches photo | rendu Cycles depuis la caméra ajustée de chaque photo."""
    import comparer as C
    from ajuster import DETOURES, HAUTEUR
    from PIL import Image
    fit = json.load(open(BF.AJUSTEMENT))
    for handle, cam in fit["cameras"].items():
        if photos and handle not in photos:
            continue
        scene(handle)
        s = bpy.context.scene
        s.cycles.samples = samples
        photo = Image.open(os.path.join(DETOURES, handle + ".webp")).convert("RGBA")
        w = round(photo.width * HAUTEUR / photo.height)
        C.place_camera(cam, w, HAUTEUR, echelle)
        out = os.path.join(ROOT, "renders", f"_tmp-{handle}.png")
        s.render.filepath = out
        bpy.ops.render.render(write_still=True)
        rgba = Image.open(out).convert("RGBA")
        r = Image.new("RGBA", rgba.size, (236, 230, 221, 255))
        r.alpha_composite(rgba)
        r = r.convert("RGB")
        ph = photo.resize(r.size, Image.LANCZOS)
        tile = Image.new("RGBA", r.size, (236, 230, 221, 255))
        tile.alpha_composite(ph)
        board = Image.new("RGB", (r.width * 2 + 16, r.height), (255, 255, 255))
        board.paste(tile.convert("RGB"), (0, 0))
        board.paste(r, (r.width + 16, 0))
        board.save(os.path.join(ROOT, "renders", f"cycles-{handle}.jpg"), quality=90)
        os.remove(out)
        print("comparaison", handle, flush=True)


def tour(handle, vues, samples, largeur, hauteur, debut=0):
    """Rotation complète : le flacon tourne sur lui-même, caméra et lumières
    fixes (comme sur une platine de studio). Images WebP pour la page."""
    from PIL import Image
    scene(handle)
    s = bpy.context.scene
    s.cycles.samples = samples
    s.render.resolution_x, s.render.resolution_y = largeur, hauteur
    root = bpy.data.objects["Flacon"]
    cam = bpy.data.cameras.new("tour")
    cam.lens = 105
    cam.sensor_width = 36
    ob = bpy.data.objects.new("tour", cam)
    bpy.context.collection.objects.link(ob)
    ob.location = (0.0, -0.52, 0.115)
    ob.rotation_euler = (Vector((0, 0, 0.066)) - ob.location).to_track_quat("-Z", "Y").to_euler()
    s.camera = ob
    out = os.path.join(BF.WEB, "360", handle)
    os.makedirs(out, exist_ok=True)
    tmp = os.path.join(ROOT, "renders", f"_tour-{handle}.png")
    for i in range(debut, vues):
        root.rotation_euler = (0, 0, 2 * math.pi * i / vues)
        s.render.filepath = tmp
        bpy.ops.render.render(write_still=True)
        # WebP avec alpha : l'ombre et les bords se posent sur le fond de la page.
        Image.open(tmp).convert("RGBA").save(os.path.join(out, f"{i:02d}.webp"), quality=88, method=6)
        print("vue", handle, i, flush=True)
    os.remove(tmp)
    with open(os.path.join(out, "info.json"), "w") as f:
        json.dump({"vues": vues, "largeur": largeur, "hauteur": hauteur}, f)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--comparer", action="store_true")
    ap.add_argument("--tour", metavar="HANDLE")
    ap.add_argument("--vues", type=int, default=36)
    ap.add_argument("--debut", type=int, default=0)
    ap.add_argument("--samples", type=int, default=160)
    ap.add_argument("--echelle", type=float, default=2.0)
    ap.add_argument("--taille", default="800x1000")
    ap.add_argument("--photos", default="")
    a = ap.parse_args(argv)
    if a.comparer:
        comparer(a.samples, a.echelle, [x for x in a.photos.split(",") if x])
    if a.tour:
        w, h = map(int, a.taille.split("x"))
        tour(a.tour, a.vues, a.samples, w, h, a.debut)
