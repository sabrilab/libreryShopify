"""Ingrédients des vidéos Skin Obsession, modélisés d'après nature.

Chaque ingrédient est une surface paramétrique (corps balayé le long d'un
chemin, lame pour pétales et feuilles, tour pour les fruits) : on règle la
silhouette réelle, la section, puis le détail qui le rend reconnaissable
(rides longitudinales de la fève tonka et de la gousse, sillon de la prune,
nervures gaufrées de la sauge, écorce roulée de la cannelle…). Tailles en
mm, à l'échelle réelle.
"""
import math
import random

import bpy
import bmesh
from mathutils import Vector, noise

import geometrie as G
import rendu as R

MM = G.MM
lin = R.lin
TAU = 2 * math.pi


# ------------------------------------------------------------ matières
def mat(name, color, rough=0.5, metal=0.0, trans=0.0, ior=1.45, sss=0.0, sheen=0.0, coat=0.0):
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
    if sheen:
        b.inputs["Sheen Weight"].default_value = sheen
    if coat:
        b.inputs["Coat Weight"].default_value = coat
    return m


def mat_texture(name, c1, c2, rough=0.5, echelle=300.0, seuil=(0.55, 0.6), sss=0.0,
                type_tex="NOISE", ondes=None, sens="Y"):
    """Deux couleurs mêlées par une texture : mouchetures (bruit seuillé) ou
    veines (ondes). La couleur de base par défaut reste c1 (lue par le rendu
    argile)."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = mat(name, c1, rough, sss=sss)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    co = nt.nodes.new("ShaderNodeTexCoord")
    if type_tex == "WAVE":
        t = nt.nodes.new("ShaderNodeTexWave")
        t.inputs["Scale"].default_value = echelle
        t.inputs["Distortion"].default_value = ondes or 6.0
        t.inputs["Detail"].default_value = 3.0
        t.bands_direction = sens
    else:
        t = nt.nodes.new("ShaderNodeTexNoise")
        t.inputs["Scale"].default_value = echelle
        t.inputs["Detail"].default_value = 2.0
    nt.links.new(co.outputs["Object"], t.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position = seuil[0]
    r.color_ramp.elements[1].position = seuil[1]
    r.color_ramp.elements[0].color = (*lin(c1), 1)
    r.color_ramp.elements[1].color = (*lin(c2), 1)
    nt.links.new(t.outputs["Fac"], r.inputs["Fac"])
    nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    return m


def mat_radial(name, centre, bord, rayon_mm, rough=0.3, sss=0.3, peau=None):
    """Chair de fruit : couleur qui passe du cœur (centre) à la peau (bord)."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = mat(name, bord, rough, sss=sss)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    co = nt.nodes.new("ShaderNodeTexCoord")
    ln = nt.nodes.new("ShaderNodeVectorMath")
    ln.operation = "LENGTH"
    nt.links.new(co.outputs["Object"], ln.inputs[0])
    dv = nt.nodes.new("ShaderNodeMath")
    dv.operation = "DIVIDE"
    dv.inputs[1].default_value = rayon_mm * MM
    nt.links.new(ln.outputs["Value"], dv.inputs[0])
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position = 0.25
    r.color_ramp.elements[0].color = (*lin(centre), 1)
    r.color_ramp.elements[1].position = 0.9
    r.color_ramp.elements[1].color = (*lin(bord), 1)
    if peau:
        e = r.color_ramp.elements.new(0.97)
        e.color = (*lin(peau), 1)
    nt.links.new(dv.outputs["Value"], r.inputs["Fac"])
    nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    return m


# ------------------------------------------------------------ outils
def assign(ob, m):
    ob.data.materials.clear()
    ob.data.materials.append(m)


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def appliquer(ob, loc=True, rot=True, scale=True):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=loc, rotation=rot, scale=scale)
    return ob


def placer(ob, loc=(0, 0, 0), rot=(0, 0, 0)):
    ob.location = Vector(loc) * MM
    ob.rotation_euler = rot
    return appliquer(ob)


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


def modifs(ob, epaisseur=None, subsurf=0, offset=-1.0, mat_coque=0, mat_bord=0):
    if epaisseur:
        s = ob.modifiers.new("ep", "SOLIDIFY")
        s.thickness = epaisseur * MM
        s.offset = offset
        s.material_offset = mat_coque
        s.material_offset_rim = mat_bord
        s.use_even_offset = True
    if subsurf:
        d = ob.modifiers.new("sub", "SUBSURF")
        d.levels = d.render_levels = subsurf
    G.apply_all(ob)
    smooth(ob)
    return ob


def bruit(x, y, z, graine=0.0):
    return noise.noise(Vector((x + graine * 17.3, y - graine * 5.1, z + graine * 3.7)))


def organique(ob, amp_mm, periode_mm, graine=0.0):
    """Déforme l'objet par un champ de bruit lent (courbures, torsions,
    irrégularités de nature) : rien n'est parfaitement droit ni symétrique."""
    me = ob.data
    f = 1.0 / (periode_mm * MM)
    off = Vector((graine * 3.1, graine * 7.7, graine * 1.3))
    for v in me.vertices:
        d = noise.noise_vector(v.co * f + off)
        v.co += d * amp_mm * MM
    me.update()
    return ob


def sillon(v, largeur):
    """1 au fond d'un sillon (v ≈ 0), 0 ailleurs."""
    return math.exp(-(v * v) / (largeur * largeur))


def maillage(name, rangs, cyclique=True, pole_debut=None, pole_fin=None):
    """Maillage à partir d'une grille de points (mm) : rangs le long de
    l'objet, points autour (cyclique) ou en travers."""
    bm = bmesh.new()
    V = [[bm.verts.new(Vector(p) * MM) for p in r] for r in rangs]
    n = len(rangs[0])
    m = n if cyclique else n - 1
    for i in range(len(V) - 1):
        for j in range(m):
            j2 = (j + 1) % n
            bm.faces.new((V[i][j], V[i][j2], V[i + 1][j2], V[i + 1][j]))
    if pole_debut is not None:
        p = bm.verts.new(Vector(pole_debut) * MM)
        for j in range(m):
            bm.faces.new((p, V[0][(j + 1) % n], V[0][j]))
    if pole_fin is not None:
        p = bm.verts.new(Vector(pole_fin) * MM)
        for j in range(m):
            bm.faces.new((V[-1][j], V[-1][(j + 1) % n], p))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = G.mesh_object(name, bm)
    smooth(ob)
    return ob


