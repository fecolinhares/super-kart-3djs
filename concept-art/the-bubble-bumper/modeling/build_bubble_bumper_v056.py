import bpy, math, os, argparse, json
from mathutils import Vector

ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'bubble-bumper-v056.blend')
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
    COL=bpy.data.collections.new('BUBBLE_BUMPER_MASTER'); bpy.context.scene.collection.children.link(COL)
    MATS['body_blue']=mat('Body Blue',(0.006,0.06,0.36),0.12,.28)
    MATS['accent_yellow']=mat('Custom Yellow',(0.95,0.54,0.01),0.03,.25)
    MATS['rubber']=mat('Smooth Rubber',(0.006,0.007,0.009),0.0,.78)
    MATS['dark']=mat('Structure Dark',(0.012,0.016,0.025),0.15,.48)
    MATS['metal']=mat('Silver Metal',(.42,.46,.52),0.5,.24)
    MATS['metal_dark']=mat('Dark Metal',(.06,.08,.11),0.65,.30)
    MATS['glass']=mat('Visor',(.02,.08,.14),0.1,.10)
    MATS['pilot']=mat('Pilot Suit',(.015,.06,.22),0.0,.42)
    MATS['face']=mat('Face',(.58,.66,.68),0.0,.34)
    MATS['eye_white']=mat('Eye White',(.96,.96,.92),0.0,.22)
    MATS['concept_ground']=mat('Concept Ground',(.62,.64,.66),0.0,.92)

    # Fixed dimensions from the four orthographic references: compact kart, wheels at corners.
    box('CHASSIS_SPINE',(0,.02,.36),(.15,.88,.045),MATS['dark'],.025)
    loft_y('BODY_SHELL',[(1.05,0,.43,.13,.07),(.70,0,.46,.22,.09),(.15,0,.49,.25,.11),(-.38,0,.50,.22,.12),(-.70,0,.50,.15,.09)],MATS['body_blue'],48)
    # Short front nose and central yellow intake.
    loft_y('NOSE',[(.72,0,.45,.13,.07),(1.03,0,.43,.18,.08),(1.20,0,.37,.10,.055)],MATS['body_blue'],48)
    box('NOSE_YELLOW',(0,1.10,.43),(.08,.06,.025),MATS['accent_yellow'],.012)
    # Rounded side pods: yellow outer profile, blue recessed panel, tied to the spine.
    pod_outline=[(.46,.30),(.36,.48),(.12,.59),(-.18,.57),(-.42,.43),(-.48,.30),(-.30,.22),(.06,.21),(.34,.24)]
    panel_outline=[(.34,.33),(.26,.43),(.10,.49),(-.12,.48),(-.29,.39),(-.34,.31),(-.20,.27),(.05,.27),(.25,.28)]
    for s in (-1,1):
        extruded_profile('SIDE_POD_YELLOW_L' if s<0 else 'SIDE_POD_YELLOW_R',s*.30,s*.68,[(y,z) for y,z in pod_outline],MATS['accent_yellow'],.065)
        extruded_profile('SIDE_POD_BLUE_INSET_L' if s<0 else 'SIDE_POD_BLUE_INSET_R',s*.685,s*.72,[(y,z) for y,z in panel_outline],MATS['body_blue'],.020)
        tube('POD_INNER_MOUNT_L' if s<0 else 'POD_INNER_MOUNT_R',[(s*.30,.42,.45),(s*.18,.42,.42)],.018,MATS['metal_dark'])
    # Wheels: rear visibly larger than front.
    for s in (-1,1):
        create_wheel('FRONT_WHEEL_L' if s<0 else 'FRONT_WHEEL_R',s*.55,.74,.28,.22,.22,MATS['rubber'])
        create_wheel('REAR_WHEEL_L' if s<0 else 'REAR_WHEEL_R',s*.68,-.63,.34,.30,.32,MATS['rubber'])
        cylinder('FRONT_HUB_L' if s<0 else 'FRONT_HUB_R',(s*.56,.74,.28),.085,.04,MATS['metal'],rot=(0,math.pi/2,0))
        cylinder('REAR_HUB_L' if s<0 else 'REAR_HUB_R',(s*.69,-.63,.34),.12,.04,MATS['metal'],rot=(0,math.pi/2,0))
    # Front bumper U in plan, within wheel envelope.
    bumper=[(-.45,.98,.28),(-.62,1.05,.28),(-.70,1.20,.28),(-.66,1.36,.28),(-.50,1.45,.28),(0,1.49,.28),(.50,1.45,.28),(.66,1.36,.28),(.70,1.20,.28),(.62,1.05,.28),(.45,.98,.28)]
    tube('FRONT_BUMPER_U',bumper,.055,MATS['body_blue'])
    for s in (-1,1):
        torus('BUMPER_COLLAR_L' if s<0 else 'BUMPER_COLLAR_R',(s*.66,1.35,.29),.06,.014,MATS['accent_yellow'],rot=(0,math.pi/2,0))
        sphere('BUMPER_SOCKET_L' if s<0 else 'BUMPER_SOCKET_R',(s*.45,.98,.28),.018,MATS['metal_dark'])
    tube('FRONT_BUMPER_CROSSBAR',[(-.58,1.28,.30),(0,1.30,.30),(.58,1.28,.30)],.060,MATS['body_blue'])
    for s in (-1,1):
        box('FRONT_BUMPER_YELLOW_CAP_L' if s<0 else 'FRONT_BUMPER_YELLOW_CAP_R',(s*.62,1.27,.30),(.055,.09,.055),MATS['accent_yellow'],.020)
        ellipsoid('FRONT_LIGHT_L' if s<0 else 'FRONT_LIGHT_R',(s*.22,1.16,.48),(.055,.025,.035),MATS['accent_yellow'],24,16)

    # Deep cockpit and seated character.
    ellipsoid('COCKPIT_WELL',(0,.05,.40),(.20,.38,.025),MATS['dark'],32,18)
    ellipsoid('SEAT',(0,-.02,.48),(.16,.28,.06),MATS['dark'],32,18)
    ellipsoid('SEAT_BACK',(0,-.22,.70),(.15,.09,.27),MATS['body_blue'],32,18)
    ellipsoid('PILOT_PELVIS',(0,.00,.53),(.13,.14,.07),MATS['pilot'],32,20)
    ellipsoid('PILOT_TORSO',(0,.00,.66),(.12,.16,.16),MATS['pilot'],32,20)
    ellipsoid('PILOT_HELMET',(0,.05,.90),(.15,.16,.17),MATS['body_blue'],40,24)
    ellipsoid('PILOT_FACE',(0,.22,.90),(.11,.025,.07),MATS['face'],32,20)
    box('PILOT_VISOR',(0,.25,.875),(.08,.012,.025),MATS['dark'],.012)
    for s in (-1,1):
        ellipsoid('EYE_L' if s<0 else 'EYE_R',(s*.05,.27,.91),(.022,.009,.026),MATS['eye_white'],24,16)
        sphere('PUPIL_L' if s<0 else 'PUPIL_R',(s*.05,.28,.91),.008,MATS['dark'])
        tube('PILOT_ARM_L' if s<0 else 'PILOT_ARM_R',[(s*.10,.06,.70),(s*.16,.30,.66),(s*.09,.54,.66)],.028,MATS['pilot'])
        sphere('PILOT_GLOVE_L' if s<0 else 'PILOT_GLOVE_R',(s*.09,.56,.66),.035,MATS['accent_yellow'])
        tube('PILOT_THIGH_L' if s<0 else 'PILOT_THIGH_R',[(s*.09,-.02,.52),(s*.15,.18,.42),(s*.10,.36,.32)],.035,MATS['pilot'])
    ellipsoid('PILOT_SIDE_FACE',(-.17,.07,.91),(.020,.11,.070),MATS['face'],28,18)
    box('PILOT_SIDE_VISOR',(-.195,.09,.885),(.008,.065,.025),MATS['glass'],.008)
    ellipsoid('PILOT_SIDE_EYE',(-.205,.12,.915),(.008,.022,.024),MATS['eye_white'],20,12)
    sphere('PILOT_SIDE_PUPIL',(-.214,.12,.915),.007,MATS['dark'])

    torus('STEERING_WHEEL',(0,.56,.68),.10,.026,MATS['dark'],rot=(math.pi/2,0,0))
    tube('STEERING_COLUMN',[(0,.56,.68),(0,.34,.57)],.018,MATS['metal_dark'])
    # Rear compact assembly: high bar, yellow caps, two silver exhausts, central outlet, lower grille.
    box('REAR_ENGINE',(0,-.68,.58),(.23,.18,.18),MATS['metal_dark'],.07)
    for s in (-1,1):
        cylinder('REAR_EXHAUST_L' if s<0 else 'REAR_EXHAUST_R',(s*.22,-.83,.64),.10,.28,MATS['metal'],rot=(math.pi/2,0,0))
        cylinder('EXHAUST_CAP_L' if s<0 else 'EXHAUST_CAP_R',(s*.22,-.98,.64),.07,.018,MATS['dark'],rot=(math.pi/2,0,0))
        coil('SPRING_L' if s<0 else 'SPRING_R',(s*.50,-.55,.46),'z',.04,.10,.24,MATS['accent_yellow'])
        tube('REAR_ARM_L' if s<0 else 'REAR_ARM_R',[(s*.35,-.55,.43),(s*.62,-.60,.34)],.022,MATS['metal_dark'])
    tube('REAR_BAR_BLUE',[(-.58,-.88,.78),(0,-.90,.78),(.58,-.88,.78)],.045,MATS['body_blue'])
    for s in (-1,1): tube('REAR_BAR_YELLOW_L' if s<0 else 'REAR_BAR_YELLOW_R',[(s*.48,-.88,.78),(s*.62,-.88,.78)],.05,MATS['accent_yellow'])
    torus('REAR_CENTER_OUTLET',(0,-.90,.50),.09,.022,MATS['dark'],rot=(math.pi/2,0,0))
    box('REAR_GRILLE',(0,-.92,.36),(.15,.025,.07),MATS['body_blue'],.01)
    for gx in (-.09,-.03,.03,.09): box('GRILLE_'+str(gx),(gx,-.95,.36),(.009,.01,.05),MATS['dark'],.003)
    # AAA secondary forms on the orthographic reconstruction.
    # cockpit/backrest, harness and dashboard controls
    box('SEAT_BACK',(0,-.22,.70),(.14,.07,.24),MATS['dark'],.035)
    box('HARNESS_BUCKLE',(0,.00,.62),(.025,.018,.025),MATS['accent_yellow'],.006)
    box('DASH_PANEL',(0,.48,.60),(.12,.03,.03),MATS['metal_dark'],.008)
    for s in (-1,1):
        cylinder('DASH_SWITCH_L' if s<0 else 'DASH_SWITCH_R',(s*.05,.45,.64),.012,.012,MATS['accent_yellow'],rot=(math.pi/2,0,0))
        tube('PEDAL_ARM_L' if s<0 else 'PEDAL_ARM_R',[(s*.06,.30,.42),(s*.06,.48,.30)],.014,MATS['metal_dark'])
        box('PEDAL_L' if s<0 else 'PEDAL_R',(s*.06,.52,.28),(.03,.04,.012),MATS['metal_dark'],.008)
    # panel seams and fasteners on the side pods
    for s in (-1,1):
        tube('POD_SEAM_L' if s<0 else 'POD_SEAM_R',[(s*.70,.28,.49),(s*.70,-.28,.49)],.010,MATS['dark'])
        for y in (-.25,.25): sphere('POD_BOLT_L' if s<0 else 'POD_BOLT_R',(s*.72,y,.39),.010,MATS['metal'])
        torus('POD_SOCKET_L' if s<0 else 'POD_SOCKET_R',(s*.30,.42,.44),.026,.008,MATS['metal_dark'],rot=(math.pi/2,0,0))
    # wheel rims, hub caps, spokes and springs at exact centers
    for s in (-1,1):
        torus('FRONT_RIM_RING_L' if s<0 else 'FRONT_RIM_RING_R',(s*.56,.74,.28),.060,.010,MATS['metal'],rot=(0,math.pi/2,0))
        torus('REAR_RIM_RING_L' if s<0 else 'REAR_RIM_RING_R',(s*.69,-.63,.34),.080,.012,MATS['metal'],rot=(0,math.pi/2,0))
        coil('FRONT_SPRING_L' if s<0 else 'FRONT_SPRING_R',(s*.42,.70,.42),'z',.035,.10,.22,MATS['accent_yellow'])
        coil('REAR_SPRING_L' if s<0 else 'REAR_SPRING_R',(s*.53,-.56,.46),'z',.040,.11,.24,MATS['accent_yellow'])
        tube('REAR_ARM_L' if s<0 else 'REAR_ARM_R',[(s*.34,-.55,.43),(s*.62,-.60,.34)],.022,MATS['metal_dark'])
    # front grille and bumper sockets
    for gx in (-.12,-.06,0,.06,.12): box('FRONT_SLOT_'+str(gx),(gx,1.25,.30),(.010,.012,.055),MATS['dark'],.004)
    for s in (-1,1):
        sphere('BUMPER_SOCKET_L' if s<0 else 'BUMPER_SOCKET_R',(s*.45,.98,.28),.018,MATS['metal_dark'])
        torus('BUMPER_COLLAR_L' if s<0 else 'BUMPER_COLLAR_R',(s*.62,1.30,.35),.052,.012,MATS['accent_yellow'],rot=(0,math.pi/2,0))
    # compact rear module detail: twin silver barrels, caps, clamps, fins, outlet and grille
    for s in (-1,1):
        cylinder('REAR_BARREL_L' if s<0 else 'REAR_BARREL_R',(s*.20,-.82,.70),.155,.34,MATS['metal'],rot=(math.pi/2,0,0))
        cylinder('REAR_BARREL_CAP_L' if s<0 else 'REAR_BARREL_CAP_R',(s*.20,-1.01,.70),.105,.020,MATS['dark'],rot=(math.pi/2,0,0))
        torus('REAR_CLAMP_L' if s<0 else 'REAR_CLAMP_R',(s*.22,-.89,.64),.112,.010,MATS['accent_yellow'],rot=(math.pi/2,0,0))
        tube('REAR_PIPE_L' if s<0 else 'REAR_PIPE_R',[(s*.22,-.80,.64),(s*.32,-.93,.74),(s*.38,-1.00,.80)],.028,MATS['metal'])
    for gx in (-.10,-.05,0,.05,.10): box('REAR_GRILLE_'+str(gx),(gx,-.95,.36),(.010,.012,.06),MATS['dark'],.004)

    # Ground/presentation.
    box('GROUND',(0,0,-.035),(2.2,2.2,.02),MATS['concept_ground'],0)
    sc=bpy.context.scene; sc['asset']='The Bubble Bumper'; sc['revision']='AAA_056_ORTHO_REAR_FRONT_ARCHITECTURE'; sc['source_concept']='concept-art/the-bubble-bumper/assets/the-bubble-bumper.jpg'; sc['source_orthos']='assets/reference-orthographic/{top,front,rear,side}.jpg'; sc['visual_gate']='pending'; sc['sol_gate']='pending'; sc['user_gate']='pending'
    return sc

def lights_and_camera():
    sc=bpy.context.scene; sc.world=bpy.data.worlds.new('BUBBLE_WORLD'); sc.render.engine='BLENDER_EEVEE'; sc.render.resolution_x=960; sc.render.resolution_y=720; sc.render.resolution_percentage=100
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
        c=bpy.data.objects.new('CAM_'+name.upper(),d); COL.objects.link(c); c.location=loc; c.rotation_euler=(Vector(t)-Vector(loc)).to_track_quat('-Z','Y').to_euler(); sc['camera_'+name+'_ortho']=ortho
    sc.camera=bpy.data.objects['CAM_ISOMETRIC']
    return sc

def main():
    sc=create_scene(); lights_and_camera()
    os.makedirs(os.path.dirname(OUT),exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=OUT,compress=True)
    print('BUBBLE_BUMPER_BLOCKOUT_OK',OUT,'OBJECTS',len(bpy.data.objects))
if __name__=='__main__': main()