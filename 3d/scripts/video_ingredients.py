"""Vidéos « danse des ingrédients » (9:16) pour la collection Skin Obsession.

Maquettes de mouvement destinées à Seedance : l'important est la
chorégraphie, les plans et la composition, pas le rendu. Le flacon est le
vrai modèle (geometrie.py) ; les ingrédients sont des formes procédurales
simples mais lisibles (couleur, taille, silhouette).

Déroulé (15 s, 24 i/s), d'après les vidéos de référence :
  0 – 1 s     plan large, ombre qui balaie le fond beige, constellation au loin
  1 – 2,2 s   plongée rapide du « drone » vers les ingrédients
  2,2 – 8,6 s traversée en macro : la caméra se faufile entre les ingrédients
              qui dansent, et frôle le flacon (capot, arêtes du verre, étiquette)
  8,6 – 11 s  recul ; les ingrédients rejoignent leur place, derrière le flacon
  11 – 15 s   plan final : flacon de face au centre, ingrédients rangés derrière

    python 3d/scripts/video_ingredients.py tonka-love --apercu     # 360 × 640, rapide
    python 3d/scripts/video_ingredients.py tonka-love              # 720 × 1280
"""
import argparse
import math
import os
import random
import subprocess
import sys

import bpy
import bmesh
from mathutils import Euler, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geometrie as G  # noqa: E402
import rendu as R  # noqa: E402

MM = G.MM
FPS = 24
DUREE = 15.0
FOND = (0.87, 0.80, 0.70)          # beige des vidéos de référence
lin = R.lin


# ------------------------------------------------------------------ outils
def mat(name, color, rough=0.5, metal=0.0, trans=0.0, ior=1.45, sss=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*lin(color), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Transmission Weight"].default_value = trans
    b.inputs["IOR"].default_value = ior
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.6, 0.4)
        b.inputs["Subsurface Scale"].default_value = 2 * MM
    return m


def assign(ob, m):
    ob.data.materials.clear()
    ob.data.materials.append(m)


def link(ob):
    if ob.name not in bpy.context.collection.objects:
        bpy.context.collection.objects.link(ob)
    return ob


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def ellipsoide(name, rx, ry, rz, seg=32):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=1.0)
    bmesh.ops.scale(bm, vec=(rx * MM, ry * MM, rz * MM), verts=bm.verts)
    ob = G.mesh_object(name, bm)
    smooth(ob)
    return ob


def rides(ob, force_mm, echelle=0.004, graine=0):
    """Rides / irrégularités par une texture de nuages."""
    tex = bpy.data.textures.new(ob.name + "_rides", "CLOUDS")
    tex.noise_scale = echelle
    tex.noise_depth = 2
    mod = ob.modifiers.new("rides", "DISPLACE")
    mod.texture = tex
    mod.strength = force_mm * MM
    mod.mid_level = 0.5
    mod.texture_coords = "OBJECT"
    G.apply_all(ob)


def plier(ob, angle, axe="Z", methode="BEND"):
    mod = ob.modifiers.new("pli", "SIMPLE_DEFORM")
    mod.deform_method = methode
    mod.angle = angle
    mod.deform_axis = axe
    G.apply_all(ob)


def courbe(name, pts, rayon_mm, profil=None, rayons=None, resol=12):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = rayon_mm * MM
    cu.bevel_resolution = 4
    cu.resolution_u = resol
    if profil is not None:
        cu.bevel_mode = "OBJECT"
        cu.bevel_object = profil
    cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for i, (bp, q) in enumerate(zip(sp.bezier_points, pts)):
        bp.co = Vector(q) * MM
        bp.handle_left_type = bp.handle_right_type = "AUTO"
        if rayons:
            bp.radius = rayons[i]
    ob = link(bpy.data.objects.new(name, cu))
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.view_layer.objects.active
    smooth(ob)
    return ob


