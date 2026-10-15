"""Le chevet de l'accueil, rendu dans Blender (Cycles) image par image.

Même scène et même mouvement de caméra que chevet3d.js (relevés dans le navigateur : camera-*.json,
chevet-scene.glb), mais en lumière physique : le verre, les jus, l'or et la laque sans approximation.

    python chevet_scene.py desktop 0,40,80,120,160 --samples 128 --echelle .5
"""
import os as _os
RACINE = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
TRAVAIL = _os.environ.get('CHEVET_TRAVAIL', _os.path.join(RACINE, '3d', 'chevet', 'travail'))
import argparse, json, math, os, sys
import bpy
from mathutils import Matrix, Vector

W = TRAVAIL
SITE = _os.path.join(RACINE, 'maquette')
CHEVET = SITE + '/assets/3d/chevet/'
HANDLES = ["palmeira", "ambert-sunset", "mango-wave", "hot-sand", "sun-ice", "vanilla-plum", "tonka-love", "magnetic-flowers"]

ap = argparse.ArgumentParser()
ap.add_argument('tag')
ap.add_argument('images')                 # indices des images du chemin (camera-<tag>.json), « 0,40,80 » ou « 0-160 »
ap.add_argument('--samples', type=int, default=128)
ap.add_argument('--echelle', type=float, default=1.0)   # définition : × la taille du canevas de référence
ap.add_argument('--marge', type=float, default=1.12)    # cadre élargi autour du canevas (recalage à l'écran)
ap.add_argument('--sortie', default=W + '/rendus')
ap.add_argument('--blend', action='store_true')
ap.add_argument('--ombre', action='store_true')   # l'ombre portée seule sur le papier (tout le reste en « holdout »)
A = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])

CAM = json.load(open(f'{W}/out/camera-{A.tag}.json'))
CAI = CAM['caisson']
def b(x, y, z): return Vector((x, -z, y))          # three (y en haut) → Blender (z en haut)
def lin(c): return tuple(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c)

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
COL = {}
def col(nom):
    if nom not in COL:
        c = bpy.data.collections.new(nom); S.collection.children.link(c); COL[nom] = c
    return COL[nom]
def lier(o, nom):
    for c in o.users_collection: c.objects.unlink(o)
    col(nom).objects.link(o)

def nodes(m):
    m.use_nodes = True; return m.node_tree.nodes, m.node_tree.links
def principled(nom, **kw):
    m = bpy.data.materials.new(nom); n, l = nodes(m); p = n['Principled BSDF']
    for k, v in kw.items(): p.inputs[k].default_value = v
    return m, n, l, p
def image(chemin, couleur=True):
    im = bpy.data.images.load(chemin, check_existing=True)
    if not couleur: im.colorspace_settings.name = 'Non-Color'
    return im

# ------------------------------------------------------------------ le meuble (Poly Haven, CC0)
bpy.ops.import_scene.gltf(filepath=CHEVET + 'ClassicNightstand_01_1k.gltf')
corps = bpy.data.objects['ClassicNightstand_01']; lier(corps, 'meuble')
# le corps sans son dessus (remplacé par plateau.glb), comme chevet3d.js : faces au-dessus de y = ,6757 ôtées
import bmesh
bm = bmesh.new(); bm.from_mesh(corps.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if min((corps.matrix_world @ v.co).z for v in f.verts) >= .6757], context='FACES')
bm.to_mesh(corps.data); bm.free()
bois = corps.data.materials[0]
# le corps passe sous le plateau en fondu à la fin du mouvement : un mélange avec le transparent piloté par « fondu »
n, l = bois.node_tree.nodes, bois.node_tree.links
out = n['Material Output']; surf = out.inputs['Surface'].links[0].from_socket
tr = n.new('ShaderNodeBsdfTransparent'); mx = n.new('ShaderNodeMixShader'); val = n.new('ShaderNodeValue'); val.name = 'fondu'; val.outputs[0].default_value = 1
l.new(val.outputs[0], mx.inputs[0]); l.new(tr.outputs[0], mx.inputs[1]); l.new(surf, mx.inputs[2]); l.new(mx.outputs[0], out.inputs['Surface'])
BOIS_FONDU = val.outputs[0]
pb = next(x for x in n if x.type == 'BSDF_PRINCIPLED')
pb.inputs['Coat Weight'].default_value = .25; pb.inputs['Coat Roughness'].default_value = .25   # vernis du meuble

