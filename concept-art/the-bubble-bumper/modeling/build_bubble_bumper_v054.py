import bpy, math, os, argparse, json
from mathutils import Vector

ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'bubble-bumper-v054.blend')
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
    pod_outline=[(.40,.30),(.30,.43),(.08,.50),(-.18,.48),(-.38,.38),(-.40,.29),(-.25,.22),(.04,.21),(.30,.24)]
    panel_outline=[(.28,.33),(.20,.40),(.08,.44),(-.10,.43),(-.24,.36),(-.27,.30),(-.15,.27),(.04,.27),(.20,.28)]
    for s in (-1,1):
        extruded_profile('SIDE_POD_YELLOW_L' if s<0 else 'SIDE_POD_YELLOW_R',s*.30,s*.68,[(y,z) for y,z in pod_outline],MATS['accent_yellow'],.065)
        extruded_profile('SIDE_POD_BLUE_INSET_L' if s<0 else 'SIDE_POD_BLUE_INSET_R',s*.685,s*.72,[(y,z) for y,z in panel_outline],MATS['body_blue'],.020)
        tube('POD_INNER_MOUNT_L' if s<0 else 'POD_INNER_MOUNT_R',[(s*.30,.42,.45),(s*.18,.42,.42)],.018,MATS['metal_dark'])
    # Wheels: rear visibly larger than front.
    for s in (-1,1):
        create_wheel('FRONT_WHEEL_L' if s<0 else 'FRONT_WHEEL_R',s*.50,.67,.28,.20,.22,MATS['rubber'])
        create_wheel('REAR_WHEEL_L' if s<0 else 'REAR_WHEEL_R',s*.62,-.54,.34,.285,.32,MATS['rubber'])
        cylinder('FRONT_HUB_L' if s<0 else 'FRONT_HUB_R',(s*.51,.67,.28),.085,.04,MATS['metal'],rot=(0,math.pi/2,0))
        cylinder('REAR_HUB_L' if s<0 else 'REAR_HUB_R',(s*.63,-.54,.34),.12,.04,MATS['metal'],rot=(0,math.pi/2,0))
    for s in (-1,1):
        torus('FRONT_TIRE_GROOVE_L' if s<0 else 'FRONT_TIRE_GROOVE_R',(s*.51,.67,.28),.175,.007,MATS['metal_dark'],rot=(0,math.pi/2,0))
        torus('REAR_TIRE_GROOVE_L' if s<0 else 'REAR_TIRE_GROOVE_R',(s*.63,-.54,.34),.245,.008,MATS['metal_dark'],rot=(0,math.pi/2,0))

    # Front bumper U in plan, within wheel envelope.
    bumper=[(-.45,.98,.28),(-.62,1.05,.28),(-.70,1.20,.28),(-.66,1.36,.28),(-.50,1.45,.28),(0,1.49,.28),(.50,1.45,.28),(.66,1.36,.28),(.70,1.20,.28),(.62,1.05,.28),(.45,.98,.28)]
    tube('FRONT_BUMPER_U',bumper,.055,MATS['body_blue'])
    for s in (-1,1):
        torus('BUMPER_COLLAR_L' if s<0 else 'BUMPER_COLLAR_R',(s*.66,1.35,.29),.06,.014,MATS['accent_yellow'],rot=(0,math.pi/2,0))
        sphere('BUMPER_SOCKET_L' if s<0 else 'BUMPER_SOCKET_R',(s*.45,.98,.28),.018,MATS['metal_dark'])
    # Orthographic front structure: true deep U plus central recessed grille.
    box('FRONT_GRILLE',(0,1.30,.32),(.27,.050,.090),MATS['metal_dark'],.025)
    for gx in (-.12,-.06,0,.06,.12): box('FRONT_GRILLE_SLOT_'+str(gx),(gx,1.245,.30),(.012,.012,.055),MATS['dark'],.004)
    for s in (-1,1):
        tube('BUMPER_RETURN_L' if s<0 else 'BUMPER_RETURN_R',[(s*.48,1.00,.29),(s*.60,1.10,.32),(s*.62,1.30,.35)],.045,MATS['body_blue'])
        torus('BUMPER_RETURN_COLLAR_L' if s<0 else 'BUMPER_RETURN_COLLAR_R',(s*.62,1.30,.35),.052,.012,MATS['accent_yellow'],rot=(0,math.pi/2,0))

    # Deep cockpit and seated character.
    ellipsoid('COCKPIT_WELL',(0,.05,.40),(.20,.38,.025),MATS['dark'],32,18)
    ellipsoid('SEAT',(0,-.02,.48),(.16,.28,.06),MATS['dark'],32,18)
    ellipsoid('SEAT_BACK',(0,-.22,.70),(.15,.09,.27),MATS['body_blue'],32,18)
    ellipsoid('PILOT_PELVIS',(0,.00,.53),(.13,.14,.07),MATS['pilot'],32,20)
    ellipsoid('PILOT_TORSO',(0,.00,.68),(.15,.19,.18),MATS['pilot'],32,20)
    ellipsoid('PILOT_HELMET',(0,.05,.91),(.18,.18,.19),MATS['body_blue'],40,24)
    ellipsoid('PILOT_FACE',(0,.22,.90),(.11,.025,.07),MATS['face'],32,20)
    box('PILOT_VISOR',(0,.25,.875),(.08,.012,.025),MATS['dark'],.012)
    for s in (-1,1):
        ellipsoid('EYE_L' if s<0 else 'EYE_R',(s*.05,.27,.91),(.022,.009,.026),MATS['eye_white'],24,16)
        sphere('PUPIL_L' if s<0 else 'PUPIL_R',(s*.05,.28,.91),.008,MATS['dark'])
        tube('PILOT_ARM_L' if s<0 else 'PILOT_ARM_R',[(s*.10,.06,.70),(s*.16,.30,.66),(s*.09,.54,.66)],.028,MATS['pilot'])
        sphere('PILOT_GLOVE_L' if s<0 else 'PILOT_GLOVE_R',(s*.09,.56,.66),.035,MATS['accent_yellow'])
        tube('PILOT_THIGH_L' if s<0 else 'PILOT_THIGH_R',[(s*.09,-.02,.52),(s*.15,.18,.42),(s*.10,.36,.32)],.035,MATS['pilot'])
    # Orthographic side identity: visible visor/eye, reclined torso, bent arm and leg.
    # Side orthographic reference: light face panel and eye must remain visible in profile.
    ellipsoid('PILOT_SIDE_FACE',(-.205,.08,.90),(.022,.115,.075),MATS['face'],32,20)
    box('PILOT_SIDE_VISOR',(-.230,.09,.875),(.006,.060,.022),MATS['glass'],.008)
    ellipsoid('PILOT_SIDE_EYE',(-.238,.115,.905),(.006,.022,.024),MATS['eye_white'],24,16)
    sphere('PILOT_SIDE_PUPIL',(-.246,.115,.905),.007,MATS['dark'])
    ellipsoid('PILOT_CHEST',(-.13,.00,.65),(.08,.16,.13),MATS['pilot'],28,18)
    tube('PILOT_SIDE_ARM',[(-.19,.04,.71),(-.25,.28,.66),(-.13,.52,.66)],.030,MATS['pilot'])
    sphere('PILOT_SIDE_GLOVE',(-.12,.54,.66),.038,MATS['accent_yellow'])
    tube('PILOT_SIDE_THIGH',[(-.13,-.05,.52),(-.18,.18,.42),(-.10,.38,.32)],.040,MATS['pilot'])
    tube('PILOT_SIDE_SHIN',[(-.10,.38,.32),(-.02,.58,.27)],.030,MATS['pilot'])
    box('PILOT_SIDE_BOOT',(-.01,.63,.25),(.055,.10,.025),MATS['dark'],.012)
    ellipsoid('SEAT_BACK_VISIBLE',(0,-.22,.68),(.14,.08,.25),MATS['dark'],32,18)

    box('HELMET_FRONT_STRIPE',(0,.105,1.03),(.025,.10,.018),MATS['accent_yellow'],.006)
    tube('HELMET_CHEEK_BAND',[(-.13,.20,.83),(0,.23,.81),(.13,.20,.83)],.012,MATS['body_blue'])

    torus('STEERING_WHEEL',(0,.56,.68),.10,.026,MATS['dark'],rot=(math.pi/2,0,0))
    tube('STEERING_COLUMN',[(0,.56,.68),(0,.34,.57)],.018,MATS['metal_dark'])
    # Rear compact assembly: high bar, yellow caps, two silver exhausts, central outlet, lower grille.
    box('REAR_ENGINE',(0,-.68,.58),(.23,.18,.18),MATS['metal_dark'],.07)
    for s in (-1,1):
        cylinder('REAR_EXHAUST_L' if s<0 else 'REAR_EXHAUST_R',(s*.25,-.80,.68),.125,.34,MATS['metal'],rot=(math.pi/2,0,0))
        cylinder('EXHAUST_CAP_L' if s<0 else 'EXHAUST_CAP_R',(s*.25,-.99,.68),.082,.020,MATS['dark'],rot=(math.pi/2,0,0))
        coil('SPRING_L' if s<0 else 'SPRING_R',(s*.50,-.55,.46),'z',.04,.10,.24,MATS['accent_yellow'])
        tube('REAR_ARM_L' if s<0 else 'REAR_ARM_R',[(s*.35,-.55,.43),(s*.62,-.60,.34)],.022,MATS['metal_dark'])
    # Orthographic reference accents: pod edge collars and exhaust lips.
    for s in (-1,1):
        tube('POD_YELLOW_EDGE_L' if s<0 else 'POD_YELLOW_EDGE_R',[(s*.55,.38,.54),(s*.55,-.38,.54)],.030,MATS['accent_yellow'])
        torus('EXHAUST_LIP_L' if s<0 else 'EXHAUST_LIP_R',(s*.22,-.98,.64),.070,.012,MATS['metal'],rot=(math.pi/2,0,0))

    for s in (-1,1):
        tube('REAR_EXHAUST_PIPE_L' if s<0 else 'REAR_EXHAUST_PIPE_R',[(s*.25,-.82,.66),(s*.34,-.94,.78),(s*.42,-1.02,.84)],.030,MATS['metal'])
        torus('REAR_EXHAUST_LIP2_L' if s<0 else 'REAR_EXHAUST_LIP2_R',(s*.42,-1.02,.84),.040,.010,MATS['metal'],rot=(math.pi/2,0,0))

    tube('REAR_BAR_BLUE',[(-.58,-.88,.78),(0,-.90,.78),(.58,-.88,.78)],.045,MATS['body_blue'])
    for s in (-1,1): tube('REAR_BAR_YELLOW_L' if s<0 else 'REAR_BAR_YELLOW_R',[(s*.48,-.88,.78),(s*.62,-.88,.78)],.05,MATS['accent_yellow'])
    torus('REAR_CENTER_OUTLET',(0,-.90,.50),.09,.022,MATS['dark'],rot=(math.pi/2,0,0))
    box('REAR_GRILLE',(0,-.92,.36),(.15,.025,.07),MATS['body_blue'],.01)
    for gx in (-.09,-.03,.03,.09): box('GRILLE_'+str(gx),(gx,-.95,.36),(.009,.01,.05),MATS['dark'],.003)
    # Ground/presentation.
    box('GROUND',(0,0,-.035),(2.2,2.2,.02),MATS['concept_ground'],0)
    sc=bpy.context.scene; sc['asset']='The Bubble Bumper'; sc['revision']='AAA_054_ORTHO_ASSEMBLY_DETAIL'; sc['source_concept']='concept-art/the-bubble-bumper/assets/the-bubble-bumper.jpg'; sc['source_orthos']='assets/reference-orthographic/{top,front,rear,side}.jpg'; sc['visual_gate']='pending'; sc['sol_gate']='pending'; sc['user_gate']='pending'
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