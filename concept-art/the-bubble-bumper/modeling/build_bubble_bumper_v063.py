import bpy, math, os, argparse, json
from mathutils import Vector

ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'bubble-bumper-v063.blend')
COL=None
MATS={}

def mat(name, color, metallic=0.0, rough=0.5, emission=None):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1)
    m.use_nodes=True; bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metallic; bs.inputs['Roughness'].default_value=rough
    if emission:
        key='Emission Color' if 'Emission Color' in bs.inputs else 'Emission'
        bs.inputs[key].default_value=(*emission,1)
        bs.inputs['Emission Strength'].default_value=1.4 if 'Emission Strength' in bs.inputs else 1.0
    return m

def obj_mesh(name, verts, faces, material, smooth=True):
    me=bpy.data.meshes.new(name+'_MESH'); me.from_pydata(verts,[],faces); me.update()
    me.uv_layers.new(name='UVMap')
    ob=bpy.data.objects.new(name,me); COL.objects.link(ob)
    if material: me.materials.append(material)
    for p in me.polygons: p.use_smooth=smooth
    return ob

def loft_y(name, sections, material, sides=20):
    # section=(y, center_x, center_z, radius_x, radius_z)
    # Smooth the longitudinal silhouette instead of exposing a low-poly ring chain.
    dense=[]
    for a,b in zip(sections, sections[1:]):
        for k in range(4):
            t=k/4.0
            dense.append(tuple(a[i]*(1-t)+b[i]*t for i in range(5)))
    dense.append(tuple(sections[-1]))
    sections=dense
    sides=max(sides,48)
    verts=[]; faces=[]
    for y,cx,cz,rx,rz in sections:
        for i in range(sides):
            a=2*math.pi*i/sides
            verts.append((cx+rx*math.cos(a),y,cz+rz*math.sin(a)))
    for j in range(len(sections)-1):
        for i in range(sides):
            ni=(i+1)%sides
            faces.append((j*sides+i,j*sides+ni,(j+1)*sides+ni,(j+1)*sides+i))
    b=len(verts); y,cx,cz,rx,rz=sections[0]; verts.append((cx,y,cz))
    t=len(verts); y,cx,cz,rx,rz=sections[-1]; verts.append((cx,y,cz))
    for i in range(sides):
        ni=(i+1)%sides; faces.append((b,i,ni))
        a=(len(sections)-1)*sides; faces.append((t,a+ni,a+i))
    return obj_mesh(name,verts,faces,material,True)

def tube(name, points, radius, material, resolution=8):
    cu=bpy.data.curves.new(name+'_CURVE','CURVE'); cu.dimensions='3D'; cu.resolution_u=12
    cu.bevel_depth=radius; cu.bevel_resolution=6; cu.resolution_u=12
    sp=cu.splines.new('BEZIER'); sp.bezier_points.add(len(points)-1)
    for bp,p in zip(sp.bezier_points,points): bp.co=p; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,cu); COL.objects.link(ob); ob.data.materials.append(material); return ob