def profil_ellipse(name, rx, ry):
    cu = bpy.data.curves.new(name, "CURVE")
    sp = cu.splines.new("NURBS")
    n = 16
    sp.points.add(n - 1)
    for i, pt in enumerate(sp.points):
        a = 2 * math.pi * i / n
        pt.co = (rx * MM * math.cos(a), ry * MM * math.sin(a), 0, 1)
    sp.use_cyclic_u = True
    ob = link(bpy.data.objects.new(name, cu))
    ob.hide_render = True
    ob.hide_viewport = True
    return ob


def joindre(name, obs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    return ob


def recentrer(ob):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    ob.location = (0, 0, 0)
    return ob


def petale(name, long_mm, larg_mm, creux_mm=1.5, m=None):
    """Pétale : ellipse plate, bombée."""
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=24, radius=0.5)
    for v in bm.verts:
        x, y = v.co.x, v.co.y
        v.co = Vector(((x + 0.5) * long_mm * MM, y * larg_mm * MM,
                       -creux_mm * MM * (1 - (2 * y) ** 2) * math.sin(math.pi * (x + 0.5))))
    ob = G.mesh_object(name, bm)
    mod = ob.modifiers.new("ep", "SOLIDIFY")
    mod.thickness = 0.4 * MM
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = 1
    G.apply_all(ob)
    smooth(ob)
    if m:
        assign(ob, m)
    return ob


def fleur(name, n, long_mm, larg_mm, m, coeur=None, ouverture=0.35):
    parts = []
    for i in range(n):
        pe = petale(f"{name}_p{i}", long_mm, larg_mm, m=m)
        pe.rotation_euler = (0, -ouverture, 2 * math.pi * i / n)
        parts.append(pe)
    c = ellipsoide(name + "_c", long_mm * 0.12, long_mm * 0.12, long_mm * 0.1, 12)
    assign(c, coeur or m)
    parts.append(c)
    for o in parts:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return joindre(name, parts)


# -------------------------------------------------------- les ingrédients
def feve_tonka(i):
    ob = ellipsoide(f"tonka{i}", 13, 5.2, 4.2)
    plier(ob, math.radians(35), "Y")
    rides(ob, 0.9, 0.0025)
    assign(ob, mat("feve", (0.10, 0.06, 0.05), 0.55))
    return ob


def amande(i):
    ob = ellipsoide(f"amande{i}", 11, 7, 4.2)
    plier(ob, 0.6, "X", "TAPER")
    rides(ob, 0.25, 0.006)
    assign(ob, mat("amande", (0.93, 0.85, 0.72), 0.45, sss=0.2))
    return ob


def caramel(i):
    pts = [(0, 0, 0), (14, 4, 6), (22, -6, 16), (12, -14, 24), (2, -6, 28), (6, 2, 32)]
    ob = courbe(f"caramel{i}", pts, 3.0, rayons=[1.2, 1.1, 1.0, 0.8, 0.6, 0.35])
    assign(ob, mat("caramel", (0.85, 0.42, 0.06), 0.08, trans=0.7, ior=1.5))
    return recentrer(ob)


def copeau(i):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(46 * MM, 5 * MM, 1.8 * MM), verts=bm.verts)
    ob = G.mesh_object(f"copeau{i}", bm)
    sub = ob.modifiers.new("sub", "SUBDIVIDE" if False else "SUBSURF")
    sub.levels = 2
    sub.subdivision_type = "SIMPLE"
    G.apply_all(ob)
    rides(ob, 0.8, 0.003)
    assign(ob, mat("bois", (0.86, 0.72, 0.54), 0.7))
    return ob


def zeste(i):
    pts = []
    for k in range(40):
        a = k * 0.42
        r = 9 + k * 0.35
        pts.append((r * math.cos(a), r * math.sin(a), k * 1.1))
    prof = profil_ellipse(f"zeste_prof{i}", 5.5, 0.9)
    ob = courbe(f"zeste{i}", pts, 0, profil=prof, resol=3)
    assign(ob, mat("zeste", (0.96, 0.76, 0.22), 0.45, sss=0.15))
    return recentrer(ob)