def balayage(name, chemin, largeur, epaisseur, nt=80, na=24, rayon=None, torsion=None, carre=2.0):
    """Corps balayé le long d'un chemin (fonction t → point en mm), avec des
    repères transportés parallèlement. largeur/epaisseur(t) : demi-axes de
    la section ; rayon(t, a) : facteur radial (rides) ; carre > 2 : section
    plus carrée (superellipse)."""
    pts = [Vector(chemin(i / nt)) for i in range(nt + 1)]
    T = [(pts[min(i + 1, nt)] - pts[max(i - 1, 0)]).normalized() for i in range(nt + 1)]
    up = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    N = (up - T[0] * up.dot(T[0])).normalized()
    reperes = []
    for i in range(nt + 1):
        if i:
            N = T[i - 1].rotation_difference(T[i]) @ N
            N = (N - T[i] * N.dot(T[i])).normalized()
        reperes.append((N.copy(), T[i].cross(N)))
    e = 2.0 / carre
    rangs = []
    for i in range(1, nt):
        t = i / nt
        w, h = largeur(t), epaisseur(t)
        tw = torsion(t) if torsion else 0.0
        ct, st = math.cos(tw), math.sin(tw)
        Ni, Bi = reperes[i]
        rang = []
        for j in range(na):
            a = TAU * j / na
            c, s = math.cos(a), math.sin(a)
            y = w * math.copysign(abs(c) ** e, c)
            z = h * math.copysign(abs(s) ** e, s)
            f = rayon(t, a) if rayon else 1.0
            y, z = (y * ct - z * st) * f, (y * st + z * ct) * f
            rang.append(pts[i] + Ni * y + Bi * z)
        rangs.append(rang)
    return maillage(name, rangs, True, pts[0], pts[nt])


def tour(name, profil, na=48, rayon=None, centre=None):
    """Solide de révolution autour de z. profil : liste de (r, z) de bas en
    haut, r = 0 aux deux bouts ; rayon(t, a) : facteur (bosses, sillon) ;
    centre(z) : décalage (x, y) de l'axe."""
    rangs = []
    n = len(profil)
    for i in range(1, n - 1):
        r, z = profil[i]
        t = i / (n - 1)
        cx, cy = centre(z) if centre else (0, 0)
        rang = []
        for j in range(na):
            a = TAU * j / na
            f = rayon(t, a) if rayon else 1.0
            rang.append((cx + r * f * math.cos(a), cy + r * f * math.sin(a), z))
        rangs.append(rang)
    c0 = centre(profil[0][1]) if centre else (0, 0)
    c1 = centre(profil[-1][1]) if centre else (0, 0)
    return maillage(name, rangs, True, (c0[0], c0[1], profil[0][1]), (c1[0], c1[1], profil[-1][1]))


def lisser_profil(points, par_segment=8):
    """Catmull-Rom à travers des points (r, z)."""
    P = [Vector(p) for p in points]
    out = []
    for i in range(len(P) - 1):
        p0, p1, p2 = P[max(i - 1, 0)], P[i], P[i + 1]
        p3 = P[min(i + 2, len(P) - 1)]
        for k in range(par_segment):
            u = k / par_segment
            q = 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u
                       + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
            out.append((max(0.0, q.x), q.y))
    out.append(tuple(P[-1]))
    return out


def lame(name, L, W, contour, creux=0.0, courbe=0.0, torsion=0.0, relief=None,
         nu=30, nv=14, pli=0.0):
    """Lame fine le long de +x (pétale, feuille, ruban), normale vers +z.
    contour(u) : demi-largeur relative ; creux : bords relevés (mm) ;
    courbe : angle total de cambrure (rad, > 0 vers +z) ; torsion (rad) ;
    relief(u, v) : hauteur ajoutée (mm) ; pli : pliure le long de la nervure."""
    rangs = []
    for i in range(nu + 1):
        u = i / nu
        hw = W / 2 * contour(u)
        rang = []
        for j in range(nv + 1):
            v = -1 + 2 * j / nv
            x, y = u * L, v * hw
            z = creux * v * v * contour(u) + pli * abs(v) * hw
            if relief:
                z += relief(u, v)
            c, s = math.cos(torsion * u), math.sin(torsion * u)
            y, z = y * c - z * s, y * s + z * c
            if courbe:
                Rr = L / courbe
                th = x / Rr
                x, z = (Rr - z) * math.sin(th), Rr - (Rr - z) * math.cos(th)
            rang.append((x, y, z))
        rangs.append(rang)
    return maillage(name, rangs, cyclique=False)


def tige(name, pts, r0, r1=None, m=None, na=10):
    """Tige effilée passant par des points (mm)."""
    P = [Vector(p) for p in pts]

    def chemin(t):
        k = t * (len(P) - 1)
        i = min(int(k), len(P) - 2)
        u = k - i
        p0, p1, p2 = P[max(i - 1, 0)], P[i], P[i + 1]
        p3 = P[min(i + 2, len(P) - 1)]
        return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u
                      + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
    r1 = r0 if r1 is None else r1

    def rr(t):
        return (r0 + (r1 - r0) * t) * min(1.0, 0.35 + 6 * min(t, 1 - t)) ** 0.3
    ob = balayage(name, chemin, rr, rr, nt=max(12, 6 * len(P)), na=na)
    if m:
        assign(ob, m)
    return ob


# ------------------------------------------------------ pétales et fleurs
def contour_ovale(pointe=0.6, base=0.5):
    """Contour de pétale / feuille : base étroite, bout arrondi ou pointu."""
    def c(u):
        if u <= 0 or u >= 1:
            return 0.0
        return (u ** base) * ((1 - u) ** pointe) / ((base / (base + pointe)) ** base * (pointe / (base + pointe)) ** pointe)
    return c


