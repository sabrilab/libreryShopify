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
        (lambda: poire_fendue(0), (-50, 75, 78), (0, 0, 0)),
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
# Point d'attraction au dos du flacon, à mi-hauteur : à la fin, les
# ingrédients s'y resserrent comme si le parfum les attirait.
ATTRACTEUR = (0.0, 78.0, 72.0)
RESSERREMENT = 0.8          # les positions finales se rapprochent du point de ce facteur
PHI = (1 + 5 ** 0.5) / 2
# Grappe finale : 8 ingrédients (Fibonacci) seulement, les plus évocateurs ;
# les autres s'éloignent doucement hors du cadre pendant le recul.
FINALE = {
    "vanilla-plum": [3, 4, 5, 0, 1, 7, 9, 11],        # demi-prune, 2 prunes, 2 gousses, cannelle, orchidée, graines
    "magnetic-flowers": [0, 1, 2, 3, 4, 6, 8, 9],     # poire fendue, poire, jasmin, tubéreuse, oranger, sauge, pétales
    "tonka-love": [0, 1, 2, 5, 6, 4, 11, 9],          # 3 fèves, 2 amandes, ambre, zeste, copeau
}
ARRIVEE = 3.54              # durée de l'attraction (s) : 15 / φ³ ; départ à 15 / φ ≈ 9,27 s moins le recul
DEBUT_ATTRACTION = 9.0
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
        # Cascade d'arrivée en suite de Weyl du nombre d'or : délais bien
        # répartis, jamais groupés.
        self.retard = ((i * PHI) % 1.0) * 0.9
        self.vr = self.vr / PHI                  # tournoiement plus calme
        self.part = False                        # quitte le cadre à la fin
        if ob.get("fendue"):
            # Poire qui se fend : on la garde de face pour que la caméra voie
            # la chair quand elle s'ouvre.
            self.r0 = Vector((0.0, 0.0, 0.0))
            self.vr = Vector((0.0, 0.0, 0.10))
            self.amp *= 0.5

    def danse(self, t):
        tour = 0.22 * t                          # la constellation tourne lentement
        c = self.centre
        rc = Vector((c.x * math.cos(tour) - (c.y - 0.03) * math.sin(tour),
                     0.03 + c.x * math.sin(tour) + (c.y - 0.03) * math.cos(tour), c.z))
        off = Vector(tuple(self.amp[k] * math.sin(self.w[k] * t + self.ph[k]) for k in range(3)))
        if self.flacon:
            return Vector((0, 0, 0.03)) + off * 0.4, Vector((0.25 * math.sin(0.5 * t), 0.2 * math.sin(0.4 * t + 1), 0.55 * t))
        return rc + off, self.r0 + self.vr * t

    decalages = None                             # {image: Vector} calculé par eviter_contacts()

    def pose(self, t):
        p, r = self.pose_brute(t)
        if self.decalages:
            f = min(max(int(round(t * FPS)) + 1, 1), int(DUREE * FPS))
            p = p + self.decalages.get(f, Vector())
        return p, r

    def pose_brute(self, t):
        p_d, r_d = self.danse(t)
        debut = DEBUT_ATTRACTION + (0 if self.flacon else self.retard)
        k = lisse((t - debut) / 2.4)
        A = Vector(ATTRACTEUR) * MM
        if self.flacon:
            flot = Vector((0, 0, 1.2 * MM * math.sin(1.2 * t + self.ph.x)))
            tours = round(r_d.z / (2 * math.pi)) * 2 * math.pi     # finit de face
            return p_d.lerp(self.fp + flot, k), r_d.lerp(Vector((0, 0, tours)), k)
        u = max(0.0, min(1.0, (t - debut) / ARRIVEE))
        if self.part:
            # Les ingrédients en trop s'éloignent en glissant hors du cadre,
            # sans hâte (accélération douce), en continuant leur danse.
            dehors = p_d - A
            dehors.y = 0.0
            if dehors.length < 1e-6:
                dehors = Vector((1, 0, 0))
            return p_d + dehors.normalized() * 0.45 * u ** PHI, r_d
        # Attraction : départ vif puis longue décélération (courbe en φ²),
        # léger enroulement autour du point d'attraction, pose sans secousse.
        ka = 1 - (1 - u) ** (PHI * PHI)
        vers_a = (A - self.fp).normalized() if (A - self.fp).length > 1e-6 else Vector()
        flot = Vector((0, 0, 0.8 * MM * math.sin(1.2 * t / PHI + self.ph.x))) \
            + vers_a * 1.0 * MM * (0.5 + 0.5 * math.sin(t / PHI + self.ph.z))
        p = p_d.lerp(self.fp + flot, ka)
        rel = p - A
        th = (1 / PHI) * (1 - ka) ** 2 * (1 if self.ph.y > 3.14 else -1) * (u > 0)
        c, s_ = math.cos(th), math.sin(th)
        rel = Vector((rel.x * c - rel.z * s_, rel.y, rel.x * s_ + rel.z * c))
        # Rotation : on ramène l'angle dansé au plus près de l'angle final
        # (au plus un demi-tour par axe), pour qu'il se pose sans pirouettes.
        r_f = self.fr + Vector((0.015 * math.sin(0.9 * t / PHI + self.ph.y), 0, 0.02 * math.sin(0.7 * t / PHI)))
        r_proche = Vector(tuple(r_f[j] + ((r_d[j] - r_f[j] + math.pi) % (2 * math.pi) - math.pi) for j in range(3)))
        return A + rel, r_proche.lerp(r_f, ka)


