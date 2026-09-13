import bpy, os, sys
from mathutils import Vector
JOB=os.path.dirname(os.path.abspath(__file__))
blend=os.path.join(JOB,'bubble-bumper-v017.blend')
outdir=os.path.join(JOB,'renders-v017'); os.makedirs(outdir,exist_ok=True)
view='isometric'
if '--' in sys.argv:
    a=sys.argv[sys.argv.index('--')+1:]
    if '--view' in a: view=a[a.index('--view')+1]
bpy.ops.wm.open_mainfile(filepath=blend)
sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE'; sc.render.resolution_x=960; sc.render.resolution_y=720; sc.render.resolution_percentage=100; sc.render.image_settings.file_format='PNG'; sc.render.film_transparent=False
for n in ('top','profile','front','rear','isometric'):
    cam=bpy.data.objects.get('CAM_'+n.upper())
    if cam: cam.hide_render=(n!=view)
cam=bpy.data.objects.get('CAM_'+view.upper())
if not cam: raise SystemExit('missing camera '+view)
sc.camera=cam; sc.render.filepath=os.path.join(outdir,view+'.png'); bpy.ops.render.render(write_still=True)
print('BUBBLE_BUMPER_V017_RENDERED_'+view)