def poire(i, moitie=False):
    prof = [(0, 0), (14, 1), (26, 8), (30, 20), (26, 34), (17, 46), (12, 58), (9, 68), (4, 76), (0, 78)]
    bm = bmesh.new()
    vs = [bm.verts.new((r * MM, 0, z * MM)) for r, z in prof]
    for a, b in zip(vs, vs[1:]):
        bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1),
                   steps=32, angle=2 * math.pi, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    ob = G.mesh_object(f"poire{i}", bm)
    smooth(ob)
    if moitie:
        s = 1.0
    else:
        s = 0.62
    ob.scale = (s, s, s)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(scale=True)
    peau = mat("poire_peau", (0.80, 0.70, 0.30), 0.5) if moitie else mat("poire_verte", (0.60, 0.66, 0.28), 0.5)
    assign(ob, peau)
    if moitie:
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                                     plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_outer=True)
        edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        faces = bmesh.ops.edgenet_fill(bm, edges=edges)["faces"]
        for f in faces:
            f.material_index = 1
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.materials.append(mat("poire_chair", (0.96, 0.91, 0.72), 0.25, sss=0.3))
    tige = courbe(f"tige_poire{i}", [(0, 0, 76 * s), (2, 0, 86 * s), (5, 1, 94 * s)], 1.3)
    assign(tige, mat("tige", (0.35, 0.24, 0.12), 0.7))
    ob = joindre(f"poire{i}", [ob, tige])
    return recentrer(ob)


def brin_fleurs(i, nom, n_fleurs, taille, couleur, bouton=None, longueur=70):
    m = mat(nom, couleur, 0.45, sss=0.25)
    pts = [(0, 0, 0), (3, 2, longueur * 0.35), (-2, 4, longueur * 0.7), (1, 2, longueur)]
    tige = courbe(f"{nom}_tige{i}", pts, 1.0)
    assign(tige, mat("tige_verte", (0.35, 0.45, 0.22), 0.6))
    parts = [tige]
    rnd = random.Random(i * 13 + len(nom))
    for k in range(n_fleurs):
        f = fleur(f"{nom}{i}_{k}", 5 if nom != "tubereuse" else 6, taille, taille * 0.45, m,
                  coeur=mat("coeur_jaune", (0.95, 0.80, 0.35), 0.5))
        t = 0.55 + 0.45 * k / max(1, n_fleurs - 1)
        f.location = (rnd.uniform(-9, 9) * MM, rnd.uniform(-6, 6) * MM, longueur * t * MM + rnd.uniform(-4, 6) * MM)
        f.rotation_euler = (rnd.uniform(-0.8, 0.8), rnd.uniform(-0.8, 0.8), rnd.uniform(0, 6.28))
        bpy.context.view_layer.objects.active = f
        bpy.ops.object.transform_apply(location=True, rotation=True)
        parts.append(f)
    if bouton:
        for k in range(3):
            b = ellipsoide(f"{nom}_bouton{i}_{k}", 2.6, 2.6, 4.2, 12)
            assign(b, mat(nom + "_bouton", bouton, 0.5))
            b.location = (rnd.uniform(-8, 8) * MM, rnd.uniform(-5, 5) * MM, longueur * rnd.uniform(0.75, 1.02) * MM)
            bpy.context.view_layer.objects.active = b
            bpy.ops.object.transform_apply(location=True)
            parts.append(b)
    return recentrer(joindre(f"{nom}{i}", parts))


def feuille(i, long_mm=60, larg_mm=16, couleur=(0.44, 0.52, 0.38)):
    ob = petale(f"feuille{i}", long_mm, larg_mm, creux_mm=3, m=mat("feuille", couleur, 0.6))
    plier(ob, math.radians(25), "Y")
    return recentrer(ob)


def petale_libre(i):
    ob = petale(f"petale{i}", 16, 11, creux_mm=3, m=mat("petale_blanc", (0.97, 0.95, 0.90), 0.4, sss=0.3))
    return recentrer(ob)