def fleur(name, n, L, W, m, contour, ouverture=1.3, courbe=0.0, creux=1.0, torsion=0.0,
          tube=None, m_tube=None, graine=0, ep=0.3, decalage=0.0):
    """Fleur tournée vers +z : n pétales (lames) au bout d'un tube.
    ouverture : angle pétale / axe (π/2 = à plat, plus = réfléchi)."""
    rnd = random.Random(graine)
    parts = []
    z0 = tube[0] if tube else 0.0
    r0 = tube[1] * 0.7 if tube else 0.6
    for k in range(n):
        pe = lame(f"{name}_p{k}", L * rnd.uniform(0.94, 1.06), W * rnd.uniform(0.93, 1.07), contour,
                  creux=creux, courbe=courbe + rnd.uniform(-0.12, 0.12), torsion=torsion,
                  relief=lambda u, v, g=rnd.random() * 10: 0.25 * bruit(u * 3, v * 2, g) * u)
        modifs(pe, ep, 1)
        assign(pe, m)
        beta = -(math.pi / 2 - ouverture) + rnd.uniform(-0.1, 0.1)
        az = TAU * k / n + decalage + rnd.uniform(-0.08, 0.08)
        pe.location = (0, 0, 0)
        pe.rotation_euler = (0, beta, 0)
        appliquer(pe)
        pe.location = (r0 * math.cos(az) * MM, r0 * math.sin(az) * MM, z0 * MM)
        pe.rotation_euler = (0, 0, az)
        appliquer(pe)
        parts.append(pe)
    if tube:
        tb = tige(f"{name}_tube", [(0, 0, 0), (0, 0, tube[0] * 0.5), (0, 0, tube[0] + 0.3)],
                  tube[1] * 0.55, tube[1], m_tube or m)
        parts.append(tb)
    return joindre(name, parts)


def bouton(name, L, r, m, pointe=0.8):
    prof = lisser_profil([(0, 0), (r * 0.6, L * 0.08), (r, L * 0.35), (r * 0.85, L * 0.7),
                          (r * 0.35 * pointe + 0.2, L * 0.93), (0, L)], 5)
    ob = tour(name, prof, 16)
    assign(ob, m)
    return ob


def etamines(name, n, longueur, rayon, m_filet, m_anthere, graine=0):
    rnd = random.Random(graine)
    parts = []
    for k in range(n):
        a = TAU * k / n + rnd.uniform(-0.2, 0.2)
        ev = rnd.uniform(0.25, 0.55)
        L = longueur * rnd.uniform(0.85, 1.1)
        p1 = (rayon * math.cos(a), rayon * math.sin(a), 0)
        p2 = (p1[0] + L * math.sin(ev) * math.cos(a), p1[1] + L * math.sin(ev) * math.sin(a), L * math.cos(ev))
        f = tige(f"{name}_f{k}", [p1, ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, p2[2] * 0.55), p2], 0.18, 0.12, m_filet, na=6)
        an = bouton(f"{name}_a{k}", 1.6, 0.45, m_anthere)
        an.location = Vector(p2) * MM
        an.rotation_euler = (0, ev, a)
        appliquer(an)
        parts += [f, an]
    return joindre(name, parts)


# ------------------------------------------------------ Tonka Love
def feve_tonka(i):
    """Fève tonka : amande allongée (≈ 34 × 11 × 8 mm), un peu arquée, noire,
    creusée de rides profondes dans le sens de la longueur."""
    g = 3.1 * i + 0.7
    L, W, H = 34.0, 5.6, 3.9

    def chemin(t):
        return (L * (t - 0.5), 2.0 * math.sin(math.pi * t), 0.6 * math.sin(TAU * t))

    def larg(t):
        return W * math.sin(math.pi * t) ** 0.55 * (1.06 - 0.14 * t)

    def ep(t):
        return H * math.sin(math.pi * t) ** 0.6 * (1.04 - 0.1 * t)

    def rides(t, a):
        n1 = bruit(math.cos(a) * 1.9, math.sin(a) * 1.9, t * 2.2, g)
        n2 = bruit(math.cos(a) * 4.5, math.sin(a) * 4.5, t * 5.0, g + 4)
        fin = bruit(math.cos(a) * 12, math.sin(a) * 12, t * 16, g + 9)
        return 1 - 0.14 * sillon(n1, 0.12) - 0.06 * sillon(n2, 0.1) + 0.012 * fin
    ob = balayage(f"tonka{i}", chemin, larg, ep, nt=70, na=80, rayon=rides)
    modifs(ob, subsurf=1)
    assign(ob, mat("feve", (0.085, 0.055, 0.042), 0.42, coat=0.15))
    return recentrer(ob)


def amande(i):
    """Amande avec sa peau : goutte aplatie (24 × 15 × 9 mm), pointe d'un
    côté, peau brune veinée en long."""
    g = 5.3 * i + 2.1
    L = 24.0
    forme = contour_ovale(pointe=0.75, base=0.42)

    def larg(t):
        return 7.4 * forme(t)

    def ep(t):
        return 4.3 * forme(t) ** 0.8

    def veines(t, a):
        n1 = bruit(math.cos(a) * 3, math.sin(a) * 3, t * 1.6, g)
        pores = bruit(math.cos(a) * 20, math.sin(a) * 20, t * 26, g + 3)
        return 1 - 0.035 * sillon(n1, 0.08) + 0.008 * pores

    ob = balayage(f"amande{i}", lambda t: (L * (t - 0.5), 0.9 * math.sin(math.pi * t), 0),
                  larg, ep, nt=50, na=48, rayon=veines)
    modifs(ob, subsurf=1)
    assign(ob, mat_texture("amande", (0.58, 0.36, 0.21), (0.51, 0.30, 0.17), 0.6,
                           echelle=220, seuil=(0.3, 0.75), type_tex="WAVE", ondes=1.5))
    return recentrer(ob)


def caramel(i):
    """Ruban d'ambre (résine) : une goutte qui s'enroule et s'effile,
    translucide et brillante."""
    def chemin(t):
        a = 1.75 * math.pi * t
        r = 13.0 * (1 - 0.55 * t)
        return (r * math.cos(a), r * math.sin(a), 16.0 * t - 5.0 * math.sin(math.pi * t))

    def larg(t):
        return 5.2 * math.sin(math.pi / 2 * min(1.0, t * 7)) ** 0.5 * (1 - t) ** 0.55 + 0.15

    def ep(t):
        return larg(t) * 0.5 + 0.1
    ob = balayage(f"caramel{i}", chemin, larg, ep, nt=110, na=28, torsion=lambda t: 0.7 * t)
    modifs(ob, subsurf=1)
    m = mat("ambre", (0.86, 0.44, 0.07), 0.04, trans=0.75, ior=1.54)
    assign(ob, m)
    return recentrer(organique(ob, 1.0, 18, graine=i + 10.6))


def ambre_pepite(i):
    """Morceau de résine d'ambre brute : galet irrégulier aux arêtes adoucies."""
    rnd = random.Random(40 + i)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=4, radius=1.0)
    g = rnd.uniform(0, 9)
    for v in bm.verts:
        d = v.co.normalized()
        f = 1 + 0.22 * bruit(d.x * 1.3, d.y * 1.3, d.z * 1.3, g) + 0.06 * bruit(d.x * 4, d.y * 4, d.z * 4, g + 2)
        v.co = Vector((d.x * 12, d.y * 9, d.z * 8)) * f * MM
    ob = G.mesh_object(f"ambre{i}", bm)
    smooth(ob)
    assign(ob, mat("ambre", (0.86, 0.44, 0.07), 0.04, trans=0.75, ior=1.54))
    return recentrer(ob)


