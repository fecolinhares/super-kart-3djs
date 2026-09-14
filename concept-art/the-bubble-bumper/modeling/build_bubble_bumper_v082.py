import bpy, math, os, sys
from mathutils import Vector

ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'bubble-bumper-v082.blend')
RENDER_DIR=os.path.join(ROOT,'renders-v082')
os.makedirs(RENDER_DIR,exist_ok=True)
COL=None; M={}

def mat(name,c,metal=0,rough=.4):
 m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True; b=m.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value=(*c,1); b.inputs['Metallic'].default_value=metal; b.inputs['Roughness'].default_value=rough; return m

def mesh(name,v,f,ma,smooth=True):
 me=bpy.data.meshes.new(name+'_MESH'); me.from_pydata(v,[],f); me.update(); me.materials.append(ma); o=bpy.data.objects.new(name,me); COL.objects.link(o)
 for p in me.polygons:p.use_smooth=smooth
 return o

def bevel(o,w=.02):
 if w:
  md=o.modifiers.new('AUTHORED_BEVEL','BEVEL'); md.width=w; md.segments=4; md.limit_method='ANGLE'; bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.modifier_apply(modifier=md.name); o.select_set(False)
 return o

def box(name,loc,scale,ma,w=.02):
 bpy.ops.mesh.primitive_cube_add(location=loc); o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(ma); return bevel(o,w)

def sphere(name,loc,scale,ma):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=loc); o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(ma)
 for p in o.data.polygons:p.use_smooth=True
 return o

def cyl(name,loc,r,depth,ma,d=(0,0,1)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc); o=bpy.context.object; o.name=name; o.rotation_euler=Vector((0,0,1)).rotation_difference(Vector(d).normalized()).to_euler(); o.data.materials.append(ma)
 for p in o.data.polygons:p.use_smooth=True
 return bevel(o,.006)

def torus(name,loc,major,minor,ma,rot=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=72,minor_segments=20,location=loc,rotation=rot); o=bpy.context.object; o.name=name; o.data.materials.append(ma)
 for p in o.data.polygons:p.use_smooth=True
 return o

def tube(name,pts,r,ma):
 cu=bpy.data.curves.new(name+'_CURVE','CURVE'); cu.dimensions='3D'; cu.resolution_u=18; cu.bevel_depth=r; cu.bevel_resolution=6; sp=cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts)-1)
 for bp,p in zip(sp.bezier_points,pts):bp.co=p; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,cu); COL.objects.link(o); cu.materials.append(ma); return o

def sweep_y(name,sections,ma,sides=64):
 # continuous authored closed surface; sections=(y,cx,cz,rx,rz)
 dense=[]
 for a,b in zip(sections,sections[1:]):
  for k in range(4):
   t=k/4; dense.append(tuple(a[i]*(1-t)+b[i]*t for i in range(5)))
 dense.append(tuple(sections[-1])); v=[]; f=[]
 for y,cx,cz,rx,rz in dense:
  for i in range(sides):
   a=2*math.pi*i/sides; v.append((cx+rx*math.cos(a),y,cz+rz*math.sin(a)))
 for j in range(len(dense)-1):
  for i in range(sides):
   n=(i+1)%sides; f.append((j*sides+i,j*sides+n,(j+1)*sides+n,(j+1)*sides+i))
 a=len(v); y,cx,cz,rx,rz=dense[0]; v.append((cx,y,cz)); b=len(v); y,cx,cz,rx,rz=dense[-1]; v.append((cx,y,cz))
 for i in range(sides):
  n=(i+1)%sides; f.extend([(a,n,i),(b,(len(dense)-1)*sides+i,(len(dense)-1)*sides+n)])
 o=mesh(name,v,f,ma,True); o['representation']='authored_continuous_sweep'; return o

