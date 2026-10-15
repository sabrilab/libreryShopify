"""Construit chaque flacon (rendu.flacon : matières Cycles, gravures, logo du capot) dans un .blend à part,
que chevet_scene.py instancie sur les étagères.

    python flacons.py palmeira ambert-sunset mango-wave hot-sand sun-ice vanilla-plum tonka-love magnetic-flowers
"""
import os as _os
RACINE = _os.path.dirname(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
TRAVAIL = _os.environ.get('CHEVET_TRAVAIL', _os.path.join(RACINE, '3d', 'chevet', 'travail'))
import sys, os, time
sys.path.insert(0, _os.path.join(RACINE, '3d', 'scripts'))
import bpy
import rendu
os.makedirs(f'{TRAVAIL}/blend', exist_ok=True)
for h in sys.argv[1:]:
    t = time.time()
    rendu.flacon(h)
    for o in list(bpy.data.objects):
        if o.type == 'FONT': bpy.data.objects.remove(o)
    bpy.ops.wm.save_as_mainfile(filepath=f'{TRAVAIL}/blend/flacon-{h}.blend')
    print('ok', h, round(time.time() - t, 1), [o.name for o in bpy.data.objects])