def copeau(i):
    """Copeau de santal raboté : ruban de bois fin (13 mm) qui s'enroule sur
    lui-même en se resserrant, bords un peu déchirés, fibres en long."""
    g = 2.7 * i + 1.3
    nu, nv, W = 150, 12, 13.0
    rangs = []
    for k in range(nu + 1):
        s = k / nu
        th = 1.8 * TAU * s
        r = 12.0 * (1 - 0.55 * s) + 2.0
        bord = min(1.0, 14 * s, 14 * (1 - s)) ** 0.35
        rang = []
        for j in range(nv + 1):
            v = -1 + 2 * j / nv
            dechire = 1 + 0.1 * bruit(s * 30, v * 0.5, 0, g) * abs(v) ** 3
            y = v * W / 2 * bord * dechire + 7.0 * s
            fibres = 0.14 * bruit(v * 18, s * 1.5, 0, g + 2) + 0.35 * v * v
            rr = r + fibres
            rang.append((rr * math.cos(th), y, rr * math.sin(th)))
        rangs.append(rang)
    ob = maillage(f"copeau{i}", rangs, cyclique=False)
    ob.data.materials.append(mat_texture("bois", (0.74, 0.55, 0.36), (0.64, 0.46, 0.29), 0.7,
                                         echelle=160, seuil=(0.25, 0.75), type_tex="WAVE", ondes=1.2, sens="Z"))
    modifs(ob, 0.7, 1, offset=0.0)
    return recentrer(organique(ob, 0.8, 25, graine=i + 7.3))


def zeste(i):
    """Zeste d'agrume en spirale : ruban de peau de 13 mm, effilé aux bouts,
    écorce granuleuse dehors, ziste blanc dedans."""
    tours, R0, pas, W = 2.3, 14.0, 17.0, 13.0
    nu, nv = 160, 8
    g = 1.9 * i
    rangs = []
    for k in range(nu + 1):
        s = k / nu
        th = TAU * tours * s
        R_ = R0 * (1 + 0.12 * math.sin(math.pi * s))
        hw = W / 2 * math.sin(math.pi * s) ** 0.35
        rang = []
        for j in range(nv + 1):
            v = -1 + 2 * j / nv
            cup = -1.8 * v * v * (hw / (W / 2))            # bords qui s'enroulent vers l'intérieur
            pores = 0.18 * bruit(th * 6, v * 5, 0, g)
            r = R_ + cup + pores
            rang.append((r * math.cos(th), r * math.sin(th), pas * tours * s + v * hw))
        rangs.append(rang)
    ob = maillage(f"zeste{i}", rangs, cyclique=False)
    # normales vers l'extérieur de la spirale : l'écorce dehors
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    f0 = bm.faces[len(bm.faces) // 2]
    c = f0.calc_center_median()
    if f0.normal.dot(Vector((c.x, c.y, 0))) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.materials.append(mat_texture("zeste", (0.97, 0.68, 0.14), (0.93, 0.61, 0.11), 0.42,
                                         echelle=1400, seuil=(0.4, 0.6), sss=0.1))
    ob.data.materials.append(mat("ziste", (0.97, 0.94, 0.84), 0.6, sss=0.2))
    modifs(ob, 2.2, 1, offset=-1, mat_coque=1, mat_bord=1)
    return recentrer(organique(ob, 1.2, 30, graine=i + 6.1))


# ------------------------------------------------- Magnetic Flowers
def poire(i, moitie=False, queue=True, pepins=((-3.0, 19.0, 0.25), (2.6, 25.5, -0.35)), recentre=True):
    """Poire Williams : ventre rond, col élancé légèrement penché, œil (calice)
    en creux sous le fruit, queue ligneuse. La demi-poire montre sa chair,
    le cœur et deux pépins."""
    s = 1.0 if moitie else 0.74
    ctrl = [(0, 3.5), (6, 1.4), (15, 0.6), (24, 4.5), (30, 13), (31.5, 22), (29.5, 32), (24, 42),
            (18.5, 51), (15, 59), (12.8, 67), (10.6, 75), (7.4, 82), (3.2, 86.5), (0, 87.5)]
    prof = [(r * s, z * s) for r, z in lisser_profil(ctrl, 5)]
    g = 3.3 * i
    H = 87.5 * s

    def bosses(t, a):
        return 1 + 0.018 * bruit(math.cos(a) * 1.5, math.sin(a) * 1.5, t * 3, g) \
                 + 0.03 * math.cos(a) * math.sin(math.pi * t)

    ob = tour(f"poire{i}", prof, 56, rayon=bosses, centre=lambda z: (3.5 * s * (z / H) ** 2.2, 0))
    modifs(ob, subsurf=1)
    # Même Williams jaune-vert du début à la fin (entière ou coupée).
    peau = mat_texture("poire_williams", (0.78, 0.76, 0.32), (0.64, 0.58, 0.22),
                       0.45, echelle=700, seuil=(0.64, 0.68))
    assign(ob, peau)
    parts = []
    if moitie:
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                                     plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_outer=True)
        edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        faces = bmesh.ops.edgenet_fill(bm, edges=edges)["faces"]
        bmesh.ops.triangulate(bm, faces=faces)
        for f in bm.faces:
            if abs(f.normal.y) > 0.999 and f.calc_center_median().y > -1e-5:
                f.material_index = 1
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.materials.append(mat("poire_chair", (0.96, 0.90, 0.70), 0.3, sss=0.35))
        # Cœur (loge en cœur, un peu plus translucide) et pépins, posés sur la coupe.
        coeur = lame("poire_coeur", 22, 17, lambda u: math.sin(math.pi * u) ** 0.7 * (1.1 - 0.4 * u), nu=16, nv=10)
        assign(coeur, mat("poire_coeur", (0.93, 0.86, 0.62), 0.25, sss=0.4))
        placer(coeur, (0, 0.06, 15), (-math.pi / 2, -math.pi / 2, 0))
        parts.append(coeur)
        trait = lame("poire_trait", 48, 1.3, lambda u: 1.0 if 0 < u < 1 else 0.0, nu=10, nv=2)
        assign(trait, mat("poire_coeur", (0.93, 0.86, 0.62), 0.25))
        placer(trait, (1.5, 0.07, 36), (-math.pi / 2, -math.pi / 2 + 0.05, 0))
        parts.append(trait)
        # Pépins décalés et inclinés différemment (deux pépins alignés
        # dessinaient un visage).
        for k, (sx, sz, inc) in enumerate(pepins):
            p = bouton(f"pepin{i}_{k}", 8.5, 2.3, mat("pepin", (0.28, 0.15, 0.07), 0.3))
            p.scale = (1, 0.55, 1)
            placer(p, (sx, 0.3, sz), (0, inc, 0))
            parts.append(p)
    q = None if not queue else tige(f"queue{i}", [(3.5 * s, 0, H - 1), (4.2 * s, 0, H + 8 * s), (6.5 * s, 0.5, H + 18 * s),
                           (10 * s, 1, H + 25 * s)], 1.7 * s, 1.0 * s, mat("queue", (0.36, 0.25, 0.13), 0.75))
    if q:
        parts.append(q)
    if not moitie:
        f = lame(f"poire_feuille{i}", 52, 24, contour_ovale(0.8, 0.45), creux=2.4, courbe=-0.45, pli=0.12,
                 torsion=0.3, relief=lambda u, v: -0.4 * sillon(v, 0.07) + 0.15 * bruit(u * 5, v * 3, g))
        modifs(f, 0.4, 1)
        assign(f, mat("feuille_poirier", (0.25, 0.40, 0.14), 0.35, coat=0.2))
        placer(f, (5.5 * s, 0.5, H + 11 * s), (0.5, -0.6, 0.4))
        parts.append(f)
    for k in range(5):                                  # l'œil (calice sec) sous le fruit
        a = TAU * k / 5
        c = bouton(f"calice{i}_{k}", 3.2 * s, 0.9 * s, mat("calice", (0.22, 0.16, 0.08), 0.8))
        placer(c, (1.4 * s * math.cos(a), 1.4 * s * math.sin(a), 3.3 * s), (0, 2.4, a))
        if not moitie or math.sin(a) < 0.1:
            parts.append(c)
        else:
            bpy.data.objects.remove(c)
    ob = joindre(f"poire{i}", [ob] + parts)
    organique(ob, 0.8 * s, 40, graine=i + 0.5)
    return recentrer(ob) if recentre else ob