def prune(i, moitie=False):
    ob = ellipsoide(f"prune{i}", 22, 21, 24, 40)
    rides(ob, 0.25, 0.01)
    assign(ob, mat("prune_peau", (0.13, 0.04, 0.09), 0.3))
    if moitie:
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                                     plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_outer=True)
        edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        faces = bmesh.ops.edgenet_fill(bm, edges=edges)["faces"]
        for f in faces:
            f.material_index = 1
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.materials.append(mat("prune_chair", (0.62, 0.05, 0.09), 0.18, sss=0.3))
        noyau = ellipsoide(f"noyau{i}", 9, 3, 12, 20)
        noyau.location = (0, 1.2 * MM, 0)
        assign(noyau, mat("noyau", (0.35, 0.05, 0.06), 0.3))
        ob = joindre(f"prune{i}", [ob, noyau])
    return ob


def gousse(i, longueur=185):
    rnd = random.Random(i)
    pts = [(0, 0, 0), (longueur * 0.3, rnd.uniform(-8, 8), rnd.uniform(-6, 6)),
           (longueur * 0.65, rnd.uniform(-10, 10), rnd.uniform(-8, 8)), (longueur * 0.92, 4, 6),
           (longueur, 12, 16), (longueur * 0.97, 16, 22)]
    prof = profil_ellipse(f"gousse_prof{i}", 6.0, 2.6)
    ob = courbe(f"gousse{i}", pts, 0, profil=prof, rayons=[0.4, 1, 1, 0.9, 0.6, 0.3], resol=16)
    rides(ob, 0.6, 0.003)
    assign(ob, mat("vanille", (0.12, 0.07, 0.04), 0.4))
    return recentrer(ob)


def cannelle(i, longueur=85):
    cu = bpy.data.curves.new(f"cannelle{i}", "CURVE")
    cu.dimensions = "2D"
    cu.extrude = longueur / 2 * MM
    cu.bevel_depth = 0.35 * MM
    sp = cu.splines.new("POLY")
    pts = []
    for k in range(60):
        a = k * 0.28
        r = 6.5 - k * 0.07
        pts.append((r * math.cos(a) * MM, r * math.sin(a) * MM, 0, 1))
    sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = q
    ob = link(bpy.data.objects.new(f"cannelle{i}", cu))
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.view_layer.objects.active
    assign(ob, mat("cannelle", (0.55, 0.30, 0.16), 0.75))
    return recentrer(ob)


def orchidee(i):
    creme = mat("orchidee", (0.96, 0.92, 0.82), 0.4, sss=0.3)
    parts = []
    for k, (L, W, a) in enumerate([(34, 14, 0), (34, 14, 2.1), (34, 14, 4.2), (30, 20, 1.05), (30, 20, 5.25)]):
        pe = petale(f"orch{i}_{k}", L, W, 2.5, creme)
        pe.rotation_euler = (0, -0.25, a)
        parts.append(pe)
    levre = ellipsoide(f"levre{i}", 7, 6, 5, 16)
    assign(levre, mat("orchidee_coeur", (0.92, 0.55, 0.45), 0.4))
    parts.append(levre)
    for o in parts:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True)
    return recentrer(joindre(f"orchidee{i}", parts))


def graines(i, n=60):
    rnd = random.Random(99 + i)
    parts = []
    for k in range(n):
        g = ellipsoide(f"graine{i}_{k}", 0.6, 0.6, 0.6, 6)
        g.location = (rnd.gauss(0, 7) * MM, rnd.gauss(0, 3) * MM, rnd.gauss(0, 7) * MM)
        bpy.context.view_layer.objects.active = g
        bpy.ops.object.transform_apply(location=True)
        parts.append(g)
    ob = joindre(f"graines{i}", parts)
    assign(ob, mat("graine", (0.05, 0.04, 0.03), 0.6))
    return recentrer(ob)