def wheel(prefix,x,y,z,r,w):
 torus(prefix+'_TIRE',(x,y,z),r-w*.22,w*.43,M['rubber'],rot=(0,math.pi/2,0))
 cyl(prefix+'_RIM',(x+(.02 if x>0 else -.02),y,z),r*.53,w*.58,M['metal'],d=(1,0,0))
 torus(prefix+'_RIM_RING',(x+(.035 if x>0 else -.035),y,z),r*.35,r*.035,M['yellow'],rot=(0,math.pi/2,0))
 cyl(prefix+'_HUB',(x+(.055 if x>0 else -.055),y,z),r*.14,w*.75,M['black'],d=(1,0,0))
 # shallow concept tread, repeated around the visible tyre envelope
 for i in range(10):
  a=2*math.pi*i/10; xx=x+(r-w*.43)*math.cos(a); zz=z+(r-w*.43)*math.sin(a)
  tube(prefix+'_TREAD_%02d'%i,[(xx,y-w*.46,zz),(xx,y+w*.46,zz)],.010,M['black'])

def create_scene():
 global COL
 bpy.ops.wm.read_factory_settings(use_empty=True); COL=bpy.data.collections.new('BUBBLE_BUMPER_V077_AUTHORED'); bpy.context.scene.collection.children.link(COL)
 M.update({'blue':mat('Concept Blue',(.008,.055,.34),.18,.27),'yellow':mat('Concept Yellow',(.98,.60,.01),.04,.24),'rubber':mat('Smooth Rubber',(.004,.005,.007),0,.76),'black':mat('Cockpit Black',(.008,.012,.020),.15,.38),'metal':mat('Silver Metal',(.46,.50,.57),.72,.22),'darkmetal':mat('Dark Metal',(.045,.06,.085),.68,.3),'face':mat('Pilot Face',(.60,.69,.70),0,.32),'white':mat('Eyes',(.98,.98,.92),0,.2),'visor':mat('Visor',(.01,.025,.07),.25,.12),'suit':mat('Pilot Suit',(.008,.045,.19),0,.4),'ground':mat('Proof Ground',(.45,.48,.52),0,.9)})
 # four wheel datums: front axle is +Y, rear axle -Y
 for n,x,y,z,r,w in [('FL',-.49,.69,.245,.245,.20),('FR',.49,.69,.245,.245,.20),('RL',-.57,-.57,.275,.275,.285),('RR',.57,-.57,.275,.275,.285)]:
  wheel(n,x,y,z,r,w)
  s=-1 if x<0 else 1
  tube('UPRIGHT_'+n,[(s*.29,y,.38),(x,y,z)],.022,M['darkmetal']); tube('LOWER_ARM_'+n,[(s*.18,y+.05,.34),(x,y,z-.05)],.020,M['metal'])
 # slim central chassis rails and cross-members
 for s in (-1,1): tube('CHASSIS_RAIL_L' if s<0 else 'CHASSIS_RAIL_R',[(s*.16,1.00,.36),(s*.16,-.70,.38)],.025,M['darkmetal'])
 tube('FRONT_CROSSMEMBER',[(-.28,.88,.38),(.28,.88,.38)],.025,M['metal']); tube('REAR_CROSSMEMBER',[(-.38,-.70,.39),(.38,-.70,.39)],.028,M['metal'])
 # low side pods: the yellow mass stays lateral, blue is a recessed outer face
 for s in (-1,1):
  sweep_y('POD_YELLOW_SHELL_L' if s<0 else 'POD_YELLOW_SHELL_R',[(.38,s*.40,.30,.10,.085),(.25,s*.45,.32,.13,.11),(.02,s*.48,.32,.15,.12),(-.22,s*.46,.31,.14,.11),(-.43,s*.40,.29,.10,.075)],M['yellow'],56)
  sweep_y('POD_BLUE_RECESS_L' if s<0 else 'POD_BLUE_RECESS_R',[(.27,s*.57,.31,.018,.05),(.12,s*.61,.33,.022,.07),(-.08,s*.62,.33,.024,.075),(-.27,s*.59,.31,.020,.06)],M['blue'],40)
  tube('POD_LOWER_SEAM_L' if s<0 else 'POD_LOWER_SEAM_R',[(s*.48,.27,.22),(s*.49,-.28,.22)],.009,M['darkmetal'])
  for yy in (-.25,.22): cyl('POD_BOLT_%s_%s'%(s,yy),(s*.625,yy,.34),.012,.018,M['metal'],d=(1,0,0))
 # authored short nose/cowl, deliberately narrower than pods
 sweep_y('NOSE_COWL',[(.55,0,.42,.11,.055),(.76,0,.44,.15,.07),(.96,0,.42,.17,.075),(1.10,0,.37,.10,.05)],M['blue'],64)
 box('NOSE_YELLOW_PANEL',(0,1.08,.425),(.075,.035,.028),M['yellow'],.01)
 box('NOSE_RECESSED_GRILLE',(0,1.115,.35),(.145,.018,.085),M['darkmetal'],.012); box('NOSE_GRILLE_RIM',(0,1.125,.43),(.15,.012,.018),M['yellow'],.006); box('NOSE_GRILLE_RIM_LOWER',(0,1.125,.275),(.15,.012,.014),M['yellow'],.005); box('NOSE_GRILLE_SIDE_L',(-.145,1.125,.35),(.014,.012,.085),M['yellow'],.005); box('NOSE_GRILLE_SIDE_R',(.145,1.125,.35),(.014,.012,.085),M['yellow'],.005)
 for i,x in enumerate((-.09,-.045,0,.045,.09)): box('NOSE_GRILLE_BAR_%d'%i,(x,1.145,.35),(.014,.010,.060),M['black'],.003)
 # real cockpit opening: dark recessed floor + narrow rim, seat/backrest
 box('COCKPIT_WELL',(0,.02,.34),(.18,.34,.025),M['black'],.025)
 tube('COCKPIT_RIM_L',[(-.235,.38,.49),(-.235,-.29,.49)],.025,M['black']); tube('COCKPIT_RIM_R',[(.235,.38,.49),(.235,-.29,.49)],.025,M['black']); tube('COCKPIT_RIM_FRONT',[(-.235,.38,.49),(0,.43,.50),(.235,.38,.49)],.025,M['black'])
 box('SEAT',(0,-.08,.45),(.13,.23,.045),M['black'],.035); sweep_y('SEAT_BACK',[( -.30,0,.58,.12,.18),(-.20,0,.68,.12,.20)],M['blue'],48)
 # compact steering console and wheel
 box('DASH',(0,.39,.55),(.12,.10,.04),M['darkmetal'],.018); box('DASH_YELLOW',(0,.43,.60),(.075,.045,.018),M['yellow'],.008)
 torus('STEERING_WHEEL',(0,.48,.67),.095,.024,M['black'],rot=(math.pi/2,0,0)); cyl('STEERING_HUB',(0,.48,.67),.032,.04,M['metal'],d=(0,1,0)); tube('STEERING_COLUMN',[(0,.48,.67),(0,.30,.53)],.016,M['darkmetal'])
 # small connected seated pilot, helmet/face facing +Y
 sweep_y('PILOT_TORSO',[(-.12,0,.56,.105,.095),(-.02,0,.65,.12,.11),(.06,0,.76,.095,.09)],M['suit'],48)
 sweep_y('PILOT_PELVIS',[(-.18,0,.48,.10,.08),(-.08,0,.53,.12,.09)],M['suit'],48)
 tube('PILOT_NECK',[(0,.02,.75),(0,.04,.84)],.042,M['suit'])
 sphere('PILOT_HELMET',(0,.07,.92),(.135,.125,.145),M['blue']); box('HELMET_STRIPE',(0,.205,.94),(.028,.012,.14),M['yellow'],.006); sphere('PILOT_FACE',(0,.205,.90),(.10,.018,.075),M['face']); box('PILOT_VISOR',(0,.224,.96),(.078,.010,.025),M['visor'],.006)
 for s in (-1,1):
  sphere('EYE_L' if s<0 else 'EYE_R',(s*.040,.228,.92),(.022,.008,.027),M['white']); sphere('PUPIL_L' if s<0 else 'PUPIL_R',(s*.040,.237,.92),(.008,.005,.012),M['black'])
  tube('ARM_L' if s<0 else 'ARM_R',[(s*.085,.05,.72),(s*.16,.28,.70),(s*.10,.45,.69)],.030,M['suit']); sphere('GLOVE_L' if s<0 else 'GLOVE_R',(s*.10,.49,.69),(.045,.035,.040),M['yellow'])
  tube('THIGH_L' if s<0 else 'THIGH_R',[(s*.08,-.08,.56),(s*.14,.16,.49),(s*.11,.34,.42)],.040,M['suit']); tube('SHIN_L' if s<0 else 'SHIN_R',[(s*.11,.34,.42),(s*.04,.53,.35)],.030,M['suit']); box('BOOT_L' if s<0 else 'BOOT_R',(s*.04,.57,.33),(.045,.08,.026),M['black'],.008)
 # visible side face for the fixed -X profile camera
 sphere('PILOT_SIDE_FACE',(-.145,.11,.91),(.018,.085,.070),M['face']); box('PILOT_SIDE_VISOR',(-.165,.14,.94),(.008,.055,.025),M['visor'],.006); sphere('PILOT_SIDE_EYE',(-.172,.17,.925),(.008,.018,.022),M['white']); sphere('PILOT_SIDE_PUPIL',(-.179,.178,.925),(.004,.009,.010),M['black'])
 # rear mechanical module: central housing, two exhausts, circular outlet, grille and bar
 sweep_y('REAR_HOUSING',[(-.67,0,.53,.12,.10),(-.79,0,.55,.145,.115),(-.91,0,.53,.12,.095)],M['metal'],56); box('REAR_HOUSING_CORE',(0,-.82,.54),(.12,.10,.09),M['darkmetal'],.025)
 cyl('REAR_CENTRAL_OUTLET',(0,-.95,.51),.095,.045,M['black'],d=(0,-1,0)); torus('REAR_OUTLET_RIM',(0,-.98,.51),.073,.018,M['metal'],rot=(math.pi/2,0,0))
 for s in (-1,1):
  base=Vector((s*.14,-.77,.63)); end=Vector((s*.27,-1.00,.78)); d=end-base; cyl('EXHAUST_L' if s<0 else 'EXHAUST_R',(base+end)/2,.072,d.length,M['metal'],d=d); torus('EXHAUST_LIP_L' if s<0 else 'EXHAUST_LIP_R',end,.058,.012,M['metal'],rot=Vector((0,0,1)).rotation_difference(d.normalized()).to_euler()); tube('REAR_SPRING_L' if s<0 else 'REAR_SPRING_R',[(s*.42,-.65,.43),(s*.48,-.73,.62)],.018,M['yellow']); [torus('SPRING_%s_%d'%(s,i),(s*(.42+.015*i),-.65-.025*i,.46+.035*i),.040,.009,M['yellow'],rot=(math.pi/2,0,0)) for i in range(4)]
 tube('REAR_BAR',[(-.53,-.98,.82),(0,-1.00,.82),(.53,-.98,.82)],.043,M['blue']); tube('REAR_BAR_YELLOW_L',[(-.53,-.98,.82),(-.64,-.96,.82)],.052,M['yellow']); tube('REAR_BAR_YELLOW_R',[(.53,-.98,.82),(.64,-.96,.82)],.052,M['yellow'])
 box('REAR_LOWER_GRILLE',(0,-1.01,.32),(.13,.025,.07),M['blue'],.01)
 for i,x in enumerate((-.09,-.045,0,.045,.09)): box('REAR_GRILLE_%d'%i,(x,-1.045,.32),(.008,.010,.052),M['black'],.002)
 # low bumper U with real chassis returns
 u=[(-.36,.88,.27),(-.52,.92,.27),(-.61,1.00,.27),(-.63,1.10,.27),(-.57,1.18,.27),(-.40,1.23,.27),(0,1.25,.27),(.40,1.23,.27),(.57,1.18,.27),(.63,1.10,.27),(.61,1.00,.27),(.52,.92,.27),(.36,.88,.27)]
 tube('FRONT_BUMPER_U',u,.052,M['blue'])
 for s in (-1,1):
  tube('BUMPER_YELLOW_END_L' if s<0 else 'BUMPER_YELLOW_END_R',[(s*.61,1.00,.27),(s*.63,1.10,.27),(s*.58,1.17,.27)],.057,M['yellow']); tube('BUMPER_SOCKET_L' if s<0 else 'BUMPER_SOCKET_R',[(s*.36,.88,.27),(s*.25,.80,.37)],.020,M['darkmetal'])
 box('GROUND',(0,0,-.035),(2.2,2.2,.02),M['ground'],0)
 sc=bpy.context.scene; sc['asset']='The Bubble Bumper'; sc['revision']='V082_FRONT_GRILLE_SLOTS'; sc['source']='assets/reference-orthographic/{top,front,rear,side}.jpg'; sc['visual_gate']='pending'; sc['sol_gate']='pending'; sc['user_gate']='pending'
 return sc