def poire_fendue(i):
    """Poire entière faite de deux moitiés jointives : dans la vidéo, elle se
    fend puis s'ouvre et montre sa chair blanche. Renvoie un vide parent
    (à animer comme un ingrédient) et ses deux moitiés, plan de coupe
    vertical face à ±X (moitié A à gauche, B à droite)."""
    a = poire(i, moitie=True, recentre=False)
    b = poire(i + 50, moitie=True, queue=False, pepins=((-2.6, 21.5, -0.2),), recentre=False)
    # B : miroir de A par le plan de coupe (y → −y).
    b.scale = (1, -1, 1)
    appliquer(b)
    b.data.flip_normals()
    for m, nom in ((a, "A"), (b, "B")):
        m.name = f"poire_fendue{i}_{nom}"
        m.rotation_euler = (0, 0, -math.pi / 2)          # coupe face à ±X
        appliquer(m)
    # Centre de l'ensemble à l'origine.
    bpy.context.view_layer.update()
    pts = [m.matrix_world @ Vector(c) for m in (a, b) for c in m.bound_box]
    ctr = sum(pts, Vector()) / len(pts)
    for m in (a, b):
        m.location -= ctr
        appliquer(m)
    vide = bpy.data.objects.new(f"poire_fendue{i}", None)
    vide.empty_display_size = 0.02
    bpy.context.collection.objects.link(vide)
    for m in (a, b):
        m.parent = vide
    vide["fendue"] = 1
    return vide


def jasmin(i):
    """Brin de jasmin : tige fine, paires de feuilles opposées, bouquet de
    fleurs étoilées à cinq pétales sur un long tube, boutons rosés."""
    rnd = random.Random(60 + i)
    blanc = mat("jasmin", (0.98, 0.97, 0.94), 0.45, sss=0.3)
    rose = mat("jasmin_bouton", (0.95, 0.84, 0.84), 0.45, sss=0.3)
    vert = mat("feuille_jasmin", (0.22, 0.36, 0.16), 0.35)
    tg = mat("tige_verte", (0.33, 0.42, 0.20), 0.6)
    L = 90
    parts = [tige(f"jasmin_tige{i}", [(0, 0, 0), (2, 1, 30), (-1, 2, 60), (1, 1, L)], 1.1, 0.8, tg)]
    for k, z in enumerate((22, 44, 64)):                  # feuilles opposées
        for side in (-1, 1):
            f = lame(f"jasmin_f{i}_{k}_{side}", 30 - 4 * k, 12 - k, contour_ovale(0.9, 0.5),
                     creux=1.2, courbe=-0.35, pli=0.12,
                     relief=lambda u, v: -0.35 * sillon(v, 0.1))
            modifs(f, 0.3, 1)
            assign(f, vert)
            placer(f, (0, 0, z), (0.25, -0.5, (0 if side > 0 else math.pi) + k * 1.2))
            parts.append(f)
    ovale = contour_ovale(pointe=0.35, base=0.6)
    for k in range(4):                                     # fleurs ouvertes
        a = TAU * k / 4 + rnd.uniform(-0.3, 0.3)
        fl = fleur(f"jasmin{i}_{k}", 5, 11, 6.5, blanc, ovale, ouverture=1.5, creux=0.5, torsion=0.25,
                   courbe=-0.2, tube=(13, 1.2), m_tube=rose, graine=i * 10 + k)
        placer(fl, (7 * math.cos(a), 7 * math.sin(a), L - 12), (0.55 * math.sin(a), -0.55 * math.cos(a), 0))
        parts.append(fl)
    for k in range(3):                                     # boutons
        a = TAU * k / 3 + 0.6
        b = bouton(f"jasmin_b{i}_{k}", 15, 1.9, rose)
        placer(b, (4 * math.cos(a), 4 * math.sin(a), L - 4), (0.35 * math.sin(a), -0.35 * math.cos(a), 0))
        parts.append(b)
    return recentrer(organique(joindre(f"jasmin{i}", parts), 3.0, 55, graine=i + 1.3))