# ------------------------------------------------------------------ le plateau en noyer (le bureau du catalogue)
bpy.ops.import_scene.gltf(filepath=CHEVET + 'plateau.glb')
plateau = bpy.data.objects['Plateau']; lier(plateau, 'meuble')
m, n, l, p = principled('Noyer', Roughness=1.0, Metallic=0.0)
t = n.new('ShaderNodeTexImage'); t.image = image(CHEVET + 'plateau-noyer-4k.webp'); l.new(t.outputs[0], p.inputs['Base Color'])
r = n.new('ShaderNodeTexImage'); r.image = image(CHEVET + 'plateau-noyer-rugosite-2k.webp', False); l.new(r.outputs[0], p.inputs['Roughness'])
nt = n.new('ShaderNodeTexImage'); nt.image = image(CHEVET + 'plateau-noyer-normale-2k.webp', False)
nm = n.new('ShaderNodeNormalMap'); l.new(nt.outputs[0], nm.inputs['Color']); l.new(nm.outputs[0], p.inputs['Normal'])
p.inputs['Coat Weight'].default_value = .42; p.inputs['Coat Roughness'].default_value = .32; p.inputs['Specular IOR Level'].default_value = .16
plateau.data.materials.clear(); plateau.data.materials.append(m)

# ------------------------------------------------------------------ étagère, bandeau, velours (relevés de la scène web)
bpy.ops.import_scene.gltf(filepath=f'{W}/out/chevet-scene.glb')
for nom in ('corps', 'plateau'): bpy.data.objects.remove(bpy.data.objects[nom])
etagere, bandeau = bpy.data.objects['etagere'], bpy.data.objects['bandeau']
for o in (etagere, bandeau): o.data.materials.clear(); o.data.materials.append(bois); lier(o, 'niches')
# velours de coton noir, chaud, avec la lueur de la réglette LED au pied (exp(−y/5 cm))
LARG, CX = CAM['larg'], CAM['cx']
NICHES = [(CAI['plancher'], CAI['sousEtagere']), (CAI['surEtagere'], CAI['plafond'])]
def velours(i):
    y0 = NICHES[i][0]
    m, n, l, p = principled(f'Velours{i}', Roughness=1.0)
    p.inputs['Base Color'].default_value = (*[c * 6 for c in (.013, .008, .0055)], 1)
    p.inputs['Sheen Weight'].default_value = 1; p.inputs['Sheen Tint'].default_value = (.30, .16, .085, 1); p.inputs['Sheen Roughness'].default_value = .5
    g = n.new('ShaderNodeNewGeometry'); s = n.new('ShaderNodeSeparateXYZ'); l.new(g.outputs['Position'], s.inputs[0])
    a = n.new('ShaderNodeMath'); a.operation = 'SUBTRACT'; a.inputs[1].default_value = y0; l.new(s.outputs[2], a.inputs[0])
    d = n.new('ShaderNodeMath'); d.operation = 'MULTIPLY'; d.inputs[1].default_value = -1 / .05; l.new(a.outputs[0], d.inputs[0])
    e = n.new('ShaderNodeMath'); e.operation = 'EXPONENT'; l.new(d.outputs[0], e.inputs[0])
    k = n.new('ShaderNodeMath'); k.operation = 'MULTIPLY'; k.name = 'lueur'; k.inputs[1].default_value = LUEUR * (1 if i else .75); l.new(e.outputs[0], k.inputs[0])
    p.inputs['Emission Color'].default_value = (1, .62, .34, 1); l.new(k.outputs[0], p.inputs['Emission Strength'])
    return m
LUEUR = .35
VEL = [velours(0), velours(1)]
for o in [o for o in bpy.data.objects if o.name.startswith('fond_')]:
    i = 1 if (o.matrix_world.translation.z if o.type == 'MESH' else 0) > .41 else 0
    o.data.materials.clear(); o.data.materials.append(VEL[i]); lier(o, 'niches'); o['niche'] = i
