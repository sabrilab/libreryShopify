"""Géométrie paramétrique du flacon Librery (Blender / bpy).

Toutes les cotes sont en millimètres dans P ; la scène est en mètres.
Les valeurs par défaut viennent de l'ajustement sur les photos
(scripts/ajuster.py) : silhouette de face des détourés pour la largeur,
les hauteurs et les épaules ; vues de trois-quarts pour la profondeur,
les pans coupés et les entailles.
"""
import math

import bpy  # doit précéder bmesh
import bmesh
from mathutils import Vector

MM = 0.001

P = {
    # Verre : bloc octogonal (rectangle aux arêtes verticales en pans coupés).
    "A": 30.0,        # demi-largeur
    "B": 18.92,        # demi-profondeur
    "C": 7.34,         # pan coupé vertical (jambe à 45°)
    "H": 103.46,       # hauteur du verre
    "EP": 11.06,       # hauteur des épaules (taillées à 45° sur les côtés)
    "TA": 18.65,       # demi-largeur du dessus
    "TB": 14.0,       # demi-profondeur du dessus (≥ rayon de la virole)
    "TC": 3.37,        # pan coupé du dessus
    "PIED": 1.2,      # arrondi du pied
    # Rainure en V taillée dans chaque arête verticale, près du socle.
    "G_HAUT": 27.5, "G_POINTE": 19.0, "G_BAS": 11.0, "G_PROF": 5.0,
    # Cavité du jus.
    "CAV_MUR": 5.4, "CAV_Z0": 22.5, "CAV_Z1": 91.5, "CAV_R": 8.0,
    "REMPLI": 0.9,
    # Virole (bague dorée entre verre et capot).
    "VIR_R": 13.51, "VIR_H": 3.0,
    # Capot.
    "CA": 18.23, "CB": 15.64, "CC": 4.92, "CH": 28.31, "C_ARRONDI": 1.0,
    "CG_HAUT": 11.0, "CG_POINTE": 4.8, "CG_BAS": 1.8, "CG_PROF": 2.8,
}


# ----------------------------------------------------------------- outils
def octagon(a, b, c, z):
    if c <= 1e-6:
        return [(a, -b, z), (a, b, z), (-a, b, z), (-a, -b, z)]
    return [
        (a - c, -b, z), (a, -b + c, z), (a, b - c, z), (a - c, b, z),
        (-a + c, b, z), (-a, b - c, z), (-a, -b + c, z), (-a + c, -b, z),
    ]