# Chaque recette : (fabrique, position finale derrière le flacon en mm (x, y, z),
# rotation finale en degrés). Le flacon est à l'origine, face à la caméra (−y),
# 63 × 48 × 135 mm ; « derrière » = y positif : les ingrédients sont entre
# 66 et 100 mm, au-delà de la face arrière du flacon (y = 24 mm).
RECETTES = {
    # Plans des objets : fèves, amandes, copeaux, gousses → axe long en X ;
    # cannelle, tiges, zeste → axe en Z ; fleurs, pétales, feuilles → face
    # vers +Z (rotation X de 90° pour les tourner vers la caméra) ; demi-fruits
    # → chair vers +Y (rotation Z de 180° pour la montrer à la caméra).
    "tonka-love": [
        (lambda: feve_tonka(0), (-55, 80, 150), (20, -30, 15)),
        (lambda: feve_tonka(1), (52, 84, 168), (-10, 35, -20)),
        (lambda: feve_tonka(2), (-62, 84, 58), (0, -20, 70)),
        (lambda: feve_tonka(3), (64, 79, 88), (40, 10, 10)),
        (lambda: feve_tonka(4), (22, 93, 218), (10, -60, 0)),
        (lambda: amande(0), (-72, 75, 108), (90, 40, 0)),
        (lambda: amande(1), (72, 80, 132), (90, -30, 0)),
        (lambda: amande(2), (-30, 88, 205), (90, 70, 0)),
        (lambda: caramel(0), (48, 80, 205), (0, 0, 20)),
        (lambda: copeau(0), (-10, 98, 112), (0, -62, 0)),
        (lambda: copeau(1), (14, 100, 72), (0, 52, 0)),
        (lambda: zeste(0), (-46, 84, 205), (20, 0, 0)),
    ],
    "magnetic-flowers": [
        (lambda: poire(0, moitie=True), (-50, 75, 78), (0, 10, 180)),
        (lambda: poire(1), (56, 82, 38), (0, -15, 0)),
        (lambda: brin_fleurs(0, "jasmin", 8, 11, (0.98, 0.97, 0.93)), (56, 84, 150), (0, 20, 0)),
        (lambda: brin_fleurs(1, "tubereuse", 5, 15, (0.97, 0.95, 0.88)), (-34, 93, 172), (0, -18, 0)),
        (lambda: brin_fleurs(2, "fleur_oranger", 5, 9, (0.96, 0.60, 0.22), bouton=(0.95, 0.72, 0.40)), (-70, 80, 138), (0, -35, 0)),
        (lambda: brin_fleurs(3, "fleur_oranger", 4, 9, (0.96, 0.60, 0.22)), (70, 80, 92), (0, 40, 0)),
        (lambda: feuille(0), (18, 98, 206), (90, 0, 40)),
        (lambda: feuille(1), (-60, 88, 30), (90, 0, -30)),
        (lambda: petale_libre(0), (-78, 66, 205), (90, 20, 10)),
        (lambda: petale_libre(1), (78, 70, 185), (70, 10, 60)),
        (lambda: petale_libre(2), (40, 75, 230), (80, 0, 0)),
    ],
    "vanilla-plum": [
        (lambda: gousse(0), (-5, 88, 105), (0, -58, 0)),
        (lambda: gousse(1), (8, 95, 95), (0, 62, 0)),
        (lambda: gousse(2), (38, 84, 170), (0, 78, 180)),
        (lambda: prune(0, moitie=True), (-48, 75, 172), (15, 0, 180)),
        (lambda: prune(1), (54, 80, 120), (0, 0, 0)),
        (lambda: prune(2), (-56, 79, 56), (0, 0, 0)),
        (lambda: prune(3), (42, 86, 26), (0, 0, 0)),
        (lambda: cannelle(0), (30, 91, 62), (0, 40, 0)),
        (lambda: cannelle(1), (-36, 93, 126), (0, -30, 0)),
        (lambda: orchidee(0), (56, 75, 188), (90, 0, -15)),
        (lambda: orchidee(1), (-64, 84, 96), (90, 20, 20)),
        (lambda: graines(0), (-80, 70, 140), (0, 0, 0)),
    ],
}
ECHELLE_INGREDIENTS = 1.15   # un peu plus grands que nature : lisibles à l'écran
# Fèves et amandes sont minuscules à côté du flacon : on les grossit davantage.
ECHELLE_PARFUM = {"tonka-love": 1.75}


