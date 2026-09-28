"""Vidéos « danse des ingrédients » (9:16) pour la collection Skin Obsession.

Maquettes de mouvement destinées à Seedance : l'important est la
chorégraphie, les plans et la composition, pas le rendu. Le flacon est le
vrai modèle (geometrie.py) ; les ingrédients sont des formes procédurales
simples mais lisibles (couleur, taille, silhouette).

Déroulé (15 s, 24 i/s), d'après les vidéos de référence :
  0 – 8 s     six plans macro en cuts francs, alternant les ingrédients
              vedettes (VEDETTES) et des détails du flacon : capot et logo,
              arêtes et entailles du verre, étiquette. Jamais le flacon entier.
  8 – 11,8 s  reveal : départ serré sur le capot, long recul pendant que les
              ingrédients rejoignent leur place, derrière le flacon
  11,8 – 15 s plan final : flacon de face au centre, ingrédients rangés derrière

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
from mathutils import Euler, Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geometrie as G  # noqa: E402
import rendu as R  # noqa: E402
from ingredients import *  # noqa: E402,F401,F403  (ingrédients, mat, assign)

MM = G.MM
FPS = 24
DUREE = 15.0
FOND = (0.87, 0.80, 0.70)          # beige des vidéos de référence
lin = R.lin


# ------------------------------------------------------------------ outils
def link(ob):
    if ob.name not in bpy.context.collection.objects:
        bpy.context.collection.objects.link(ob)
    return ob


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
        (lambda: ambre_pepite(0), (22, 93, 218), (10, -60, 0)),
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
        (lambda: jasmin(0), (56, 84, 150), (0, 20, 0)),
        (lambda: tubereuse(0), (-34, 93, 172), (0, -18, 0)),
        (lambda: fleur_oranger(0), (-70, 80, 138), (0, -35, 0)),
        (lambda: fleur_oranger(1), (70, 80, 92), (0, 40, 0)),
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
ECHELLE_PARFUM = {"tonka-love": 1.45}


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


# Ingrédients vedettes de chaque parfum : (indice dans la recette, distance
# caméra en mm). Ce sont eux qu'on voit en gros plan avant le reveal.
VEDETTES = {
    "tonka-love": [(0, 95), (11, 120), (8, 105)],          # fève, zeste, ambre
    "magnetic-flowers": [(0, 150), (2, 120), (4, 110)],    # demi-poire, jasmin, fleur d'oranger
    "vanilla-plum": [(3, 120), (0, 105), (9, 110)],        # demi-prune, gousse, orchidée
}
REVEAL = 8.0      # début du dernier plan : on recule et le flacon se révèle


def repere_flacon(flacon_d, t):
    """Matrice monde du flacon (origine sous le socle) à l'instant t."""
    p, r = flacon_d.pose(t)
    return Matrix.Translation(p) @ Euler(tuple(r)).to_matrix().to_4x4()


def orbite(cible, dist_mm, azim, elev):
    """Point à dist_mm de la cible ; azim 0 = de face (−y), en degrés."""
    a, e = math.radians(azim), math.radians(elev)
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    return cible + d * dist_mm * MM