# ---------------------------------------------------------------- caméra
def catmull(p0, p1, p2, p3, u):
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u
                  + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)


# Ingrédients vedettes de chaque parfum : (indice dans la recette, distance
# caméra en mm). Ce sont eux qu'on voit en gros plan avant le reveal.
VEDETTES = {
    "tonka-love": [(0, 95), (11, 120), (8, 105)],          # fève, zeste, ambre
    "magnetic-flowers": [(0, 150), (2, 120), (4, 110)],    # demi-poire, jasmin, fleur d'oranger
    "vanilla-plum": [(3, 120), (0, 140), (9, 110)],        # demi-prune, gousse, orchidée
}
REVEAL = 15 / ((1 + 5 ** 0.5) / 2)       # début du dernier plan : on recule et le flacon se révèle


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

    capsules = {id(d): capsule_locale(d.ob) for d in ing}

    def hors_des_objets(cam, t, marge=15 * MM):
        """Garde la caméra à `marge` de tout ingrédient (hors frôlement)."""
        for _ in range(3):
            for d in ing:
                a, b, r = capsules[id(d)]
                p, rot = d.pose(t)
                M = Matrix.Translation(p) @ Euler(tuple(rot)).to_matrix().to_4x4() @ Matrix.Diagonal((*d.ob.scale, 1.0))
                pa, pb = M @ a, M @ b
                q, _ = segments_proches(cam, cam, pa, pb)
                proche = _
                v = cam - proche
                lim = r * d.ob.scale.x + marge
                if v.length < lim:
                    cam = proche + (v.normalized() if v.length > 1e-6 else Vector((0, -1, 0))) * lim
        return cam

    def plan_fpv(k, azim, elev_fin, frole=1 / PHI ** 2):
        """Plan « drone FPV » : départ au ras de la peau de l'ingrédient (à
        2,5 mm, grand-angle, mise au point à 14 mm : on ne voit que sa
        texture), glisse le long de la surface, puis remonte en prenant de la
        hauteur et recule pour le révéler en entier. Frôlement sur 1/φ² du
        plan, révélation sur le reste ; l'orbite tourne de 137,5°/φ² (angle
        d'or) et l'ouverture passe de f/2,8 à f/2,8·φ²."""
        i, dist = VEDETTES[handle][k]
        d = ing[i % len(ing)]
        memo = {}

        def maille(t):
            p, r = d.pose(t)
            M = Matrix.Translation(p) @ Euler(tuple(r)).to_matrix().to_4x4() @ Matrix.Diagonal((*d.ob.scale, 1.0))
            ob = d.ob
            if ob.type == "EMPTY":                     # poire fendue : la moitié A
                ob = next(c for c in ob.children if c.name.endswith("_A"))
                M = M @ ob.matrix_basis
            return ob, M, p

        def peau(t):
            ob, M, centre = maille(t)
            if "v" not in memo:
                a = math.radians(azim)
                vers_cam = Vector((math.sin(a), -math.cos(a), 0.15)).normalized()
                dl = (M.to_3x3().inverted() @ vers_cam).normalized()
                # Seulement la « peau » : pétales, écorce, chair… jamais une
                # tige, une feuille, une étamine ou un pédoncule.
                exclus = ("tige", "queue", "feuille", "filet", "pistil", "calice", "anthere",
                          "pedoncule", "coeur", "trait", "pepin", "sauge")
                mats = ob.data.materials
                ok = set()
                for poly in ob.data.polygons:
                    nom = mats[poly.material_index].name if poly.material_index < len(mats) else ""
                    if not nom.startswith(exclus) and "chair" not in nom:
                        ok.update(poly.vertices)
                cands = [ob.data.vertices[k] for k in ok] or list(ob.data.vertices)
                memo["v"] = max(cands, key=lambda v: v.co.dot(dl)).index
            v = ob.data.vertices[memo["v"]]
            S = M @ v.co
            n = (M.to_3x3().inverted().transposed() @ v.normal).normalized()
            tan = n.cross(Vector((0, 0, 1)))
            if tan.length < 0.2:
                tan = n.cross(Vector((1, 0, 0)))
            return S, n, tan.normalized(), centre

        course = 18 * MM

        def f(t, t0, t1):
            u = (t - t0) / (t1 - t0)
            S, n, tan, centre = peau(t)
            # Au ras de la peau (5 → 8 mm), regard plongeant ≈ 40° : la
            # texture remplit l'image, la netteté court sur la surface.
            haut = lambda x: (9.0 + 4.0 * x) * MM
            vise = lambda x: S + tan * (course * (x - 0.5) + 5 * MM) - n * 0.5 * MM
            if u <= frole:
                x = u / frole
                cam = S + n * haut(x) + tan * course * (x - 0.5)
                return cam, vise(x), 11.0, 40.0
            # Remontée et recul : distance en progression géométrique
            # (vitesse apparente constante, pas d'effet d'aspiration), direction
            # interpolée sur la sphère, départ et arrivée en douceur.
            x = (u - frole) / (1 - frole)
            e = lisse(x)
            cam0 = S + n * haut(1) + tan * course * 0.5
            cib0 = vise(1)
            dS = S - centre
            a_s = math.degrees(math.atan2(dS.x, -dS.y))
            # Le recul reste du côté de la caméra (face au décor) : jamais
            # derrière l'ingrédient, où se trouve le mur du fond.
            a1 = (a_s + 137.5 / PHI ** 2 + 180) % 360 - 180
            a1 = max(-75.0, min(75.0, a1))
            cam1 = orbite(centre, dist, a1, elev_fin)
            v0, v1 = cam0 - centre, cam1 - centre
            r0, r1 = max(v0.length, 1e-4), v1.length
            r = r0 * (r1 / r0) ** e
            d = v0.normalized().slerp(v1.normalized(), e) if v0.normalized().dot(v1.normalized()) > -0.99 \
                else v0.normalized().lerp(v1.normalized(), e).normalized()
            cam = centre + d * r + Vector((0, 0, 1)) * math.sin(math.pi * e) * 0.18 * r   # reprend de la hauteur
            cam.y = min(cam.y, 0.19)                # le mur du fond est à y = 0,22 m
            cam = hors_des_objets(cam, t)
            cib = cib0.lerp(centre, lisse(min(1.0, x * PHI)))
            return cam, cib, 11.0 - 6.0 * e, 40.0 + 10.0 * e
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
        # Plan final : flacon centré dans le 9:16 (visée à mi-hauteur,
        # 67,6 mm) et plus serré (≈ 45 % de la hauteur du cadre à 85 mm).
        cam1 = Vector((0.0, -0.425, 0.074)).lerp(Vector((0.0, -0.40, 0.072)), lisse((t - t0 - 3.8) / 3.2))
        cib1 = Vector((0, 0.0, 0.0676))
        return cam0.lerp(cam1, k), cib0.lerp(cib1, k), 22.0 - 15.7 * k, 60.0 + 25.0 * k

    # Découpage en nombre d'or : reveal à 15/φ = 9,27 s ; plans FPV de
    # 2,19 s (15/φ⁴·…), détails du flacon de 1,35 s, dernier plan de 0,84 s.
    # Plan d'ouverture plus long (15/φ⁴·φ² = 3,54 s) pour que la remontée
    # depuis la peau se lise ; le plan du socle, peu lisible, disparaît.
    return [
        (0.00, 3.54, plan_fpv(0, -30, 26)),
        (3.54, 4.89, capot),
        (4.89, 7.08, plan_fpv(1, 25, 21)),
        (7.08, 8.43, plan_fpv(2, -15, 30, frole=1 / PHI)),
        (8.43, REVEAL, etiquette),
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


def taille(ob):
    """Dimensions d'un objet, ou de ses enfants pour un vide (poire fendue)."""
    if ob.type == "EMPTY":
        dims = [Vector(c.dimensions) for c in ob.children]
        return Vector(tuple(max(d[k] for d in dims) for k in range(3))) * ob.scale.x if dims else Vector((0.01,) * 3)
    return Vector(ob.dimensions)


def resserrer(danseurs):
    """Rapproche les positions finales du point d'attraction, puis écarte
    les ingrédients qui se chevaucheraient (surtout en profondeur, pour
    garder une grappe dense vue de face)."""
    A = Vector(ATTRACTEUR) * MM
    bpy.context.view_layer.update()
    rayons = []
    # La grappe est d'abord recentrée sur le point d'attraction (en largeur
    # et en hauteur) : certaines recettes plaçaient tout au-dessus du flacon.
    moy = sum((d.fp - A for d in danseurs), Vector()) / len(danseurs)
    moy.y = 0.0
    for d in danseurs:
        dims = sorted(taille(d.ob))
        rayons.append(0.32 * dims[2] + 0.25 * dims[1])
        rel = d.fp - A - moy
        d.fp = A + Vector((rel.x * RESSERREMENT, rel.y * 0.8, rel.z * RESSERREMENT))
    for _ in range(60):
        for i, a in enumerate(danseurs):
            for j in range(i + 1, len(danseurs)):
                b = danseurs[j]
                v = b.fp - a.fp
                mini = 0.8 * (rayons[i] + rayons[j])
                if v.length < mini:
                    if v.length < 1e-6:
                        v = Vector((0.001, 0.001, 0.0))
                    pousse = v.normalized() * (mini - v.length) * 0.5
                    pousse.y *= 1.6                      # s'étager en profondeur plutôt que s'étaler
                    a.fp -= pousse
                    b.fp += pousse
        for d in danseurs:                               # jamais devant le dos du flacon
            d.fp.y = max(d.fp.y, 0.045)


def capsule_locale(ob):
    """Volume de collision d'un ingrédient : une capsule (segment + rayon)
    le long de son axe le plus long, en coordonnées locales (mm → m déjà)."""
    if ob.type == "EMPTY":
        pts = [c.matrix_basis @ Vector(b) for c in ob.children for b in c.bound_box]
        marge = 7 * MM                           # la poire s'ouvre : un peu plus large
    else:
        pts = [Vector(b) for b in ob.bound_box]
        marge = 0.0
    lo = Vector(tuple(min(q[k] for q in pts) for k in range(3)))
    hi = Vector(tuple(max(q[k] for q in pts) for k in range(3)))
    dims = hi - lo
    ordre = sorted(range(3), key=lambda k: dims[k])
    grand, moyen = ordre[2], ordre[1]
    r = 0.5 * dims[moyen] * 0.8 + marge
    demi = max(0.0, 0.5 * dims[grand] - r)
    c = (lo + hi) / 2
    axe = Vector((0, 0, 0))
    axe[grand] = 1.0
    return c - axe * demi, c + axe * demi, r


def segments_proches(p1, q1, p2, q2):
    """Points les plus proches entre deux segments [p1,q1] et [p2,q2]."""
    d1, d2, r = q1 - p1, q2 - p2, p1 - p2
    a, e, f = d1.dot(d1), d2.dot(d2), d2.dot(r)
    if a < 1e-12 and e < 1e-12:
        return p1, p2
    if a < 1e-12:
        s, t = 0.0, max(0.0, min(1.0, f / e))
    else:
        c = d1.dot(r)
        if e < 1e-12:
            t, s = 0.0, max(0.0, min(1.0, -c / a))
        else:
            b = d1.dot(d2)
            den = a * e - b * b
            s = max(0.0, min(1.0, (b * f - c * e) / den)) if den > 1e-12 else 0.0
            t = (b * s + f) / e
            if t < 0:
                t, s = 0.0, max(0.0, min(1.0, -c / a))
            elif t > 1:
                t, s = 1.0, max(0.0, min(1.0, (b - c) / a))
    return p1 + d1 * s, p2 + d2 * t


def eviter_contacts(danseurs, flacon_d):
    """Les ingrédients ne se traversent jamais, ni le flacon : image par
    image, quand deux capsules s'interpénètrent, on écarte les objets le
    long de la ligne de contact. Le décalage est gardé d'une image à l'autre
    et se relâche doucement (×1/φ^(1/8) par image) : ils s'effleurent, se
    poussent, puis reprennent leur trajectoire, sans à-coups."""
    ing = [d for d in danseurs if not d.flacon]
    caps = []
    for d in ing:
        a, b, r = capsule_locale(d.ob)
        caps.append((a, b, r * d.ob.scale.x))
    relache = PHI ** (-1 / 8)
    dec = [Vector() for _ in ing]
    for d in ing:
        d.decalages = {}
    for f in range(1, int(DUREE * FPS) + 1):
        t = (f - 1) / FPS
        poses = []
        for d, (a, b, r) in zip(ing, caps):
            p, rot = d.pose_brute(t)
            M = Matrix.Translation(p) @ Euler(tuple(rot)).to_matrix().to_4x4() @ Matrix.Diagonal((*d.ob.scale, 1.0))
            poses.append((M @ a, M @ b, r))
        mf = repere_flacon(flacon_d, t)
        fa, fb, fr = mf @ Vector((0, 0, 0.012)), mf @ Vector((0, 0, 0.128)), 0.030
        dec = [v * relache for v in dec]
        for _ in range(4):
            for i in range(len(ing)):
                ai, bi, ri = poses[i]
                ai, bi = ai + dec[i], bi + dec[i]
                # contre le flacon (immobile)
                pi, pf = segments_proches(ai, bi, fa, fb)
                v = pi - pf
                if v.length < ri + fr:
                    n = v.normalized() if v.length > 1e-6 else Vector((0, 1, 0))
                    dec[i] += n * (ri + fr - v.length)
                for j in range(i + 1, len(ing)):
                    aj, bj, rj = poses[j]
                    aj, bj = aj + dec[j], bj + dec[j]
                    pi, pj = segments_proches(ai, bi, aj, bj)
                    v = pi - pj
                    if v.length < ri + rj:
                        n = v.normalized() if v.length > 1e-6 else Vector((0, 1, 0))
                        pousse = n * (ri + rj - v.length) * 0.5
                        dec[i] += pousse
                        dec[j] -= pousse
        for d, v in zip(ing, dec):
            d.decalages[f] = v.copy()


def ouvrir_poire(vide, t, f):
    """La poire se fissure (léger entrebâillement à 0,38 s), puis s'ouvre
    en deux comme un livre et montre sa chair blanche (de 0,62 à 1,62 s :
    temps et angles en proportions φ)."""
    # Plan de 3,54 s : la caméra frôle la peau jusqu'à 1,35 s (3,54/φ²),
    # la fissure s'ouvre à 1,35 s, la poire s'ouvre de 1,75 à 3,1 s.
    u = 0.146 * lisse((t - 1.35) / 0.382) + 0.854 * lisse((t - 1.75) / 1.35)
    for enfant in vide.children:
        cote = -1 if enfant.name.endswith("_A") else 1
        enfant.location = (cote * 7.0 * MM * u, -3.0 * MM * u, 0)
        # Chaque moitié pivote vers la caméra (−Y) de 34° (Fibonacci), et
        # s'écarte un peu en haut.
        enfant.rotation_euler = (0, cote * -0.06 * u, cote * math.radians(34) * u)
        enfant.keyframe_insert("location", frame=f)
        enfant.keyframe_insert("rotation_euler", frame=f)


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
    garde = FINALE.get(handle, range(len(danseurs)))
    for i, d in enumerate(danseurs):
        d.part = i not in garde
    resserrer([d for d in danseurs if not d.part])
    fl = Danseur(racine, (0, 0, 0), (0, 0, 0), 99, 1, flacon=True)
    danseurs.append(fl)
    eviter_contacts(danseurs, fl)
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
        for d in danseurs:
            if d.ob.get("fendue"):
                ouvrir_poire(d.ob, t, f)
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
        # réduits ; les 24 images par seconde sont calculées.
        c = s.cycles
        c.max_bounces, c.transmission_bounces, c.glossy_bounces, c.diffuse_bounces = 6, 6, 2, 1
        c.use_adaptive_sampling = True
        c.adaptive_threshold = 0.1
        s.frame_step = 1                     # 24 images réelles : plus d'interpolation
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