# la laque des étagères : un vernis tendu, miroir au pied des flacons (Fresnel du vernis, n = 1,5)
lq, n, l, p = principled('Laque', Roughness=.02, IOR=1.5)
p.inputs['Base Color'].default_value = (0, 0, 0, 1)
tr = n.new('ShaderNodeBsdfTransparent'); lw = n.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = .5
gl = n.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = .015
fr = n.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.5
mx = n.new('ShaderNodeMixShader'); l.new(fr.outputs[0], mx.inputs[0]); l.new(tr.outputs[0], mx.inputs[1]); l.new(gl.outputs[0], mx.inputs[2])
l.new(mx.outputs[0], n['Material Output'].inputs['Surface'])
for i, y in enumerate((CAI['plancher'], CAI['surEtagere'])):
    z0, z1 = CAI['fond'], (CAI['avantEtagere'] - .001 if i else CAI['avant'] + .01)
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = f'laque{i}'
    o.scale = (LARG - .002, z1 - z0, 1); o.location = b(CX, y + .0004, (z0 + z1) / 2)
    o.data.materials.append(lq); lier(o, 'niches')

# ------------------------------------------------------------------ les 18 flacons (rendu.py : matières Cycles, logo gravé)
for h in HANDLES:
    with bpy.data.libraries.load(f'{W}/blend/flacon-{h}.blend') as (src, dst): dst.objects = list(src.objects)
    c = bpy.data.collections.new('flacon-' + h)
    for o in dst.objects: c.objects.link(o)
    for o in dst.objects:
        if o.type == 'EMPTY': o.name = 'Flacon-' + h
for pose in CAM['poses']:
    e = bpy.data.objects.new(f"{pose['handle']}-{pose['niche']}", None)
    e.instance_type = 'COLLECTION'; e.instance_collection = bpy.data.collections['flacon-' + pose['handle']]
    e.location = b(pose['x'], pose['y'], pose['z']); e.rotation_euler = (0, 0, pose['lacet'])
    col('niches').objects.link(e)

# ------------------------------------------------------------------ le catalogue posé sur le plateau
c = CAM['cat']; P = c['pose']
cw, chh, ct = c['w'], c['h'], c['t']
bpy.ops.mesh.primitive_cube_add(size=1); cat = bpy.context.object; cat.name = 'catalogue'
cat.scale = (cw, chh, ct); cat.location = b(P['x'], P['y'], P['z']); cat.rotation_euler = (0, 0, P['ry'])
tranche, *_ = principled('Tranche', Roughness=.9); tranche.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin((0xf1/255, 0xec/255, 0xe2/255)), 1)
cat.data.materials.append(tranche); lier(cat, 'catalogue')
bpy.ops.mesh.primitive_plane_add(size=1); couv = bpy.context.object; couv.name = 'couverture'
couv.scale = (cw, chh, 1); couv.location = b(P['x'], P['y'] + ct / 2 + .00005, P['z']); couv.rotation_euler = (0, 0, P['ry'])
m, n, l, p = principled('Couverture', Roughness=.55)
t = n.new('ShaderNodeTexImage'); t.image = image(_os.environ.get('CATALOGUE_3D', _os.path.expanduser('~/Projects/librery-catalogue-3d')) + '/public/pages/uhd/p01.webp'); t.interpolation = 'Cubic'
l.new(t.outputs[0], p.inputs['Base Color'])
couv.data.materials.append(m); lier(couv, 'catalogue')

# ------------------------------------------------------------------ lumières (recette « caravage » du prototype)
K = dict(cle=1.5, dos=.22, dosBas=.16, murSpot=.55, zCle=.118, cleAngle=.52, murSpotAngle=.42, murX=-.08, zDrapeau=.195)
CLE, DOS = (1, .66, .38), (1, .80, .60)
def spot(nom, pos, vise, cd, couleur, angle, penombre, rayon=.004):
    d = bpy.data.lights.new(nom, 'SPOT'); d.energy = 4 * math.pi * cd * GAIN; d.color = couleur
    d.spot_size = 2 * angle; d.spot_blend = penombre; d.shadow_soft_size = rayon
    o = bpy.data.objects.new(nom, d); o.location = pos
    o.rotation_euler = (vise - pos).to_track_quat('-Z', 'Y').to_euler(); col('lumieres').objects.link(o); return o