def tubereuse(i):
    """Hampe de tubéreuse : fleurs cireuses en étoile à six tépales, portées
    en spirale sur la tige, boutons serrés et rosés au sommet."""
    rnd = random.Random(80 + i)
    cire = mat("tubereuse", (0.97, 0.95, 0.89), 0.35, sss=0.35)
    rose = mat("tubereuse_bouton", (0.93, 0.83, 0.78), 0.4, sss=0.3)
    tg = mat("tige_verte", (0.33, 0.42, 0.20), 0.6)
    L = 120
    parts = [tige(f"tub_tige{i}", [(0, 0, 0), (1, 0, 40), (-1, 1, 80), (0, 0, L)], 1.8, 1.2, tg)]
    pointe = contour_ovale(pointe=0.8, base=0.5)
    n = 6
    for k in range(n):
        z = 52 + k * 11
        a = k * 2.4
        fl = fleur(f"tub{i}_{k}", 6, 14, 7.5, cire, pointe, ouverture=1.25, creux=1.4, courbe=-0.45,
                   tube=(18, 2.0), graine=i * 20 + k, ep=0.5, decalage=0.3)
        placer(fl, (1.5 * math.cos(a), 1.5 * math.sin(a), z), (1.0 * math.sin(a), -1.0 * math.cos(a), 0))
        parts.append(fl)
    for k in range(5):
        a = k * 2.4 + 0.8
        b = bouton(f"tub_b{i}_{k}", 16 - k, 2.6, rose)
        placer(b, (2.0 * math.cos(a), 2.0 * math.sin(a), L - 6 + k * 2.5),
               (0.4 * math.sin(a), -0.4 * math.cos(a), 0))
        parts.append(b)
    return recentrer(organique(joindre(f"tubereuse{i}", parts), 4.5, 70, graine=i + 2.1))


def fleur_oranger(i):
    """Rameau de fleur d'oranger : fleurs blanches à cinq pétales épais,
    réfléchis, couronne d'étamines jaunes autour du pistil ; boutons ronds
    et feuilles vernissées."""
    rnd = random.Random(100 + i)
    blanc = mat("fleur_oranger", (0.98, 0.97, 0.93), 0.35, sss=0.3)
    jaune = mat("anthere", (0.96, 0.78, 0.22), 0.5)
    filet = mat("filet", (0.97, 0.94, 0.80), 0.5)
    vert_fonce = mat("feuille_oranger", (0.14, 0.26, 0.10), 0.22, coat=0.3)
    tg = mat("tige_verte", (0.33, 0.42, 0.20), 0.6)
    parts = [tige(f"or_tige{i}", [(0, 0, 0), (2, 0, 20), (1, 2, 40), (0, 0, 55)], 1.4, 1.0, tg)]
    oblong = contour_ovale(pointe=0.45, base=0.55)
    for k in range(3):
        a = TAU * k / 3 + rnd.uniform(-0.3, 0.3)
        fl = fleur(f"or{i}_{k}", 5, 14, 6.5, blanc, oblong, ouverture=1.85, creux=1.6, courbe=-0.8,
                   graine=i * 30 + k, ep=0.7)
        et = etamines(f"or_et{i}_{k}", 16, 6.5, 1.6, filet, jaune, graine=k)
        pi_ = tige(f"or_pistil{i}_{k}", [(0, 0, 0), (0, 0, 4), (0, 0, 7.5)], 0.7, 0.9, mat("pistil", (0.55, 0.65, 0.25), 0.4))
        fl = joindre(f"or{i}_{k}", [fl, et, pi_])
        placer(fl, (9 * math.cos(a), 9 * math.sin(a), 55), (0.7 * math.sin(a), -0.7 * math.cos(a), 0))
        parts.append(fl)
    for k in range(3):
        a = TAU * k / 3 + 1.0
        b = bouton(f"or_b{i}_{k}", 9, 3.3, blanc, pointe=1.6)
        placer(b, (5 * math.cos(a), 5 * math.sin(a), 59), (0.45 * math.sin(a), -0.45 * math.cos(a), 0))
        parts.append(b)
    for k, z in enumerate((22, 38)):
        f = lame(f"or_feuille{i}_{k}", 48, 20, contour_ovale(0.8, 0.45), creux=2.0, courbe=-0.3, pli=0.1,
                 relief=lambda u, v: -0.4 * sillon(v, 0.07))
        modifs(f, 0.4, 1)
        assign(f, vert_fonce)
        placer(f, (0, 0, z), (0.2, -0.9, k * math.pi + 0.4))
        parts.append(f)
    return recentrer(organique(joindre(f"fleur_oranger{i}", parts), 3.0, 45, graine=i + 3.7))


def feuille(i, long_mm=62, larg_mm=22):
    """Feuille de sauge : ovale allongé, surface gaufrée entre les nervures,
    veloutée, vert-de-gris, pétiole court."""
    g = 1.7 * i

    def relief(u, v):
        ph = (u * 8.5 - 2.6 * abs(v)) % 1.0
        d = min(ph, 1 - ph)
        nerv = -0.45 * sillon(v, 0.05) - 0.28 * math.exp(-(d / 0.07) ** 2) * (1 - abs(v))
        gaufre = 0.32 * math.sin(math.pi * ph) * (1 - abs(v) ** 2) * math.sin(math.pi * u)
        return nerv + gaufre + 0.25 * bruit(u * 4, v * 3, g)
    f = lame(f"feuille{i}", long_mm, larg_mm, contour_ovale(pointe=0.7, base=0.35), creux=2.2, courbe=0.45,
             torsion=0.15, relief=relief, nu=60, nv=24)
    modifs(f, 0.45, 1)
    m = mat("sauge", (0.52, 0.58, 0.47), 0.85, sheen=0.8)
    assign(f, m)
    p = tige(f"petiole{i}", [(0, 0, 0.3), (-6, 0, -0.5), (-12, 0, -2)], 1.1, 0.8, m)
    return recentrer(organique(joindre(f"feuille{i}", [f, p]), 1.4, 28, graine=i + 8.2))


def petale_libre(i):
    rnd = random.Random(i + 300)
    ob = lame(f"petale{i}", 19, 13, contour_ovale(pointe=0.3, base=0.7), creux=2.2, courbe=0.7,
              torsion=rnd.uniform(-0.4, 0.4),
              relief=lambda u, v: 0.3 * bruit(u * 3, v * 3, i) * u)
    modifs(ob, 0.35, 1)
    assign(ob, mat("petale_blanc", (0.98, 0.96, 0.92), 0.4, sss=0.35))
    return recentrer(organique(ob, 0.9, 12, graine=i + 9.4))


