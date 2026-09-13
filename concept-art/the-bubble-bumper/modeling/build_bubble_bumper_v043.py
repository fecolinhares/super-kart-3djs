import bpy, math, os, argparse, json
from mathutils import Vector

ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'bubble-bumper-v043.blend')
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
    MATS['body_blue']=mat('Body Blue',(0.004,0.055,0.34),0.12,.32)
    MATS['accent_yellow']=mat('Custom Yellow',(0.95,0.52,0.005),0.04,.28)
    MATS['rubber']=mat('Smooth Rubber',(0.008,0.010,0.014),0.0,.72)
    MATS['dark']=mat('Cockpit Dark',(0.012,0.020,0.035),0.05,.50)
    MATS['metal']=mat('Technical Silver',(0.52,0.56,0.62),0.45,.22)
    MATS['metal_dark']=mat('Technical Dark',(0.025,0.035,0.05),0.70,.34)
    MATS['concept_ground']=mat('Concept Blueprint Ground',(.60,.62,.64),0.0,.92)
    MATS['glass']=mat('Cockpit Glass',(0.02,0.12,0.24),0.1,.12,emission=(0.01,0.03,0.05))
    MATS['face']=mat('Pilot Face',(0.58,0.66,0.68),0.0,.34)
    MATS['eye_white']=mat('Eye White',(.96,.96,.92),0.0,.24)
    MATS['pilot']=mat('Pilot Suit',(0.02,0.10,0.38),0.0,.42)
    MATS['pilot_yellow']=mat('Pilot Accent',(0.95,0.72,0.02),0.0,.38)

    # V018 follows the concept proportions: narrow/long kart, high central pilot,
    # large yellow side pods, short front U, compact exposed rear engine.
    body=loft_y('BODY_CHASSIS',[(1.18,0,.32,.16,.07),(.82,0,.34,.28,.10),(.15,0,.36,.31,.12),(-.55,0,.40,.28,.13),(-1.02,0,.43,.20,.10)],MATS['body_blue'],24)
    body['role']='long_narrow_concept_chassis'

    # Front nose / dashboard, clearly ahead of the pilot.
    nose=loft_y('NOSE',[ (.92,0,.44,.15,.08),(1.18,0,.43,.20,.09),(1.38,0,.38,.13,.065)],MATS['body_blue'],20)
    box('NOSE_YELLOW_PANEL',(0,1.29,.43),(.10,.025,.055),MATS['accent_yellow'],.012)
    box('DASH_TOP',(0,.63,.56),(.18,.16,.035),MATS['dark'],.018)
    box('DASH_YELLOW',(0,.65,.595),(.12,.08,.018),MATS['accent_yellow'],.010)

    # Four corner wheels: deliberately outside the narrow body, as in the reference.
    for s in (-1,1):
        create_wheel('WHEEL_FL' if s<0 else 'WHEEL_FR',s*.53,.82,.28,.220,.22,MATS['rubber'])
        create_wheel('WHEEL_RL' if s<0 else 'WHEEL_RR',s*.62,-.64,.34,.300,.32,MATS['rubber'])

    # Short front U bumper in the frontal plane: endpoints rise, center drops, as in the concept.
    bumper=[(-.50,1.00,.32),(-.64,1.06,.32),(-.72,1.18,.32),(-.68,1.34,.32),(-.52,1.43,.32),(0,1.47,.32),(.52,1.43,.32),(.68,1.34,.32),(.72,1.18,.32),(.64,1.06,.32),(.50,1.00,.32)]
    tube('FRONT_BUMPER_U',bumper,.060,MATS['body_blue'])
    for s in (-1,1):
        tube('BUMPER_YELLOW_BAND_L' if s<0 else 'BUMPER_YELLOW_BAND_R',[(s*.77,1.40,.34),(s*.80,1.40,.40)],.062,MATS['accent_yellow'])
        sphere('BUMPER_SHELL_MOUNT_L' if s<0 else 'BUMPER_SHELL_MOUNT_R',(s*.42,1.18,.33),.018,MATS['metal_dark'])

    # Bumper collars and inset nose seams.
    for s in (-1,1):
        torus('BUMPER_COLLAR_L' if s<0 else 'BUMPER_COLLAR_R',(s*.68,1.33,.34),.070,.014,MATS['accent_yellow'],rot=(0,math.pi/2,0))
    tube('NOSE_PANEL_SEAM',[(-.11,1.31,.39),(0,1.34,.39),(.11,1.31,.39)],.009,MATS['dark'])
    for s in (-1,1):
        ellipsoid('NOSE_LIGHT_L' if s<0 else 'NOSE_LIGHT_R',(s*.075,1.255,.49),(.028,.010,.018),MATS['accent_yellow'],20,12)

    box('NOSE_BLUE_INSET',(0,1.255,.48),(.075,.012,.035),MATS['body_blue'],.008)

    # Integrated side-pod/fender masses: blue structural volume first, yellow panel second.
    # The yellow is an inset/customization region, never a floating capsule.
    for s in (-1,1):
        pod_outline=[(.60,.31),(.50,.48),(.25,.62),(-.12,.66),(-.43,.53),(-.58,.35),(-.43,.25),(-.10,.22),(.32,.24)]
        extruded_profile('SIDE_POD_BLUE_BASE_L' if s<0 else 'SIDE_POD_BLUE_BASE_R',s*.28,s*.70,[(y,z) for y,z in pod_outline],MATS['body_blue'],.07)
        panel_outline=[(.47,.34),(.39,.45),(.20,.54),(-.08,.56),(-.34,.47),(-.45,.35),(-.31,.29),(-.05,.28),(.27,.29)]
        extruded_profile('SIDE_POD_YELLOW_PANEL_L' if s<0 else 'SIDE_POD_YELLOW_PANEL_R',s*.695,s*.745,[(y,z) for y,z in panel_outline],MATS['accent_yellow'],.025)
        # blue front/rear bridges make the side volume read as one continuous shell
        tube('POD_BLUE_BRIDGE_FRONT_L' if s<0 else 'POD_BLUE_BRIDGE_FRONT_R',[(s*.25,.52,.42),(s*.48,.52,.45)],.055,MATS['body_blue'])
        tube('POD_BLUE_BRIDGE_REAR_L' if s<0 else 'POD_BLUE_BRIDGE_REAR_R',[(s*.25,-.42,.43),(s*.48,-.42,.46)],.055,MATS['body_blue'])
        tube('POD_CHASSIS_MOUNT_FRONT_L' if s<0 else 'POD_CHASSIS_MOUNT_FRONT_R',[(s*.25,.55,.42),(s*.36,.55,.43)],.020,MATS['metal_dark'])
        tube('POD_CHASSIS_MOUNT_REAR_L' if s<0 else 'POD_CHASSIS_MOUNT_REAR_R',[(s*.25,-.42,.43),(s*.40,-.42,.45)],.020,MATS['metal_dark'])

    # Small yellow mirrors and dark panel seams echo the concept's secondary language.
    for s in (-1,1):
        tube('SIDE_MIRROR_STALK_L' if s<0 else 'SIDE_MIRROR_STALK_R',[(s*.48,-.36,.62),(s*.56,-.39,.68)],.014,MATS['metal_dark'])
        box('SIDE_MIRROR_L' if s<0 else 'SIDE_MIRROR_R',(s*.59,-.40,.70),(.045,.065,.028),MATS['accent_yellow'],.018)
        tube('POD_PANEL_SEAM_L' if s<0 else 'POD_PANEL_SEAM_R',[(s*.59,-.30,.56),(s*.59,.30,.56)],.010,MATS['dark'])
        tube('POD_LOWER_RAIL_L' if s<0 else 'POD_LOWER_RAIL_R',[(s*.52,-.38,.31),(s*.52,.38,.31)],.014,MATS['metal_dark'])

    # Concept side skirts: low, long and horizontal, with a blue structural shoulder above.
    for s in (-1,1):
        # Outer-facing blue inset panel, framed by the yellow side skirt.
        # Rounded rectangular blue inset, matching the concept panel rather than a stripe.
        inset_outline=[(.32,.35),(.27,.42),(.13,.47),(-.08,.47),(-.24,.41),(-.30,.35),(-.22,.32),(-.05,.31),(.18,.31)]
        extruded_profile('SIDE_POD_VISIBLE_BLUE_INSET_L' if s<0 else 'SIDE_POD_VISIBLE_BLUE_INSET_R',s*.748,s*.765,[(y,z) for y,z in inset_outline],MATS['body_blue'],.012)
        tube('SIDE_POD_PANEL_BORDER_TOP_L' if s<0 else 'SIDE_POD_PANEL_BORDER_TOP_R',[(s*.755,.28,.49),(s*.755,-.28,.49)],.012,MATS['dark'])
        tube('SIDE_POD_PANEL_BORDER_BOTTOM_L' if s<0 else 'SIDE_POD_PANEL_BORDER_BOTTOM_R',[(s*.755,.28,.29),(s*.755,-.28,.29)],.012,MATS['dark'])
        tube('POD_BLUE_SHOULDER_L' if s<0 else 'POD_BLUE_SHOULDER_R',[(s*.28,.48,.50),(s*.34,.10,.56),(s*.28,-.38,.50)],.060,MATS['body_blue'])
        # small rounded blue wheel-arch lips, not oversized loops
        tube('POD_FRONT_ARCH_L' if s<0 else 'POD_FRONT_ARCH_R',[(s*.55,.67,.38),(s*.66,.78,.47),(s*.70,.91,.38)],.028,MATS['body_blue'])
        tube('POD_REAR_ARCH_L' if s<0 else 'POD_REAR_ARCH_R',[(s*.62,-.55,.39),(s*.70,-.70,.48),(s*.66,-.86,.39)],.028,MATS['body_blue'])

    for s in (-1,1):
        ellipsoid('FRONT_FENDER_CAP_L' if s<0 else 'FRONT_FENDER_CAP_R',(s*.53,.82,.42),(.15,.20,.055),MATS['body_blue'],32,18)

    # Narrow central spine and layered cowl: the concept is a kart chassis, not a single blob.
    box('CHASSIS_SPINE',(0,.02,.38),(.16,.72,.055),MATS['dark'],.035)
    front_cowl=loft_y('FRONT_COWL',[(.42,0,.46,.16,.07),(.62,0,.50,.25,.11),(.84,0,.49,.29,.13),(1.02,0,.43,.18,.08)],MATS['body_blue'],48); front_cowl['role']='continuous_nose_cowl_shell'
    box('FRONT_COWL_YELLOW',(0,.84,.50),(.115,.10,.028),MATS['accent_yellow'],.012)
    tube('COWL_LEFT_SHOULDER',[(-.20,.70,.50),(-.34,.40,.48)],.035,MATS['body_blue'])
    tube('COWL_RIGHT_SHOULDER',[(.20,.70,.50),(.34,.40,.48)],.035,MATS['body_blue'])

    # Pod panel fasteners and real socket collars.
    for s in (-1,1):
        for y in (-.27,.27):
            sphere('POD_FASTENER_L' if s<0 else 'POD_FASTENER_R',(s*.755,y,.39),.010,MATS['metal'])
        torus('POD_SOCKET_L' if s<0 else 'POD_SOCKET_R',(s*.30,.50,.48),.028,.008,MATS['metal_dark'],rot=(math.pi/2,0,0))

    # Central blue cockpit shoulder shell creates a continuous cradle around the pilot.
    box('COCKPIT_LEFT_SHOULDER',(-.20,.02,.55),(.18,.43,.14),MATS['body_blue'],.085)
    box('COCKPIT_RIGHT_SHOULDER',(.20,.02,.55),(.18,.43,.14),MATS['body_blue'],.085)
    box('COCKPIT_FRONT_BRIDGE',(0,.48,.58),(.22,.10,.045),MATS['dark'],.025)
    box('COCKPIT_REAR_BRIDGE',(0,-.30,.62),(.22,.08,.050),MATS['body_blue'],.025)

    # Visible smooth hub rings and axle caps.
    for s in (-1,1):
        cylinder('FRONT_HUB_L' if s<0 else 'FRONT_HUB_R',(s*.535,.82,.28),.085,.035,MATS['metal'],rot=(0,math.pi/2,0))
        cylinder('FRONT_HUB_CAP_L' if s<0 else 'FRONT_HUB_CAP_R',(s*.558,.82,.28),.040,.042,MATS['dark'],rot=(0,math.pi/2,0))
        cylinder('REAR_HUB_L' if s<0 else 'REAR_HUB_R',(s*.625,-.64,.34),.125,.035,MATS['metal'],rot=(0,math.pi/2,0))
        cylinder('REAR_HUB_CAP_L' if s<0 else 'REAR_HUB_CAP_R',(s*.648,-.64,.34),.060,.042,MATS['dark'],rot=(0,math.pi/2,0))

    # Recessed cockpit, seat and large pilot occupying the central bay.
    ellipsoid('COCKPIT_WELL',(0,.12,.39),(.22,.42,.025),MATS['dark'],24,12)
    ellipsoid('SEAT',(0,.06,.47),(.18,.32,.065),MATS['dark'],20,12)
    ellipsoid('PILOT_PELVIS',(0,.03,.54),(.14,.15,.075),MATS['pilot'],18,12)
    ellipsoid('PILOT_TORSO',(0,.08,.70),(.14,.16,.18),MATS['pilot'],18,12)
    ellipsoid('PILOT_SHOULDER_PAD_L',(-.13,.00,.70),(.075,.10,.045),MATS['accent_yellow'],24,16)
    ellipsoid('PILOT_SHOULDER_PAD_R',(.13,.00,.70),(.075,.10,.045),MATS['accent_yellow'],24,16)
    tube('PILOT_NECK',[(0,.08,.82),(0,.08,.88)],.052,MATS['pilot'])
    # High backrest/headrest and expressive face from the reference.
    ellipsoid('SEAT_BACK',(0,-.18,.72),(.16,.10,.30),MATS['body_blue'],32,18)
    box('SEAT_BACK_YELLOW',(0,-.275,.78),(.10,.018,.12),MATS['accent_yellow'],.012)
    # Two black headrests are a defining top/profile silhouette cue in the reference.
    for s in (-1,1):
        tube('HEADREST_POST_L' if s<0 else 'HEADREST_POST_R',[(s*.16,-.30,.76),(s*.16,-.30,.97)],.018,MATS['metal_dark'])
        box('HEADREST_PAD_L' if s<0 else 'HEADREST_PAD_R',(s*.16,-.30,1.00),(.085,.045,.070),MATS['rubber'],.035)

    ellipsoid('PILOT_HELMET',(0,.08,.88),(.16,.15,.16),MATS['pilot'],40,24)
    # Low continuous nose bridge connecting cowl, bumper and cockpit.
    nose_bridge=loft_y('NOSE_CONTINUOUS_BRIDGE',[(.48,0,.49,.16,.06),(.66,0,.52,.25,.08),(.86,0,.50,.22,.07),(1.02,0,.45,.14,.055)],MATS['body_blue'],48)
    box('NOSE_BRIDGE_YELLOW',(0,.92,.505),(.095,.065,.022),MATS['accent_yellow'],.012)

    # Reference-matched helmet: blue shell, light face panel, white cartoon eyes, yellow forehead stripe.
    ellipsoid('PILOT_FACE',(0,.235,.89),(.115,.028,.075),MATS['face'],32,20)
    box('PILOT_VISOR_RECESS',(0,.266,.865),(.088,.012,.022),MATS['dark'],.012)
    for s in (-1,1):
        ellipsoid('PILOT_EYE_L' if s<0 else 'PILOT_EYE_R',(s*.050,.282,.902),(.025,.009,.028),MATS['eye_white'],24,16)
        sphere('PILOT_PUPIL_L' if s<0 else 'PILOT_PUPIL_R',(s*.050,.292,.902),.009,MATS['dark'])
    box('HELMET_YELLOW_STRIPE',(0,.08,1.035),(.028,.13,.018),MATS['accent_yellow'],.006)
    tube('HELMET_BLUE_BAND',[(-.14,.22,.84),(0,.25,.82),(.14,.22,.84)],.014,MATS['body_blue'])
    torus('STEERING_WHEEL',(0,.58,.70),.105,.028,MATS['dark'],rot=(math.pi/2,0,0))
    tube('STEERING_COLUMN',[(0,.58,.70),(0,.38,.59)],.020,MATS['metal_dark'])
    for s in (-1,1):
        tube('PILOT_ARM_L' if s<0 else 'PILOT_ARM_R',[(s*.11,.10,.76),(s*.16,.38,.72),(s*.09,.56,.70)],.028,MATS['pilot'])
        tube('PILOT_THIGH_L' if s<0 else 'PILOT_THIGH_R',[(s*.10,.02,.55),(s*.14,-.20,.48),(s*.12,-.35,.43)],.035,MATS['pilot'])

    # Visible reclined shoulder mass and two-segment arms, matching the character silhouette.
    ellipsoid('PILOT_SHOULDER_LEFT',(-.13,.00,.67),(.10,.13,.10),MATS['pilot'],28,18)
    ellipsoid('PILOT_SHOULDER_RIGHT',(.13,.00,.67),(.10,.13,.10),MATS['pilot'],28,18)
    for s in (-1,1):
        tube('PILOT_FOREARM_L' if s<0 else 'PILOT_FOREARM_R',[(s*.13,.10,.70),(s*.18,.34,.67),(s*.10,.52,.69)],.025,MATS['pilot'])

    # Hands/gloves close the visual chain from arms to steering wheel.
    for s in (-1,1):
        sphere('PILOT_GLOVE_L' if s<0 else 'PILOT_GLOVE_R',(s*.095,.56,.70),.035,MATS['pilot_yellow'])
        tube('PILOT_HARNESS_L' if s<0 else 'PILOT_HARNESS_R',[(s*.09,.02,.61),(s*.12,-.20,.65)],.012,MATS['accent_yellow'])

    # AAA cockpit hardware: harness buckles, dash switches, pedals and column mount.
    box('HARNESS_BUCKLE',(0,.00,.62),(.025,.018,.025),MATS['accent_yellow'],.006)
    box('DASH_SWITCH_PANEL',(0,.52,.61),(.12,.025,.028),MATS['metal_dark'],.008)
    for s in (-1,1):
        cylinder('DASH_SWITCH_L' if s<0 else 'DASH_SWITCH_R',(s*.055,.495,.64),.012,.012,MATS['accent_yellow'],rot=(math.pi/2,0,0))
        tube('PEDAL_ARM_L' if s<0 else 'PEDAL_ARM_R',[(s*.07,.34,.42),(s*.07,.54,.32)],.014,MATS['metal_dark'])
        box('PEDAL_L' if s<0 else 'PEDAL_R',(s*.07,.57,.30),(.035,.045,.012),MATS['metal_dark'],.008)

    # Wheel/hub detail: concentric rings and spoke hints.
    for s in (-1,1):
        torus('FRONT_RIM_RING_L' if s<0 else 'FRONT_RIM_RING_R',(s*.56,.82,.28),.064,.010,MATS['metal'],rot=(0,math.pi/2,0))
        torus('REAR_RIM_RING_L' if s<0 else 'REAR_RIM_RING_R',(s*.65,-.64,.34),.080,.012,MATS['metal'],rot=(0,math.pi/2,0))
        for a in (0,math.pi/2,math.pi,3*math.pi/2):
            tube('FRONT_SPOKE_L' if s<0 else 'FRONT_SPOKE_R',[(s*.56,.82,.28),(s*.56+.055*math.cos(a),.82,.28+.055*math.sin(a))],.009,MATS['metal_dark'])
        coil('FRONT_SPRING_L' if s<0 else 'FRONT_SPRING_R',(s*.42,.72,.43),'z',.035,.10,.22,MATS['accent_yellow'])
        coil('REAR_SPRING_L' if s<0 else 'REAR_SPRING_R',(s*.52,-.60,.48),'z',.040,.10,.24,MATS['accent_yellow'])

    # Rear engine: compact silver block, blue/yellow bar, two unambiguous exhausts.
    engine=box('REAR_ENGINE',(0,-.70,.58),(.25,.18,.19),MATS['metal_dark'],.085)
    box('REAR_ENGINE_BLUE',(0,-.90,.73),(.18,.12,.035),MATS['body_blue'],.012)
    for s in (-1,1):
        box('REAR_ENGINE_CHEEK_L' if s<0 else 'REAR_ENGINE_CHEEK_R',(s*.20,-.76,.58),(.075,.15,.10),MATS['body_blue'],.035)

    tube('REAR_ENGINE_TOP_SEAM',[(-.22,-.96,.78),(0,-.98,.80),(.22,-.96,.78)],.012,MATS['dark'])
    box('REAR_ENGINE_LOWER_PANEL',(0,-1.00,.42),(.18,.025,.055),MATS['metal_dark'],.012)

    # Twin engine cylinders, grille slats and visible fasteners from the concept rear.
    for s in (-1,1):
        cylinder('REAR_ENGINE_CYL_L' if s<0 else 'REAR_ENGINE_CYL_R',(s*.22,-.88,.62),.105,.30,MATS['metal'],rot=(math.pi/2,0,0))
        cylinder('REAR_ENGINE_CAP_L' if s<0 else 'REAR_ENGINE_CAP_R',(s*.22,-1.06,.62),.072,.018,MATS['dark'],rot=(math.pi/2,0,0))
        sphere('REAR_ENGINE_BOLT_L' if s<0 else 'REAR_ENGINE_BOLT_R',(s*.22,-1.075,.62),.012,MATS['accent_yellow'])
    for gx in (-.10,-.05,0,.05,.10):
        box('REAR_GRILLE_BAR_'+str(gx),(gx,-1.10,.36),(.012,.018,.075),MATS['body_blue'],.004)

    # Engine housing ribs and exhaust collars make the rear a designed module, not loose tubes.
    for s in (-1,1):
        for k in range(3):
            box('ENGINE_FIN_%s_%d'%('L' if s<0 else 'R',k),(s*.24,-.91-k*.045,.62),(.115,.012,.012),MATS['metal_dark'],.004)
        torus('EXHAUST_COLLAR_L' if s<0 else 'EXHAUST_COLLAR_R',(s*.34,-1.07,.71),.052,.012,MATS['accent_yellow'],rot=(math.pi/2,0,0))

    # Rear engine clamps, exhaust lips and fin ribs.
    for s in (-1,1):
        torus('ENGINE_CLAMP_L' if s<0 else 'ENGINE_CLAMP_R',(s*.22,-.91,.62),.112,.010,MATS['accent_yellow'],rot=(math.pi/2,0,0))
        for k in (-.04,0,.04):
            box('ENGINE_FIN_L' if s<0 else 'ENGINE_FIN_R',(s*.22,-.90+k,.62),(.095,.008,.018),MATS['metal_dark'],.004)
        torus('EXHAUST_LIP_L' if s<0 else 'EXHAUST_LIP_R',(s*.34,-1.07,.71),.048,.010,MATS['metal'],rot=(math.pi/2,0,0))

    tube('REAR_BAR_BLUE',[(-.52,-.78,.76),(0,-.80,.76),(.52,-.78,.76)],.045,MATS['body_blue'])
    for s in (-1,1):
        tube('REAR_BAR_YELLOW_L' if s<0 else 'REAR_BAR_YELLOW_R',[(s*.45,-.78,.76),(s*.57,-.78,.76)],.05,MATS['accent_yellow'])
        tube('EXHAUST_CONNECTOR_L' if s<0 else 'EXHAUST_CONNECTOR_R',[(s*.20,-.82,.62),(s*.25,-.91,.64)],.028,MATS['metal_dark'])
        tube('EXHAUST_L' if s<0 else 'EXHAUST_R',[(s*.25,-.91,.64),(s*.30,-1.00,.68),(s*.34,-1.07,.71)],.045,MATS['metal'])
        sphere('EXHAUST_MOUNT_L' if s<0 else 'EXHAUST_MOUNT_R',(s*.22,-.95,.62),.022,MATS['metal_dark'])
        tube('REAR_SPRING_L' if s<0 else 'REAR_SPRING_R',[(s*.48,-.65,.57),(s*.58,-.73,.43)],.024,MATS['accent_yellow'])
        tube('REAR_ARM_L' if s<0 else 'REAR_ARM_R',[(s*.30,-.70,.48),(s*.55,-.72,.34)],.022,MATS['metal_dark'])
    torus('REAR_GRILLE',(0,-1.08,.43),.10,.022,MATS['dark'],rot=(math.pi/2,0,0))
    box('REAR_LOW_GRILLE',(0,-1.09,.31),(.16,.025,.06),MATS['metal_dark'],.008)

    box('GROUND',(0,0,-.035),(2.5,2.5,.02),MATS['concept_ground'],.0)
    sc=bpy.context.scene
    sc['asset']='The Bubble Bumper'; sc['revision']='AAA_043_REFERENCE_VIEW_MATCH'; sc['D_tire_m']=.5
    sc['source_concept']='concept-art/the-bubble-bumper/assets/the-bubble-bumper.jpg'; sc['visual_gate']='coder_pending'; sc['sol_gate']='pending'; sc['user_gate']='pending'
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
      'top':((0,0,5.0),(0,.05,.50),3.35),
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