GAIN = 1.0
for i, (y0, y1) in enumerate(NICHES):
    spot(f'cle{i}', b(CAI['g'] + .03, y1 - .012, K['zCle']), b(CX + .03, y0 + .035, -.03), K['cle'], CLE, K['cleAngle'], .65)
    spot(f'dos{i}', b(CX + .06, y1 - .012, CAI['fond'] + .03), b(CX - .01, y0, .08), K['dos'] if i else K['dosBas'], DOS, .55, .6, .01)
    m = spot(f'mur{i}', b(CAI['g'] + .06, y0 + (.165 if i else .148), .15), b(CX + K['murX'] + .02, y0 + (.115 if i else .1), CAI['fond']), K['murSpot'], CLE, K['murSpotAngle'], 1)
    # (le projecteur du fond n'éclaire que le velours de sa niche)
    rc = bpy.data.collections.new(f'velours{i}')
    for o in col('niches').objects:
        if o.get('niche') == i: rc.objects.link(o)
    m.light_linking.receiver_collection = rc
def soleil(nom, direction, force, couleur, angle=.004):
    d = bpy.data.lights.new(nom, 'SUN'); d.energy = force; d.color = couleur; d.angle = angle
    o = bpy.data.objects.new(nom, d); o.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler(); col('lumieres').objects.link(o); return o
soleil('soleil', b(-.7, 1.75, 1).normalized(), 3.4, (1, .98, .96))
soleil('contre-jour', b(1.2, .9, -.6).normalized(), .8, (1, .945, .875), .02)
# drapeaux noirs devant l'ouverture : ils n'existent que pour les ombres (le soleil de la pièce n'entre pas dans les niches)
def drapeau(nom, taille, pos, rot):
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = nom; o.scale = (*taille, 1); o.location = pos; o.rotation_euler = rot
    o.visible_camera = o.visible_diffuse = o.visible_glossy = o.visible_transmission = o.visible_volume_scatter = False
    lier(o, 'drapeaux'); return o
H = CAI['plafond'] - CAI['plancher']
drapeau('drapeau', (LARG + .004, H), b(CX, (CAI['plancher'] + CAI['plafond']) / 2, K['zDrapeau']), (math.pi / 2, 0, 0))
drapeau('drapeau-d', (CAI['avant'] - K['zDrapeau'] + .03, H), b(CAI['d'] - .003, (CAI['plancher'] + CAI['plafond']) / 2, (K['zDrapeau'] - .01 + CAI['avant'] + .02) / 2), (math.pi / 2, 0, math.pi / 2))
# le studio des reflets : bandes et réglette invisibles à l'objectif, vues seulement dans le verre, le jus et l'or
def bande(nom, taille, pos, vise, force, couleur=(1, .93, .84)):
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.object; o.name = nom; o.scale = (*taille, 1); o.location = pos
    o.rotation_euler = (vise - pos).to_track_quat('Z', 'Y').to_euler()
    m, n, l, p = principled('lf-' + nom); n.remove(p); em = n.new('ShaderNodeEmission'); em.inputs[0].default_value = (*couleur, 1); em.inputs[1].default_value = force
    l.new(em.outputs[0], n['Material Output'].inputs['Surface']); o.data.materials.append(m)
    o.visible_camera = o.visible_diffuse = o.visible_shadow = o.visible_volume_scatter = False
    lier(o, 'studio'); return o
LF = 1.0
for i, (y0, y1) in enumerate(NICHES):
    yc = (y0 + y1) / 2
    bande(f'bandeG{i}', (.03, .16), b(CAI['g'] - .12, yc, .30), b(CX, yc, 0), 12 * LF)
    bande(f'bandeD{i}', (.02, .16), b(CAI['d'] + .18, yc, .26), b(CX, yc, 0), 6 * LF)
    bande(f'plafond{i}', (LARG * .8, .012), b(CX, y1 - .004, .11), b(CX, y0, .11), 6 * LF, (1, .86, .70))
    bande(f'face{i}', (.12, .05), b(CX - .05, y1 + .02, .55), b(CX, yc, 0), 3 * LF)
# la pièce : le vrai studio (studio_small_09), très bas, tourné comme dans la scène web
wd = bpy.data.worlds.new('piece'); S.world = wd; n, l = nodes(wd)
env = n.new('ShaderNodeTexEnvironment'); env.image = image(SITE + '/parfum/studio.hdr')
mp = n.new('ShaderNodeMapping'); tc = n.new('ShaderNodeTexCoord'); mp.inputs['Rotation'].default_value = (0, 0, -.9)
l.new(tc.outputs['Generated'], mp.inputs[0]); l.new(mp.outputs[0], env.inputs[0]); l.new(env.outputs[0], n['Background'].inputs[0])
n['Background'].inputs[1].default_value = .1