# ---------------------------------------------------- Vanilla Plum
def prune(i, moitie=False):
    """Prune noire : presque ronde (44 × 42 × 47 mm), sillon de suture d'un
    côté, cuvette du pédoncule, pruine mate. La demi-prune, coupée le long
    du sillon, montre sa chair rouge qui s'éclaircit vers le noyau."""
    g = 2.3 * i + 0.4
    Rr = 21.5
    n = 40

    def rayon(th, a):
        da = math.atan2(math.sin(a), math.cos(a))
        r = Rr * (1 - 0.055 * sillon(da, 0.12) * math.sin(th) ** 0.5)       # sillon de suture
        r *= 1 - 0.16 * math.exp(-((math.pi - th) ** 2) / 0.09)             # cuvette du pédoncule
        r *= 1 - 0.05 * math.exp(-(th ** 2) / 0.05)                         # petit creux dessous
        return r * (1 + 0.035 * math.cos(a - math.pi) + 0.012 * bruit(math.cos(a), math.sin(a), th, g))

    rangs = []
    for k in range(1, n):
        th = math.pi * k / n                               # 0 en bas, π en haut
        rang = []
        for j in range(56):
            a = TAU * j / 56
            r = rayon(th, a)
            rang.append((r * math.sin(th) * math.cos(a), r * math.sin(th) * math.sin(a), -1.09 * r * math.cos(th)))
        rangs.append(rang)
    ob = maillage(f"prune{i}", rangs, True, (0, 0, -1.09 * rayon(0, 0)), (0, 0, 1.09 * rayon(math.pi, 0)))
    modifs(ob, subsurf=1)
    assign(ob, mat_texture("prune_peau", (0.11, 0.035, 0.08), (0.20, 0.08, 0.16), 0.38,
                           echelle=35, seuil=(0.3, 0.8)))
    parts = []
    if moitie:
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                                     plane_co=(0, 0, 0), plane_no=(0, 1, 0), clear_outer=True)
        edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        faces = bmesh.ops.edgenet_fill(bm, edges=edges)["faces"]
        bmesh.ops.triangulate(bm, faces=faces)
        for f in bm.faces:
            if abs(f.normal.y) > 0.999 and f.calc_center_median().y > -1e-5:
                f.material_index = 1
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.materials.append(mat_radial("prune_chair", (0.90, 0.50, 0.18), (0.58, 0.05, 0.10), Rr,
                                            rough=0.3, peau=(0.18, 0.02, 0.07)))
        # Noyau : amande ridée, à moitié dégagée de la chair.
        noyau = balayage(f"noyau{i}", lambda t: (0, 0, 24 * (t - 0.5)),
                         lambda t: 8.2 * contour_ovale(0.6, 0.55)(t), lambda t: 5.2 * contour_ovale(0.6, 0.55)(t),
                         nt=30, na=32,
                         rayon=lambda t, a: 1 + 0.06 * bruit(math.cos(a) * 3, math.sin(a) * 3, t * 4, g))
        modifs(noyau, subsurf=1)
        assign(noyau, mat("noyau", (0.62, 0.40, 0.26), 0.55))
        placer(noyau, (0, 0.5, -0.5), (0, 0, math.pi / 2))
        parts.append(noyau)
    else:
        q = tige(f"pedoncule{i}", [(0, 0, Rr * 0.85), (0.5, 0, Rr * 1.15), (2.5, 0.5, Rr * 1.45)], 0.9, 0.7,
                 mat("queue", (0.36, 0.25, 0.13), 0.75))
        parts.append(q)
    ob = joindre(f"prune{i}", [ob] + parts)
    return ob


def gousse(i, longueur=185):
    """Gousse de vanille : longue lanière souple (≈ 9 mm), brun-noir huileux,
    ridée en long. Jamais droite : elle ondule en S dans l'espace, se vrille,
    s'élargit et se pince par endroits, et finit en petite crosse côté tige."""
    rnd = random.Random(i)
    g = 4.1 * i + 0.3
    longueur = longueur * rnd.uniform(0.86, 1.0)
    n = 240
    pas = longueur / n
    pts, T = [Vector((0, 0, 0))], Vector((1, 0, 0))
    N = Vector((0, 1, 0))
    for k in range(n):
        s_ = k / n
        # Courbure en deux composantes (plan et hors plan) : bruit lent,
        # une grande courbe d'ensemble, et la crosse des derniers 8 %.
        k1 = 0.010 * bruit(s_ * 2.2, 0.3, 0, g) + 0.0045 * math.sin(math.pi * s_ + rnd.uniform(-1, 1))
        k2 = 0.007 * bruit(s_ * 1.7, 5.1, 0, g + 2)
        if s_ > 0.92:
            k1 += 0.07 * ((s_ - 0.92) / 0.08)
        B = T.cross(N).normalized()
        T = (T + N * (k1 * pas) + B * (k2 * pas)).normalized()          # courbures en 1/mm
        N = (N - T * N.dot(T)).normalized()
        pts.append(pts[-1] + T * pas)

    def chemin(t):
        k = t * n
        a = min(int(k), n - 1)
        return pts[a].lerp(pts[a + 1], k - a)

    def larg(t):
        base = 4.6 * min(1.0, 16 * t) ** 0.45 * min(1.0, 6 * (1 - t)) ** 0.8 + 0.25
        return base * (1 + 0.16 * bruit(t * 7, 1.1, 0, g + 5))           # pincements, renflements

    def ep(t):
        return larg(t) * (0.40 + 0.08 * bruit(t * 5, 2.3, 0, g + 7)) + 0.1

    def rides(t, a):
        n1 = bruit(math.cos(a) * 2.2, math.sin(a) * 2.2, t * 9, g)
        n2 = bruit(math.cos(a) * 6, math.sin(a) * 6, t * 30, g + 3)
        return 1 - 0.13 * sillon(n1, 0.13) - 0.05 * sillon(n2, 0.1)
    ob = balayage(f"gousse{i}", chemin, larg, ep, nt=200, na=32, rayon=rides,
                  torsion=lambda t: 2.4 * t + 0.6 * bruit(t * 3, 0, 0, g + 9))
    modifs(ob, subsurf=1)
    assign(ob, mat("vanille", (0.13, 0.075, 0.042), 0.28, coat=0.45))
    return recentrer(ob)