def ellipsoid(name, loc, scale, material, seg=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    ob=bpy.context.object; ob.name=name; ob.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(material)
    for p in ob.data.polygons: p.use_smooth=True
    return ob

def sphere(name, loc, radius, material, seg=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    ob=bpy.context.object; ob.name=name; ob.scale=(radius,radius,radius); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(material)
    for p in ob.data.polygons: p.use_smooth=True
    return ob


def circle(name, loc, radius, material, seg=24):
    bpy.ops.mesh.primitive_circle_add(vertices=seg, radius=radius, location=loc)
    ob=bpy.context.object; ob.name=name; ob.scale=(1,1,1); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(material)
    for p in ob.data.polygons: p.use_smooth=True
    return ob

def torus(name, loc, major, minor, material, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=36, minor_segments=12, location=loc, rotation=rot)
    ob=bpy.context.object; ob.name=name; ob.data.materials.append(material)
    for p in ob.data.polygons: p.use_smooth=True
    return ob

def box(name, loc, scale, material, bevel=.02):
    bpy.ops.mesh.primitive_cube_add(location=loc); ob=bpy.context.object; ob.name=name; ob.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(material)
    if bevel:
        mod=ob.modifiers.new('Soft authored edges','BEVEL'); mod.width=bevel; mod.segments=5
        bpy.context.view_layer.objects.active=ob; bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

def extruded_profile(name, x0, x1, outline_yz, material, bevel=.04):
    # Authored side-profile mesh: front/back caps plus continuous side walls.
    n=len(outline_yz); verts=[(x0,y,z) for y,z in outline_yz]+[(x1,y,z) for y,z in outline_yz]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    for i in range(n):
        j=(i+1)%n; faces.append((i,j,n+j,n+i))
    ob=obj_mesh(name,verts,faces,material,True)
    if bevel:
        mod=ob.modifiers.new('Authored profile bevel','BEVEL');mod.width=bevel;mod.segments=5
        bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

def cylinder(name, loc, radius, depth, material, rot=(0,0,0), vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    ob=bpy.context.object; ob.name=name; ob.data.materials.append(material)
    for p in ob.data.polygons: p.use_smooth=True
    return ob

def coil(name, center, axis, radius, height, turns, material, points=40):
    cx,cy,cz=center; pts=[]
    for i in range(points):
        t=i/(points-1); a=2*math.pi*turns*t
        if axis=='z': pts.append((cx+radius*math.cos(a),cy+radius*math.sin(a),cz-height/2+height*t))
        else: pts.append((cx+radius*math.cos(a),cy-height/2+height*t,cz+radius*math.sin(a)))
    return tube(name,pts,.012,material)

def create_wheel(name, x,y,z, radius, width, material):
    return torus(name,(x,y,z),radius-width*.28,width*.38,material,rot=(0,math.pi/2,0))

def create_scene():
    global COL
    bpy.ops.wm.read_factory_settings(use_empty=True)
    COL=bpy.data.collections.new('BUBBLE_BUMPER_MANUAL_V063'); bpy.context.scene.collection.children.link(COL)
    REF=bpy.data.collections.new('REFERENCE_ORTHO_GUIDES'); bpy.context.scene.collection.children.link(REF)
    ref_dir=os.path.join(ROOT,'reference-orthographic')
    for name,file,loc,rot in [('REF_TOP','top.jpg',(0,0,0),(0,0,0)),('REF_FRONT','front.jpg',(0,1.4,.5),(math.pi/2,0,0)),('REF_REAR','rear.jpg',(0,-1.2,.5),(math.pi/2,0,0)),('REF_SIDE','side.jpg',(-1.0,0,.6),(math.pi/2,0,math.pi/2))]:
        p=os.path.join(ref_dir,file)
        if os.path.exists(p):
            img=bpy.data.images.load(p,check_existing=True); ob=bpy.data.objects.new(name,None); REF.objects.link(ob); ob.empty_display_type='IMAGE'; ob.data=img; ob.empty_display_size=2.2; ob.location=loc; ob.rotation_euler=rot; ob.hide_render=True; ob.hide_viewport=True
    MATS['body_blue']=mat('Body Blue',(0.006,0.07,0.40),0.15,.28); MATS['accent_yellow']=mat('Concept Yellow',(.95,.54,.01),.03,.25); MATS['rubber']=mat('Rubber',(.006,.007,.009),0,.80); MATS['dark']=mat('Structure',(.012,.016,.025),.15,.48); MATS['metal']=mat('Silver',(.45,.49,.55),.5,.24); MATS['metal_dark']=mat('Dark Metal',(.06,.08,.11),.65,.30); MATS['face']=mat('Face',(.58,.66,.68),0,.34); MATS['eye_white']=mat('Eye White',(.96,.96,.92),0,.22); MATS['glass']=mat('Visor',(.02,.08,.14),.1,.10); MATS['pilot']=mat('Pilot Suit',(.015,.06,.22),0,.42); MATS['concept_ground']=mat('Ground',(.62,.64,.66),0,.92)
    # Explicit wheel anchors frozen from the orthographic board.
    for name,x,y,z,rad,width in [('FL',-.50,.67,.28,.22,.22),('FR',.50,.67,.28,.22,.22),('RL',-.62,-.54,.34,.285,.30),('RR',.62,-.54,.34,.285,.30)]:
        create_wheel('WHEEL_'+name,x,y,z,rad,width,MATS['rubber'])
        cylinder('HUB_'+name,(x+(-.018 if x<0 else .018),y,z),rad*.42,.035,MATS['metal'],rot=(0,math.pi/2,0))
    # Manual continuous shell: explicit cross-sections, not ellipsoid/loft primitives.
    sections=[(1.05,.12,.41,.09),(.78,.24,.46,.14),(.30,.30,.50,.18),(-.12,.29,.51,.19),(-.42,.24,.50,.16),(-.68,.15,.48,.10)]
    outline=[]
    for y,w,z,h in sections:
        outline.append([( -w,y,z),( -w*.88,y,z+h*.45),(-w*.48,y,z+h),(0,y,z+h*1.05),(w*.48,y,z+h),(w*.88,y,z+h*.45),(w,y,z),(w*.86,y,z-h*.32),(w*.38,y,z-h*.48),(0,y,z-h*.52),(-w*.38,y,z-h*.48),(-w*.86,y,z-h*.32)])
    verts=[p for ring in outline for p in ring]; faces=[]; n=12
    for j in range(len(outline)-1):
        for i in range(n): faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.append(tuple(range(n-1,-1,-1))); faces.append(tuple((len(outline)-1)*n+i for i in range(n)))
    shell=obj_mesh('MANUAL_CONTINUOUS_SHELL',verts,faces,MATS['body_blue'],True); shell['role']='manual_cross_section_shell'; shell['reference']='reference-orthographic'
    # Spine/cockpit excavation and nose layers.
    box('MANUAL_SPINE',(0,.00,.37),(.14,.80,.045),MATS['dark'],.025)
    ellipsoid('MANUAL_COCKPIT_WELL',(0,.02,.40),(.20,.35,.025),MATS['dark'],32,18)
    box('MANUAL_NOSE_PANEL',(0,1.05,.43),(.08,.06,.025),MATS['accent_yellow'],.01)
    # Authored pod meshes with asymmetric outlines and physical inset.
    pod=[(.40,.29),(.30,.47),(.08,.57),(-.18,.54),(-.38,.40),(-.40,.29),(-.25,.22),(.05,.21),(.28,.24)]
    inset=[(.28,.32),(.21,.41),(.07,.48),(-.10,.46),(-.25,.36),(-.27,.29),(-.16,.26),(.04,.26),(.20,.28)]
    for s in (-1,1):
        extruded_profile('POD_YELLOW_L' if s<0 else 'POD_YELLOW_R',s*.28,s*.67,pod,MATS['accent_yellow'],.06)
        extruded_profile('POD_BLUE_INSET_L' if s<0 else 'POD_BLUE_INSET_R',s*.675,s*.71,inset,MATS['body_blue'],.018)
        tube('POD_SOCKET_L' if s<0 else 'POD_SOCKET_R',[(s*.28,.42,.45),(s*.17,.42,.42)],.018,MATS['metal_dark'])
        sphere('POD_BOLT_L' if s<0 else 'POD_BOLT_R',(s*.70,.25,.39),.010,MATS['metal'])
    # Manual deep cockpit and driver character.
    ellipsoid('SEAT',(0,-.02,.48),(.16,.27,.06),MATS['dark'],32,18); ellipsoid('SEAT_BACK',(0,-.22,.70),(.14,.08,.25),MATS['dark'],32,18)
    ellipsoid('PELVIS',(0,0,.53),(.13,.14,.07),MATS['pilot'],32,20); ellipsoid('TORSO',(0,0,.66),(.14,.18,.17),MATS['pilot'],32,20)
    ellipsoid('HELMET',(0,.05,.91),(.17,.18,.19),MATS['body_blue'],40,24); ellipsoid('FACE',(0,.24,.91),(.12,.025,.075),MATS['face'],32,20); box('VISOR',(0,.27,.885),(.085,.012,.026),MATS['glass'],.01)
    for s in (-1,1):
        ellipsoid('EYE_L' if s<0 else 'EYE_R',(s*.05,.29,.92),(.023,.009,.026),MATS['eye_white'],24,16); sphere('PUPIL_L' if s<0 else 'PUPIL_R',(s*.05,.30,.92),.008,MATS['dark'])
        tube('ARM_L' if s<0 else 'ARM_R',[(s*.11,.05,.71),(s*.17,.30,.66),(s*.09,.54,.66)],.030,MATS['pilot']); sphere('GLOVE_L' if s<0 else 'GLOVE_R',(s*.09,.56,.66),.038,MATS['accent_yellow']); tube('THIGH_L' if s<0 else 'THIGH_R',[(s*.10,-.03,.52),(s*.16,.18,.42),(s*.10,.38,.32)],.038,MATS['pilot'])
    ellipsoid('SIDE_FACE',(-.17,.06,.91),(.022,.11,.075),MATS['face'],32,20); box('SIDE_VISOR',(-.195,.08,.885),(.007,.065,.024),MATS['glass'],.008); ellipsoid('SIDE_EYE',(-.205,.11,.915),(.007,.022,.024),MATS['eye_white'],20,12); sphere('SIDE_PUPIL',(-.214,.11,.915),.007,MATS['dark'])
    torus('STEERING',(0,.56,.68),.10,.026,MATS['dark'],rot=(math.pi/2,0,0)); tube('COLUMN',[(0,.56,.68),(0,.34,.57)],.018,MATS['metal_dark'])
    # Front U and grille.
    u=[(-.44,.98,.29),(-.60,1.06,.29),(-.68,1.20,.29),(-.64,1.36,.29),(-.48,1.45,.29),(0,1.49,.29),(.48,1.45,.29),(.64,1.36,.29),(.68,1.20,.29),(.60,1.06,.29),(.44,.98,.29)]
    tube('BUMPER_U',u,.055,MATS['body_blue']); box('FRONT_GRILLE',(0,1.28,.31),(.23,.045,.08),MATS['metal_dark'],.025)
    for gx in (-.12,-.06,0,.06,.12): box('FRONT_SLOT_'+str(gx),(gx,1.23,.31),(.01,.012,.055),MATS['dark'],.004)
    for s in (-1,1): torus('BUMPER_COLLAR_L' if s<0 else 'BUMPER_COLLAR_R',(s*.60,1.33,.30),.052,.012,MATS['accent_yellow'],rot=(0,math.pi/2,0)); sphere('BUMPER_SOCKET_L' if s<0 else 'BUMPER_SOCKET_R',(s*.44,.98,.29),.018,MATS['metal_dark'])
    # Compact rear mechanical assembly.
    box('REAR_HOUSING',(0,-.68,.58),(.23,.18,.18),MATS['metal_dark'],.07)
    for s in (-1,1):
        cylinder('EXHAUST_L' if s<0 else 'EXHAUST_R',(s*.20,-.82,.68),.12,.30,MATS['metal'],rot=(math.pi/2,0,0)); cylinder('EXHAUST_CAP_L' if s<0 else 'EXHAUST_CAP_R',(s*.20,-.98,.68),.075,.02,MATS['dark'],rot=(math.pi/2,0,0)); coil('SPRING_L' if s<0 else 'SPRING_R',(s*.50,-.55,.46),'z',.04,.10,.22,MATS['accent_yellow']); tube('REAR_ARM_L' if s<0 else 'REAR_ARM_R',[(s*.35,-.55,.43),(s*.62,-.60,.34)],.022,MATS['metal_dark'])
    tube('REAR_BAR',[(-.58,-.88,.78),(0,-.90,.78),(.58,-.88,.78)],.045,MATS['body_blue']); box('REAR_CAP_L',(-.62,-.88,.78),(.06,.08,.055),MATS['accent_yellow'],.02); box('REAR_CAP_R',(.62,-.88,.78),(.06,.08,.055),MATS['accent_yellow'],.02); torus('REAR_OUTLET',(0,-.90,.50),.09,.022,MATS['dark'],rot=(math.pi/2,0,0)); box('REAR_GRILLE',(0,-.94,.36),(.15,.025,.07),MATS['body_blue'],.01)
    for gx in (-.09,-.03,.03,.09): box('GRILLE_'+str(gx),(gx,-.97,.36),(.01,.01,.05),MATS['dark'],.003)
    box('GROUND',(0,0,-.035),(2.2,2.2,.02),MATS['concept_ground'],0)
    sc=bpy.context.scene; sc['asset']='The Bubble Bumper'; sc['revision']='AAA_063_MANUAL_AUTHORIAL_SHELL'; sc['reference_views']='assets/reference-orthographic/{top,front,rear,side}.jpg'; sc['visual_gate']='pending'; sc['sol_gate']='pending'; sc['user_gate']='pending'
    return sc

def lights_and_camera():
    sc=bpy.context.scene; sc.world=bpy.data.worlds.new('BUBBLE_WORLD'); sc.render.engine='BLENDER_EEVEE'; sc.render.resolution_x=1024; sc.render.resolution_y=559; sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG'; sc.render.film_transparent=False
    sc.world.color=(.72,.74,.76)
    try: sc.view_settings.look='AgX - Medium High Contrast'
    except: pass
    target=Vector((0,.10,.48))
    def light(name,loc,energy,size,color):
        d=bpy.data.lights.new(name,'AREA'); d.energy=energy; d.shape='DISK'; d.size=size; d.color=color
        o=bpy.data.objects.new(name,d); COL.objects.link(o); o.location=loc; o.rotation_euler=(target-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    light('KEY',(-3,3,4),780,5,(1.0,.98,.94)); light('FILL',(3,1,2.5),480,4,(.55,.68,1.0)); light('RIM',(0,-4,2.5),360,4,(1.0,.84,.70))
    cams={
      'top':((0,0,5.0),(0,.05,.50),3.40),
      'profile':((-4.0,.05,1.1),(0,.10,.60),2.55),
      'front':((0,4.0,1.0),(0,.55,.48),2.45),
      'rear':((0,-4.0,1.1),(0,-.82,.55),2.35),
      'isometric':((-3.8,4.0,2.6),(0,.05,.60),2.55),
    }
    for name,(loc,t,ortho) in cams.items():
        d=bpy.data.cameras.new('CAM_'+name.upper()); d.type='ORTHO'; d.ortho_scale=ortho
        c=bpy.data.objects.new('CAM_'+name.upper(),d); COL.objects.link(c); c.location=loc; c.rotation_euler=(Vector(t)-Vector(loc)).to_track_quat('-Z','Y').to_euler();
        if name=='top': c.rotation_euler.rotate_axis('Z',-math.pi/2)
        sc['camera_'+name+'_ortho']=ortho
    sc.camera=bpy.data.objects['CAM_ISOMETRIC']
    return sc

def main():
    sc=create_scene(); lights_and_camera()
    os.makedirs(os.path.dirname(OUT),exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=OUT,compress=True)
    print('BUBBLE_BUMPER_BLOCKOUT_OK',OUT,'OBJECTS',len(bpy.data.objects))
if __name__=='__main__': main()