# ------------------------------------------------------------------ le sol de papier : un attrape-ombres
bpy.ops.mesh.primitive_plane_add(size=6); sol = bpy.context.object; sol.name = 'sol'; sol.is_shadow_catcher = True; lier(sol, 'sol')

# ------------------------------------------------------------------ rendu
S.render.engine = 'CYCLES'; cy = S.cycles
cy.device = 'CPU'; cy.samples = A.samples; cy.use_adaptive_sampling = True; cy.adaptive_threshold = .04
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 12; cy.transmission_bounces = 12; cy.glossy_bounces = 6; cy.diffuse_bounces = 3; cy.transparent_max_bounces = 16
cy.caustics_refractive = True; cy.caustics_reflective = False; cy.blur_glossy = .6
S.render.film_transparent = True
S.view_settings.view_transform = 'Standard'; S.view_settings.look = 'None'      # sortie linéaire : la finition est faite à part
S.view_layers[0].cycles.use_pass_shadow_catcher = False
S.render.image_settings.media_type = 'MULTI_LAYER_IMAGE'; S.render.image_settings.file_format = 'OPEN_EXR_MULTILAYER'; S.render.image_settings.color_depth = '16'; S.render.image_settings.exr_codec = 'DWAA'
cwv, chv = CAM['cw'], CAM['ch']
S.render.resolution_x = round(cwv * A.echelle * A.marge); S.render.resolution_y = round(chv * A.echelle * A.marge); S.render.resolution_percentage = 100
camd = bpy.data.cameras.new('objectif'); camd.sensor_fit = 'VERTICAL'
camd.angle_y = 2 * math.atan(math.tan(math.radians(CAM['fov'] / 2)) * A.marge)
camd.clip_start = .01; camd.clip_end = 20
cam = bpy.data.objects.new('objectif', camd); S.collection.objects.link(cam); S.camera = cam
C3 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
lisse = lambda t: t * t * (3 - 2 * t)
clamp = lambda v, a=0., b=1.: min(b, max(a, v))

def etat(f):
    m = f['m']; M = Matrix([[m[c * 4 + r] for c in range(4)] for r in range(4)])
    cam.matrix_world = C3 @ M
    u, v = f['u'], f['v']
    # mise au point : le flou d'objectif s'éteint entre u ,5 et ,8 (d'aplomb, tout le plateau est net)
    flou = 1 - lisse(clamp((u - .5) / .3))
    camd.dof.use_dof = flou > .01; camd.dof.focus_distance = f['focus']; camd.dof.aperture_fstop = 3.2 / max(flou, .05)
    # le contenu du caisson disparaît sous le plateau (vF), puis le corps en fondu (de vC − ,04 à vC)
    vF, vC = CAM['vF'], CAM['vC']; r = v < vF
    for o in col('niches').objects: o.hide_render = not r
    for o in col('studio').objects: o.hide_render = not r
    v0 = max(vF, vC - .04); op = 0 if v >= vC else 1 if v <= v0 else 1 - lisse((v - v0) / (vC - v0))
    BOIS_FONDU.default_value = op; corps.hide_render = op <= 0

if A.ombre:
    # tout devient « holdout » (transparent à l'objectif, mais porte encore ses ombres) : il ne reste que l'ombre sur le
    # papier — post.py la sépare du sujet et l'efface à la fin du mouvement, comme chevet3d.js
    for nom in ('meuble', 'niches', 'catalogue', 'studio'):
        S.view_layers[0].layer_collection.children[nom].holdout = True
    cy.samples = min(A.samples, 24); cy.max_bounces = 4; cy.transmission_bounces = 4; cy.caustics_refractive = False
if A.blend: bpy.ops.wm.save_as_mainfile(filepath=f'{W}/chevet-{A.tag}.blend')
os.makedirs(A.sortie, exist_ok=True)
if '-' in A.images: a, z = map(int, A.images.split('-')); liste = range(a, z + 1)
else: liste = [int(x) for x in A.images.split(',')]
import time
for i in liste:
    f = CAM['frames'][i]; etat(f)
    S.render.filepath = f'{A.sortie}/{A.tag}-{i:03d}{"-ombre" if A.ombre else ""}.exr'
    if os.path.exists(S.render.filepath): continue
    t = time.time(); bpy.ops.render.render(write_still=True); print(f'image {i} u={f["u"]:.3f} {time.time() - t:.1f}s', flush=True)