def plans(handle, danseurs, flacon_d):
    """Découpage en plans (cuts francs). Chaque plan : (début, fin, fonction
    t → (position caméra, cible, ouverture, focale)).

    Avant le reveal, que du macro : ingrédients vedettes et détails du
    flacon (capot et logo, arêtes et entailles du verre, étiquette), jamais
    le flacon entier."""
    ing = [d for d in danseurs if not d.flacon]

    def plan_ingredient(k, azim, elev):
        i, dist = VEDETTES[handle][k]
        d = ing[i % len(ing)]

        def f(t, t0, t1):
            u = (t - t0) / (t1 - t0)
            p, _ = d.pose(t)
            cam = orbite(p, dist * (1.12 - 0.22 * u), azim + 22 * u, elev - 6 * u)
            return cam, p, 22.0, 50.0
        return f

    def plan_flacon(cible_mm, dist, az0, az1, el0, el1, focale=55.0, cible_fin=None):
        def f(t, t0, t1):
            u = lisse((t - t0) / (t1 - t0)) * 0.5 + (t - t0) / (t1 - t0) * 0.5
            m = repere_flacon(flacon_d, t)
            c_loc = Vector(cible_mm) if cible_fin is None else Vector(cible_mm).lerp(Vector(cible_fin), u)
            c_loc = c_loc * MM
            cam_loc = orbite(c_loc, dist, az0 + (az1 - az0) * u, el0 + (el1 - el0) * u)
            return m @ cam_loc, m @ c_loc, 22.0, focale
        return f

    capot = plan_flacon((0, 0, 128), 62, -55, -20, 38, 28)
    verre = plan_flacon((-27, -18, 18), 58, -30, -62, -14, -4)
    etiquette = plan_flacon((14, -24, 104), 60, -35, -5, 12, 4, cible_fin=(4, -24, 58))

    def reveal(t, t0, t1):
        # Départ serré sur le capot (qui suit encore la danse), recul jusqu'au
        # plan final : flacon de face au centre, ingrédients derrière.
        k = lisse((t - t0) / 3.8)
        m = repere_flacon(flacon_d, t)
        c0 = Vector((0, 0, 124)) * MM
        cam0, cib0 = m @ orbite(c0, 70, -12, 10), m @ c0
        cam1 = Vector((0.0, -0.49, 0.124)).lerp(Vector((0.0, -0.47, 0.122)), lisse((t - t0 - 3.8) / 3.2))
        cib1 = Vector((0, 0.03, 0.112))
        return cam0.lerp(cam1, k), cib0.lerp(cib1, k), 22.0 - 15.7 * k, 60.0 + 25.0 * k

    return [
        (0.00, 1.50, plan_ingredient(0, -30, 18)),
        (1.50, 2.75, capot),
        (2.75, 4.25, plan_ingredient(1, 25, 10)),
        (4.25, 5.50, verre),
        (5.50, 6.90, plan_ingredient(2, -15, 25)),
        (6.90, REVEAL, etiquette),
        (REVEAL, DUREE + 1, reveal),
    ]


def camera_a(decoupage, t):
    for t0, t1, f in decoupage:
        if t0 <= t < t1:
            return f(t, t0, t1)
    t0, t1, f = decoupage[-1]
    return f(t, t0, t1)


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
    decoupage = plans(handle, danseurs, fl)
    # Dernière image de chaque plan : l'interpolation y sera constante, pour
    # que le flou de mouvement (obturateur ouvert après l'image) ne traverse
    # pas le cut.
    fins_de_plan = {math.ceil(t1 * FPS) for _, t1, _ in decoupage[:-1]}

    for f in range(s.frame_start, s.frame_end + 1):
        t = (f - 1) / FPS
        for d in danseurs:
            p, r = d.pose(t)
            d.ob.location = p
            d.ob.rotation_euler = Euler(tuple(r))
            d.ob.keyframe_insert("location", frame=f)
            d.ob.keyframe_insert("rotation_euler", frame=f)
        pos, cib, fstop, focale = camera_a(decoupage, t)
        cam.location = pos
        cam.rotation_euler = (cib - pos).to_track_quat("-Z", "Y").to_euler()
        cam_data.dof.focus_distance = (cib - pos).length
        cam_data.dof.aperture_fstop = fstop
        cam_data.lens = focale
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        cam_data.dof.keyframe_insert("focus_distance", frame=f)
        cam_data.dof.keyframe_insert("aperture_fstop", frame=f)
        cam_data.keyframe_insert("lens", frame=f)
    s.render.motion_blur_position = "START"
    for ob in list(bpy.data.objects) + [cam_data]:
        ad = getattr(ob, "animation_data", None)
        if ad and ad.action:
            for fc in getattr(ad.action, "fcurves", []):
                for kp in fc.keyframe_points:
                    kp.interpolation = ("CONSTANT" if ob in (cam, cam_data)
                                        and int(kp.co.x) in fins_de_plan else "LINEAR")
    return s


def argile():
    """Rendu « pâte à modeler » en niveaux de gris : chaque matière devient
    un diffus gris de même luminance (les objets restent distincts), le verre
    un gris clair opaque. Quelques rebonds suffisent : 5 à 10 fois plus
    rapide. Pour Seedance, seuls comptent le rythme et les mouvements."""
    s = bpy.context.scene
    s.cycles.max_bounces = 2
    s.cycles.diffuse_bounces = 1
    s.cycles.glossy_bounces = 1
    s.cycles.transmission_bounces = 0
    s.view_settings.view_transform = "Standard"
    s.view_settings.look = "None"
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        gris = 0.55
        if bsdf is not None:
            c = bsdf.inputs["Base Color"].default_value
            gris = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
            if bsdf.inputs["Transmission Weight"].default_value > 0.5 or bsdf.inputs["Metallic"].default_value > 0.5:
                gris = 0.7
            gris = min(0.8, max(0.06, gris))
        if m.name.startswith("mur"):
            gris = 0.6
        nt = m.node_tree
        nt.nodes.clear()
        d = nt.nodes.new("ShaderNodeBsdfDiffuse")
        d.inputs["Color"].default_value = (gris, gris, gris, 1)
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(d.outputs[0], out.inputs["Surface"])
    s.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.6, 0.6, 0.6, 1)
    # Étiquette (plan à alpha) et gravure n'ont plus de sens en argile.
    for nom in ("Etiquette", "Gravure"):
        if nom in bpy.data.objects:
            bpy.data.objects[nom].hide_render = True