# ------------------------------------------------------------- chorégraphie
def lisse(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


class Danseur:
    """Position et orientation d'un objet à l'instant t (secondes)."""

    def __init__(self, ob, final_pos, final_rot, i, n, flacon=False):
        rnd = random.Random(1000 + i)
        self.ob, self.flacon = ob, flacon
        self.fp = Vector(final_pos) * MM
        self.fr = Vector([math.radians(a) for a in final_rot])
        if flacon:
            self.centre = Vector((0, 0, 0.03))
        else:
            # Nuage autour du flacon : couronne de rayon 90 à 170 mm.
            a = 2 * math.pi * i / n + rnd.uniform(-0.3, 0.3)
            r = rnd.uniform(0.09, 0.17)
            self.centre = Vector((r * math.cos(a), 0.03 + r * math.sin(a) * 0.8, rnd.uniform(0.02, 0.2)))
        self.amp = Vector((rnd.uniform(8, 18), rnd.uniform(8, 18), rnd.uniform(10, 22))) * MM
        self.w = Vector((rnd.uniform(0.35, 0.7), rnd.uniform(0.3, 0.6), rnd.uniform(0.4, 0.8)))
        self.ph = Vector((rnd.uniform(0, 6.3), rnd.uniform(0, 6.3), rnd.uniform(0, 6.3)))
        self.r0 = Vector((rnd.uniform(0, 6.3), rnd.uniform(0, 6.3), rnd.uniform(0, 6.3)))
        self.vr = Vector((rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6), rnd.uniform(-0.8, 0.8)))
        self.retard = rnd.uniform(0.0, 0.8)     # les ingrédients arrivent en cascade

    def danse(self, t):
        tour = 0.22 * t                          # la constellation tourne lentement
        c = self.centre
        rc = Vector((c.x * math.cos(tour) - (c.y - 0.03) * math.sin(tour),
                     0.03 + c.x * math.sin(tour) + (c.y - 0.03) * math.cos(tour), c.z))
        off = Vector(tuple(self.amp[k] * math.sin(self.w[k] * t + self.ph[k]) for k in range(3)))
        if self.flacon:
            return Vector((0, 0, 0.03)) + off * 0.4, Vector((0.25 * math.sin(0.5 * t), 0.2 * math.sin(0.4 * t + 1), 0.55 * t))
        return rc + off, self.r0 + self.vr * t

    def pose(self, t):
        p_d, r_d = self.danse(t)
        debut = 8.6 + (0 if self.flacon else self.retard)
        k = lisse((t - debut) / 2.4)
        # Après l'arrivée : léger flottement.
        flot = Vector((0, 0, 1.5 * MM * math.sin(1.2 * t + self.ph.x)))
        p_f = self.fp + flot
        r_f = self.fr + Vector((0.02 * math.sin(0.9 * t + self.ph.y), 0, 0.03 * math.sin(0.7 * t)))
        if self.flacon:
            # Le flacon finit de face : on ramène son angle au tour entier le plus proche.
            tours = round(r_d.z / (2 * math.pi)) * 2 * math.pi
            r_f = Vector((0, 0, tours))
        return p_d.lerp(p_f, k), r_d.lerp(r_f, k)


# ---------------------------------------------------------------- caméra
def catmull(p0, p1, p2, p3, u):
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u
                  + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)


def trajectoire(danseurs, flacon_d):
    """Points clés (temps, position caméra, cible, ouverture) ; les cibles
    macro suivent des ingrédients en mouvement."""
    ing = [d for d in danseurs if not d.flacon]
    choix = [ing[k % len(ing)] for k in (0, 3, 7, 1)]

    def pres(d, t, dx, dy, dz):
        p, _ = d.pose(t)
        return p + Vector((dx, dy, dz)) * MM, p

    cles = []
    cles.append((0.0, Vector((0.12, -2.2, 0.55)), Vector((0, 0.05, 0.1)), 8.0))
    cles.append((1.0, Vector((0.10, -1.7, 0.45)), Vector((0, 0.05, 0.1)), 8.0))
    for t, d, off in ((2.2, choix[0], (-40, -70, 25)), (3.6, choix[1], (45, -65, 10)),
                      (5.0, None, (-60, -80, 150)), (6.3, choix[2], (30, -60, -15)),
                      (7.6, None, (70, -75, 60))):
        if d is None:        # passage au ras du flacon : capot puis arête du verre
            p, _ = flacon_d.pose(t)
            cible = p + Vector((0, 0, off[2] * MM * 0.8))
            cles.append((t, cible + Vector((off[0], off[1], 10)) * MM, cible, 2.2))
        else:
            cam, cible = pres(d, t, *off)
            cles.append((t, cam, cible, 2.0))
    cles.append((8.6, Vector((0.10, -0.34, 0.17)), Vector((0, 0.03, 0.11)), 3.5))
    cles.append((11.0, Vector((0.0, -0.50, 0.125)), Vector((0, 0.03, 0.112)), 6.3))
    cles.append((15.0, Vector((0.0, -0.47, 0.122)), Vector((0, 0.03, 0.112)), 6.3))
    return cles