def mesh_object(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def loft(name, rings):
    bm = bmesh.new()
    vs = [[bm.verts.new(Vector(p) * MM) for p in ring] for ring in rings]
    n = len(rings[0])
    for r0, r1 in zip(vs, vs[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    bm.faces.new(list(reversed(vs[0])))
    bm.faces.new(vs[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_object(name, bm)


def apply_all(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def boolean(target, tool, op="DIFFERENCE"):
    mod = target.modifiers.new("bool", "BOOLEAN")
    mod.operation, mod.object, mod.solver = op, tool, "EXACT"
    apply_all(target)
    bpy.data.objects.remove(tool)


def cylinder(name, r, z0, z1, segments=96):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments,
                          radius1=r * MM, radius2=r * MM, depth=(z1 - z0) * MM)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, (z0 + z1) / 2 * MM))
    return mesh_object(name, bm)


def rounded_box(name, a, b, z0, z1, radius, segments=10):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(2 * a * MM, 2 * b * MM, (z1 - z0) * MM), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, 0, (z0 + z1) / 2 * MM), verts=bm.verts)
    ob = mesh_object(name, bm)
    mod = ob.modifiers.new("arrondi", "BEVEL")
    mod.width, mod.segments, mod.limit_method = radius * MM, segments, "NONE"
    apply_all(ob)
    return ob


def soften_edges(ob, width_mm, segments=3, angle=25):
    mod = ob.modifiers.new("aretes", "BEVEL")
    mod.width = width_mm * MM
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(angle)
    mod.harden_normals = True
    mod.miter_outer = "MITER_ARC"
    apply_all(ob)


def corner_grooves(target, a, b, c, z_top, z_tip, z_bot, depth, z0=0.0):
    """Rainure en V dans chacune des 4 arêtes verticales (pans coupés).

    Profil dans le plan normal au pan : le V s'ouvre sur la surface du pan
    entre z_top et z_bot, sa pointe est à `depth` sous la surface, à z_tip.
    """
    ext = 12.0
    up = (z_top - z_tip) / depth
    dn = (z_tip - z_bot) / depth
    profile = [(ext, z0 + z_top + up * ext), (-depth, z0 + z_tip), (ext, z0 + z_bot - dn * ext)]
    for sx in (1, -1):
        for sy in (1, -1):
            mid = Vector((sx * (a - c / 2), sy * (b - c / 2), 0))
            n = Vector((sx, sy, 0)).normalized()
            t = Vector((-sy, sx, 0)).normalized()
            bm = bmesh.new()
            rings = []
            for s in (-c * 2, c * 2):
                rings.append([bm.verts.new((mid + n * pn + Vector((0, 0, pz)) + t * s) * MM)
                              for pn, pz in profile])
            k = len(profile)
            for i in range(k):
                j = (i + 1) % k
                bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
            bm.faces.new(list(reversed(rings[0])))
            bm.faces.new(rings[1])
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            boolean(target, mesh_object("rainure", bm))


# --------------------------------------------------------------- les pièces
def verre(p, detail=True):
    A, B, C, H = p["A"], p["B"], p["C"], p["H"]
    f = p["PIED"]
    rings = [
        octagon(A - f, B - f, C, 0.0),
        octagon(A, B, C, f),
        octagon(A, B, C, H - p["EP"]),
        octagon(p["TA"], p["TB"], p["TC"], H),
    ]
    ob = loft("Verre", rings)
    corner_grooves(ob, A, B, C, p["G_HAUT"], p["G_POINTE"], p["G_BAS"], p["G_PROF"])
    if detail:
        m = p["CAV_MUR"]
        boolean(ob, rounded_box("cavite", A - m, B - m, p["CAV_Z0"], p["CAV_Z1"], p["CAV_R"]))
        boolean(ob, cylinder("goulot", 4.6, p["CAV_Z1"] - 3, H + 1, 48))
        soften_edges(ob, 0.4)
    return ob


def jus(p):
    m, inset = p["CAV_MUR"], 0.12
    z0, z1 = p["CAV_Z0"], p["CAV_Z1"]
    ob = rounded_box("Jus", p["A"] - m - inset, p["B"] - m - inset,
                     z0 + inset, z1 - inset, p["CAV_R"] - inset)
    fill = z0 + (z1 - z0) * p["REMPLI"]
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                                 plane_co=(0, 0, fill * MM), plane_no=(0, 0, 1),
                                 clear_outer=True)
    edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
    bmesh.ops.edgenet_fill(bm, edges=edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def virole(p, detail=True):
    ob = cylinder("Virole", p["VIR_R"], p["H"], p["H"] + p["VIR_H"] + 3.0)
    if detail:
        soften_edges(ob, 0.3, segments=2)
    return ob


def capot(p, detail=True):
    z0 = p["H"] + p["VIR_H"]
    a, b, c, h = p["CA"], p["CB"], p["CC"], p["CH"]
    ob = loft("Capot", [octagon(a, b, c, z0), octagon(a, b, c, z0 + h)])
    corner_grooves(ob, a, b, c, p["CG_HAUT"], p["CG_POINTE"], p["CG_BAS"], p["CG_PROF"], z0)
    if detail:
        boolean(ob, cylinder("logement", 9.0, z0 - 1, z0 + 19, 64))
        soften_edges(ob, p["C_ARRONDI"], segments=4, angle=50)
        soften_edges(ob, 0.25, segments=2)
    return ob


def vaporisateur(p):
    """Col serti + poussoir + tube plongeur (visibles capot ôté)."""
    z = p["H"] + p["VIR_H"] + 3.0
    col = cylinder("Col", 7.6, z, z + 2.2)
    soften_edges(col, 0.3, segments=2)
    act = cylinder("Poussoir", 6.3, z + 2.6, z + 13.0)
    soften_edges(act, 0.6, segments=3)
    buse = cylinder("buse", 0.55, -3, 3, 24)
    from mathutils import Matrix
    buse.matrix_world = Matrix.Translation(
        (0, -6.3 * MM, (z + 9.5) * MM)) @ Matrix.Rotation(math.pi / 2, 4, "X")
    boolean(act, buse)
    tige = cylinder("Tige", 1.6, z + 1.5, z + 3.0, 32)

    cu = bpy.data.curves.new("TubePlongeur", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 1.2 * MM
    cu.bevel_resolution = 3
    sp = cu.splines.new("BEZIER")
    pts = [(0, 0, p["H"] + 1), (0, 0, 70), (-6, -4, 42), (-14, -6, p["CAV_Z0"] + 1.3)]
    sp.bezier_points.add(len(pts) - 1)
    for bp, q in zip(sp.bezier_points, pts):
        bp.co = Vector(q) * MM
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    tube = bpy.data.objects.new("TubePlongeur", cu)
    bpy.context.collection.objects.link(tube)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = tube
    tube.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return col, act, tige, bpy.context.view_layer.objects.active


def etiquette(p, z0=36.0, size=48.0):
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    y = -(p["B"] + 0.04)
    vs = [bm.verts.new(Vector(q) * MM) for q in
          ((-size / 2, y, z0), (size / 2, y, z0), (size / 2, y, z0 + size), (-size / 2, y, z0 + size))]
    f = bm.faces.new(vs)
    for loop, co in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop[uv].uv = co
    f.normal_update()
    if f.normal.y > 0:
        f.normal_flip()
    return mesh_object("Etiquette", bm)