def setup():
 sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE'; sc.render.resolution_x=1024; sc.render.resolution_y=512; sc.render.resolution_percentage=100; sc.render.image_settings.file_format='PNG'; sc.render.film_transparent=False; sc.world=bpy.data.worlds.new('WORLD'); sc.world.color=(.42,.44,.47)
 target=Vector((0,.05,.52))
 def area(n,loc,e,size,c):
  d=bpy.data.lights.new(n,'AREA'); d.energy=e; d.shape='DISK'; d.size=size; d.color=c; o=bpy.data.objects.new(n,d); COL.objects.link(o); o.location=loc; o.rotation_euler=(target-Vector(loc)).to_track_quat('-Z','Y').to_euler()
 area('KEY',(-3,3,4),420,5,(1,.96,.9)); area('FILL',(3,1,2.5),180,4,(.55,.68,1)); area('RIM',(0,-4,2.5),240,4,(1,.82,.65))
 cams={'top':((0,0,5),(0,.05,.48),2.85),'profile':((-4,.10,1.1),(0,.08,.53),2.40),'front':((0,4,1.0),(0,.72,.52),1.55),'rear':((0,-4,1.1),(0,-.78,.53),1.55),'isometric':((-3.8,4,2.6),(0,.05,.55),2.55)}
 for n,(loc,t,ortho) in cams.items():
  d=bpy.data.cameras.new('CAM_'+n.upper()); d.type='ORTHO'; d.ortho_scale=ortho; o=bpy.data.objects.new('CAM_'+n.upper(),d); COL.objects.link(o); o.location=loc; o.rotation_euler=(Vector(t)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
  if n=='top': o.rotation_euler.rotate_axis('Z',-math.pi/2)
 sc.camera=bpy.data.objects['CAM_ISOMETRIC']

def main():
 sc=create_scene(); setup(); bpy.ops.wm.save_as_mainfile(filepath=OUT,compress=True)
 for n in ('top','profile','front','rear','isometric'):
  sc.camera=bpy.data.objects['CAM_'+n.upper()]; sc.render.filepath=os.path.join(RENDER_DIR,n+'.png'); bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=OUT,compress=True); print('BUBBLE_BUMPER_V078_OK',OUT,'OBJECTS',len(bpy.data.objects),'RENDERS',len(os.listdir(RENDER_DIR)))
if __name__=='__main__':main()