def camera_a(cles, t):
    ts = [c[0] for c in cles]
    i = max(0, min(len(cles) - 2, max(k for k in range(len(ts)) if ts[k] <= t)))
    u = (t - ts[i]) / (ts[i + 1] - ts[i])
    # Plongée (1 → 2,2 s) accélérée ; le reste en douceur.
    u = u * u if cles[i][0] == 1.0 else lisse(u) * 0.35 + u * 0.65
    a, b = cles[max(0, i - 1)], cles[min(len(cles) - 1, i + 2)]
    pos = catmull(a[1], cles[i][1], cles[i + 1][1], b[1], u)
    cib = catmull(a[2], cles[i][2], cles[i + 1][2], b[2], u)
    f = cles[i][3] + (cles[i + 1][3] - cles[i][3]) * u
    return pos, cib, f


# ------------------------------------------------------------------ scène
def plateau():
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 8
    s.cycles.transmission_bounces = 8
    s.cycles.glossy_bounces = 4
    s.cycles.caustics_refractive = False
    s.cycles.caustics_reflective = False
    s.view_settings.view_transform = "AgX"
    s.view_settings.look = "AgX - Medium High Contrast"
    s.render.fps = FPS
    s.frame_start = 1
    s.frame_end = int(DUREE * FPS)

    world = bpy.data.worlds.new("Fond")
    s.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (*lin(FOND), 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35

    # Fond beige : un mur derrière, où se portent les ombres.
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    mur = G.mesh_object("Mur", bm)
    mur.scale = (40, 40, 1)
    mur.location = (0, 0.22, 0.4)
    mur.rotation_euler = (math.radians(90), 0, 0)
    assign(mur, mat("mur", FOND, 0.9))

    # Lumière chaude rasante (haut gauche) : ombres longues et douces sur le mur.
    sol = bpy.data.lights.new("Soleil", "SUN")
    sol.energy = 3.2
    sol.angle = math.radians(6)
    sol.color = (1.0, 0.93, 0.84)
    so = link(bpy.data.objects.new("Soleil", sol))
    so.rotation_euler = Euler((math.radians(55), math.radians(-28), math.radians(-35)))
    d = bpy.data.lights.new("Douce", "AREA")
    d.energy = 25
    d.size = 1.2
    d.color = (1.0, 0.97, 0.93)
    do = link(bpy.data.objects.new("Douce", d))
    do.location = (0.5, -0.9, 0.6)
    do.rotation_euler = (Vector((0, 0, 0.1)) - do.location).to_track_quat("-Z", "Y").to_euler()

    # Ombre qui balaie le mur au tout début (volet devant le soleil).
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    volet = G.mesh_object("Volet", bm)
    volet.scale = (1.4, 3, 1)
    volet.rotation_euler = so.rotation_euler
    volet.visible_camera = False
    assign(volet, mat("noir", (0.02, 0.02, 0.02), 0.9))
    for t, x in ((0.0, -0.1), (1.1, -1.6)):
        volet.location = (x, -0.6, 1.0)
        volet.keyframe_insert("location", frame=1 + int(t * FPS))
    return so


def construire(handle):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    R.flacon(handle)
    racine = bpy.data.objects["Flacon"]
    racine.location = (0, 0, 0)
    danseurs = []
    recette = RECETTES[handle]
    for i, (fab, pos, rot) in enumerate(recette):
        ob = fab()
        ob.scale = (ECHELLE_INGREDIENTS * ECHELLE_PARFUM.get(handle, 1.0),) * 3
        danseurs.append(Danseur(ob, pos, rot, i, len(recette)))
    fl = Danseur(racine, (0, 0, 0), (0, 0, 0), 99, 1, flacon=True)
    danseurs.append(fl)
    plateau()

    s = bpy.context.scene
    cam_data = bpy.data.cameras.new("Drone")
    cam_data.lens = 28
    cam_data.sensor_width = 36
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.dof.use_dof = True
    cam_data.clip_start = 0.005
    cam = link(bpy.data.objects.new("Drone", cam_data))
    s.camera = cam
    cles = trajectoire(danseurs, fl)

    for f in range(s.frame_start, s.frame_end + 1):
        t = (f - 1) / FPS
        for d in danseurs:
            p, r = d.pose(t)
            d.ob.location = p
            d.ob.rotation_euler = Euler(tuple(r))
            d.ob.keyframe_insert("location", frame=f)
            d.ob.keyframe_insert("rotation_euler", frame=f)
        pos, cib, fstop = camera_a(cles, t)
        cam.location = pos
        cam.rotation_euler = (cib - pos).to_track_quat("-Z", "Y").to_euler()
        cam_data.dof.focus_distance = (cib - pos).length
        cam_data.dof.aperture_fstop = fstop
        # Focale : plus longue au plan final (moins de déformation).
        cam_data.lens = 28 if t < 8.6 else 28 + (85 - 28) * lisse((t - 8.6) / 2.4)
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        cam_data.dof.keyframe_insert("focus_distance", frame=f)
        cam_data.dof.keyframe_insert("aperture_fstop", frame=f)
        cam_data.keyframe_insert("lens", frame=f)
    for ob in list(bpy.data.objects) + [cam_data]:
        ad = getattr(ob, "animation_data", None)
        if ad and ad.action:
            for fc in getattr(ad.action, "fcurves", []):
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"
    return s


def rendre(handle, apercu, debut=1, fin=None, echantillons=None):
    s = construire(handle)
    w, h = (360, 640) if apercu else (720, 1280)
    s.render.resolution_x, s.render.resolution_y = w, h
    s.cycles.samples = echantillons or (6 if apercu else 24)
    s.render.use_motion_blur = not apercu
    out = os.path.join(R.ROOT, "videos", handle + ("-apercu" if apercu else ""))
    os.makedirs(out, exist_ok=True)
    s.render.filepath = os.path.join(out, "img_")
    s.render.image_settings.file_format = "JPEG"
    s.render.image_settings.quality = 92
    s.frame_start = debut
    if fin:
        s.frame_end = fin
    bpy.ops.render.render(animation=True)
    return out


def monter(dossier, sortie):
    """Assemble les images en MP4 (H.264, 24 i/s) avec l'ffmpeg d'imageio."""
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([ff, "-y", "-loglevel", "error", "-framerate", str(FPS),
                    "-i", os.path.join(dossier, "img_%04d.jpg"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", sortie], check=True)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("parfum", choices=list(RECETTES))
    ap.add_argument("--apercu", action="store_true")
    ap.add_argument("--debut", type=int, default=1)
    ap.add_argument("--fin", type=int)
    ap.add_argument("--echantillons", type=int)
    ap.add_argument("--blend", action="store_true", help="enregistre seulement la scène .blend")
    a = ap.parse_args(argv)
    if a.blend:
        construire(a.parfum)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(R.ROOT, "videos", a.parfum + ".blend"))
    else:
        d = rendre(a.parfum, a.apercu, a.debut, a.fin, a.echantillons)
        suffixe = "-apercu" if a.apercu else ""
        monter(d, os.path.join(R.ROOT, "videos", f"{a.parfum}{suffixe}.mp4"))
        print("video", os.path.join(R.ROOT, "videos", f"{a.parfum}{suffixe}.mp4"))