def rendre(handle, apercu, debut=1, fin=None, echantillons=None, gris=False, rapide=False):
    s = construire(handle)
    if gris:
        argile()
    s.render.use_persistent_data = True          # garde la scène entre deux images
    if rapide:
        # ≈ 5 s par image au lieu de 13 : 540 × 960, 6 échantillons, rebonds
        # réduits, une image sur deux (12 i/s, interpolées à 24 au montage).
        c = s.cycles
        c.max_bounces, c.transmission_bounces, c.glossy_bounces, c.diffuse_bounces = 6, 6, 2, 1
        c.use_adaptive_sampling = True
        c.adaptive_threshold = 0.1
        s.frame_step = 2
    w, h = (360, 640) if apercu else (540, 960) if rapide else (720, 1280)
    s.render.resolution_x, s.render.resolution_y = w, h
    s.cycles.samples = echantillons or (3 if gris else 6 if apercu or rapide else 24)
    s.render.use_motion_blur = not (apercu or gris or rapide)
    out = os.path.join(R.ROOT, "videos", handle + suffixe_video(apercu, gris))
    os.makedirs(out, exist_ok=True)
    s.render.filepath = os.path.join(out, "img_")
    s.render.image_settings.file_format = "JPEG"
    s.render.image_settings.quality = 92
    s.frame_start = debut
    if fin:
        s.frame_end = fin
    bpy.ops.render.render(animation=True)
    return out


def suffixe_video(apercu, gris):
    return ("-gris" if gris else "") + ("-apercu" if apercu else "")


def monter(dossier, sortie):
    """Assemble les images en MP4 (H.264, 24 i/s) avec l'ffmpeg d'imageio.
    Si une image sur deux seulement a été rendue (mode rapide), les images
    intermédiaires sont interpolées par compensation de mouvement ; les cuts
    sont détectés et laissés francs."""
    import glob
    import tempfile
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    imgs = sorted(glob.glob(os.path.join(dossier, "img_*.jpg")))
    nums = [int(os.path.basename(f)[4:8]) for f in imgs]
    pas = (nums[1] - nums[0]) if len(nums) > 1 else 1
    with tempfile.TemporaryDirectory() as tmp:
        for k, f in enumerate(imgs):
            os.symlink(os.path.abspath(f), os.path.join(tmp, f"i_{k:04d}.jpg"))
        cmd = [ff, "-y", "-loglevel", "error", "-framerate", str(FPS / pas), "-i", os.path.join(tmp, "i_%04d.jpg")]
        if pas > 1:
            cmd += ["-vf", f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:scd=fdiff:scd_threshold=8"]
        cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", str(FPS), sortie]
        subprocess.run(cmd, check=True)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("parfum", choices=list(RECETTES))
    ap.add_argument("--apercu", action="store_true")
    ap.add_argument("--gris", action="store_true", help="rendu argile en niveaux de gris, rapide")
    ap.add_argument("--rapide", action="store_true", help="540 × 960, 12 i/s interpolées à 24 : ≈ 15 min par vidéo")
    ap.add_argument("--debut", type=int, default=1)
    ap.add_argument("--fin", type=int)
    ap.add_argument("--echantillons", type=int)
    ap.add_argument("--blend", action="store_true", help="enregistre seulement la scène .blend")
    a = ap.parse_args(argv)
    if a.blend:
        construire(a.parfum)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(R.ROOT, "videos", a.parfum + ".blend"))
    else:
        d = rendre(a.parfum, a.apercu, a.debut, a.fin, a.echantillons, a.gris, a.rapide)
        suffixe = suffixe_video(a.apercu, a.gris)
        monter(d, os.path.join(R.ROOT, "videos", f"{a.parfum}{suffixe}.mp4"))
        print("video", os.path.join(R.ROOT, "videos", f"{a.parfum}{suffixe}.mp4"))