def cannelle(i, longueur=85):
    """Bâton de cannelle : écorce fine roulée des deux bords vers le centre
    (deux volutes côte à côte), striée en long, bouts coupés net."""
    g = 1.3 * i + 0.2
    ep = 0.55
    # Ligne médiane de la section : volute gauche (du cœur vers le dehors),
    # fond commun, puis volute droite (du dehors vers le cœur).
    gauche = []
    tours = 1.6
    for k in range(60):
        u = k / 59
        th = TAU * tours * u
        r = 0.9 + (2.9 - 0.9) * u
        ph = th - TAU * tours - math.pi / 2
        gauche.append(Vector((-2.9 + r * math.cos(ph), r * math.sin(ph))))
    fond = [Vector((-2.9 + 5.8 * k / 6, -2.9)) for k in range(1, 6)]
    droite = [Vector((-q.x, q.y)) for q in reversed(gauche)]
    mid = gauche + fond + droite
    nrm = []
    for k in range(len(mid)):
        d = mid[min(k + 1, len(mid) - 1)] - mid[max(k - 1, 0)]
        nrm.append(Vector((-d.y, d.x)).normalized())
    nz = 50
    bm = bmesh.new()
    anneaux = []
    for iz in range(nz + 1):
        z = longueur * iz / nz
        dehors, dedans = [], []
        for k, (q, nn) in enumerate(zip(mid, nrm)):
            stries = 0.12 * sillon(bruit(q.x * 1.5, q.y * 1.5, z * 0.04, g), 0.15) \
                + 0.05 * bruit(q.x * 3, q.y * 3, z * 0.5, g + 1)
            o = q + nn * (ep / 2 - stries)
            n_ = q - nn * ep / 2
            dz = 0.8 * bruit(q.x * 0.6, q.y * 0.6, iz, g + 5) if iz in (0, nz) else 0.0
            dehors.append(bm.verts.new((o.x * MM, o.y * MM, (z + dz) * MM)))
            dedans.append(bm.verts.new((n_.x * MM, n_.y * MM, (z + dz) * MM)))
        anneaux.append((dehors, dedans))
    K = len(mid)
    for iz in range(nz):
        (a0, b0), (a1, b1) = anneaux[iz], anneaux[iz + 1]
        for k in range(K - 1):
            bm.faces.new((a0[k], a0[k + 1], a1[k + 1], a1[k]))
            bm.faces.new((b0[k + 1], b0[k], b1[k], b1[k + 1]))
        bm.faces.new((a0[0], a1[0], b1[0], b0[0]))
        bm.faces.new((a0[-1], b0[-1], b1[-1], a1[-1]))
    for idx, (a_, b_) in ((0, anneaux[0]), (1, anneaux[-1])):
        for k in range(K - 1):
            f = bm.faces.new((a_[k], b_[k], b_[k + 1], a_[k + 1]))
            f.material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = G.mesh_object(f"cannelle{i}", bm)
    smooth(ob)
    ob.data.materials.append(mat_texture("cannelle", (0.56, 0.31, 0.17), (0.48, 0.25, 0.13), 0.8,
                                         echelle=110, seuil=(0.3, 0.7), type_tex="WAVE", ondes=1.5))
    ob.data.materials.append(mat("cannelle_coupe", (0.68, 0.42, 0.25), 0.85))
    ob.rotation_euler = (0, math.pi / 2, 0)                # axe long en X, comme les autres
    appliquer(ob)
    organique(ob, 1.6, 70, graine=i + 5.3)                # l'écorce n'est jamais un tube droit
    return recentrer(ob)


def orchidee(i):
    """Fleur de vanillier : trois sépales et deux pétales étroits, vert
    tendre crème, autour d'un labelle en trompette au bord frisé, jaune."""
    creme = mat("orchidee", (0.93, 0.92, 0.70), 0.4, sss=0.3)
    jaune = mat("orchidee_labelle", (0.97, 0.86, 0.42), 0.4, sss=0.3)
    vert = mat("tige_verte", (0.33, 0.42, 0.20), 0.6)
    parts = []
    etroit = contour_ovale(pointe=0.75, base=0.5)
    for k, (L, W, a, ouv) in enumerate([(44, 13, 0.0, 1.35), (44, 13, 2.2, 1.35), (44, 13, 4.1, 1.35),
                                        (40, 12, 1.1, 1.2), (40, 12, 5.2, 1.2)]):
        pe = lame(f"orch{i}_{k}", L, W, etroit, creux=1.6, courbe=-0.3, torsion=0.35 * (1 if k % 2 else -1),
                  relief=lambda u, v: -0.25 * sillon(v, 0.1))
        modifs(pe, 0.4, 1)
        assign(pe, creme)
        placer(pe, (0, 0, 0), (0, -(math.pi / 2 - ouv), 0))
        placer(pe, (0, 0, 2), (0, 0, a))
        parts.append(pe)
    # Labelle : cornet ouvert sur le dessus, bord ondulé qui s'évase.
    rangs = []
    nu, nv = 24, 40
    for k in range(nu + 1):
        u = k / nu
        r = 2.2 + 7.5 * u ** 2.2
        rang = []
        for j in range(nv + 1):
            a = 0.45 + (TAU - 0.9) * j / nv
            rr = r + 1.9 * math.sin(11 * a) * u ** 4 + 0.6 * math.sin(23 * a + 1) * u ** 6
            rang.append((rr * math.cos(a) - 2.5, rr * math.sin(a), 30 * u))
        rangs.append(rang)
    lab = maillage(f"labelle{i}", rangs, cyclique=False)
    modifs(lab, 0.4, 1)
    assign(lab, jaune)
    placer(lab, (0, 0, 0), (0, -0.25, math.pi))
    colonne = tige(f"colonne{i}", [(0, 0, 0), (0.5, 0, 12), (1, 0, 22)], 1.3, 1.0, creme)
    ovaire = tige(f"ovaire{i}", [(0, 0, 0), (0, 0, -18), (3, 0, -34)], 2.0, 1.6, vert)
    parts += [lab, colonne, ovaire]
    return recentrer(organique(joindre(f"orchidee{i}", parts), 2.2, 35, graine=i + 4.9))


def graines(i, n=90):
    """Pincée de graines de vanille : minuscules grains noirs en nuage."""
    rnd = random.Random(99 + i)
    bm = bmesh.new()
    for k in range(n):
        m = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=rnd.uniform(0.35, 0.6) * MM)
        off = Vector((rnd.gauss(0, 7), rnd.gauss(0, 3), rnd.gauss(0, 7))) * MM
        bmesh.ops.translate(bm, verts=m["verts"], vec=off)
    ob = G.mesh_object(f"graines{i}", bm)
    assign(ob, mat("graine", (0.05, 0.04, 0.03), 0.5))
    return recentrer(ob)
