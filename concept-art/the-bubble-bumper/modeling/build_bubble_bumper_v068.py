import bpy, math, os, sys, json
from mathutils import Vector

# The Bubble Bumper V068: authored primary surfaces + controlled mechanical detail.
# Front is +Y, rear -Y, up +Z. Runner passes its job directory after "--".
ROOT = os.path.dirname(os.path.abspath(__file__))
JOB_DIR = sys.argv[-1] if sys.argv and not sys.argv[-1].endswith('.py') else ROOT
OUT = os.path.join(JOB_DIR, 'bubble-bumper-v068.blend')
RENDER_DIR = os.path.join(JOB_DIR, 'renders-v068')
os.makedirs(RENDER_DIR, exist_ok=True)
COL = None
MATS = {}


def material(name, color, metallic=0.0, rough=0.45):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1.0)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = rough
    return m


def mesh_obj(name, verts, faces, mat, smooth=True):
    me = bpy.data.meshes.new(name + '_MESH')
    me.from_pydata(verts, [], faces)
    me.update()
    if mat:
        me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    COL.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = smooth
    return ob


def finish(ob, bevel=0.0, weighted=True):
    if bevel > 0:
        mod = ob.modifiers.new('AUTHORED_SUPPORT_BEVEL', 'BEVEL')
        mod.width = bevel
        mod.segments = 4
        mod.limit_method = 'ANGLE'
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        ob.select_set(False)
    if weighted:
        try:
            mod = ob.modifiers.new('WEIGHTED_NORMAL', 'WEIGHTED_NORMAL')
            mod.keep_sharp = True
            bpy.context.view_layer.objects.active = ob
            ob.select_set(True)
            bpy.ops.object.modifier_apply(modifier=mod.name)
            ob.select_set(False)
        except Exception:
            pass
    return ob


def uv_ellipsoid(name, loc, scale, mat, seg=48, rings=24, bevel=0.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return finish(ob, bevel, False)


def cylinder(name, loc, radius, depth, mat, direction=(0, 0, 1), vertices=48, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(mat)
    ob.rotation_euler = Vector((0, 0, 1)).rotation_difference(Vector(direction).normalized()).to_euler()
    for p in ob.data.polygons:
        p.use_smooth = True
    return finish(ob, bevel, False)


def tube(name, points, radius, mat, bevel_resolution=5):
    cu = bpy.data.curves.new(name + '_CURVE', 'CURVE')
    cu.dimensions = '3D'
    cu.resolution_u = 16
    cu.bevel_depth = radius
    cu.bevel_resolution = bevel_resolution
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(points) - 1)
    for bp, p in zip(sp.bezier_points, points):
        bp.co = p
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    ob = bpy.data.objects.new(name, cu)
    COL.objects.link(ob)
    cu.materials.append(mat)
    return ob


def torus(name, loc, major, minor, mat, rot=(0, 0, 0), major_segments=64, minor_segments=16):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=major_segments, minor_segments=minor_segments, location=loc, rotation=rot)
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def box(name, loc, scale, mat, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    return finish(ob, bevel, True)


def loft_y(name, sections, mat, sides=64):
    # Authored continuous shell: sections are (y, cx, cz, rx, rz), with dense support loops.
    dense = []
    for a, b in zip(sections, sections[1:]):
        for k in range(4):
            t = k / 4.0
            dense.append(tuple(a[i] * (1 - t) + b[i] * t for i in range(5)))
    dense.append(tuple(sections[-1]))
    verts, faces = [], []
    for y, cx, cz, rx, rz in dense:
        for i in range(sides):
            ang = 2 * math.pi * i / sides
            verts.append((cx + rx * math.cos(ang), y, cz + rz * math.sin(ang)))
    for j in range(len(dense) - 1):
        for i in range(sides):
            ni = (i + 1) % sides
            faces.append((j*sides+i, j*sides+ni, (j+1)*sides+ni, (j+1)*sides+i))
    a = len(verts)
    y, cx, cz, rx, rz = dense[0]
    verts.append((cx, y, cz))
    b = len(verts)
    y, cx, cz, rx, rz = dense[-1]
    verts.append((cx, y, cz))
    for i in range(sides):
        ni = (i + 1) % sides
        faces.append((a, ni, i))
        start = (len(dense)-1)*sides
        faces.append((b, start+i, start+ni))
    ob = mesh_obj(name, verts, faces, mat, True)
    ob['representation'] = 'authored_continuous_surface'
    return ob


def loft_z(name, sections, mat, sides=48):
    # Connected stylized torso/seat volumes. sections=(z,cx,cy,rx,ry).
    verts, faces = [], []
    for z, cx, cy, rx, ry in sections:
        for i in range(sides):
            ang = 2 * math.pi * i / sides
            verts.append((cx + rx*math.cos(ang), cy + ry*math.sin(ang), z))
    for j in range(len(sections)-1):
        for i in range(sides):
            ni=(i+1)%sides
            faces.append((j*sides+i,j*sides+ni,(j+1)*sides+ni,(j+1)*sides+i))
    c0=len(verts); z,cx,cy,rx,ry=sections[0]; verts.append((cx,cy,z))
    c1=len(verts); z,cx,cy,rx,ry=sections[-1]; verts.append((cx,cy,z))
    for i in range(sides):
        ni=(i+1)%sides; faces.extend([(c0,i,ni),(c1,(len(sections)-1)*sides+ni,(len(sections)-1)*sides+i)])
    ob=mesh_obj(name,verts,faces,mat,True)
    ob['representation']='authored_connected_stylized_form'
    return ob


def rounded_ring(name, center_y, z, outer_x, outer_y, inner_x, inner_y, mat, segments=24):
    # Planar cockpit rim with actual opening and inner wall, not a painted hole.
    def points(rx, ry, zz):
        pts=[]
        for cx, cy, start in [(rx-0.06, center_y+ry-0.06, 0), (-rx+0.06, center_y+ry-0.06, math.pi/2), (-rx+0.06, center_y-ry+0.06, math.pi), (rx-0.06, center_y-ry+0.06, 3*math.pi/2)]:
            for k in range(segments//4):
                a=start + (k/(segments//4-1))*math.pi/2
                pts.append((cx+0.06*math.cos(a), cy+0.06*math.sin(a), zz))
        return pts
    outer=points(outer_x, outer_y, z)
    inner=points(inner_x, inner_y, z-0.035)
    verts=outer+inner
    faces=[]
    n=len(outer)
    for i in range(n):
        j=(i+1)%n
        faces.append((i,j,n+j,n+i))
    ob=mesh_obj(name,verts,faces,mat,True)
    return finish(ob,0.018,False)


def create_wheel(name, x, y, z, radius, width, tire_mat, metal_mat):
    # Broad smooth tire with explicit rim, hub and sidewall rings.
    torus(name+'_TIRE',(x,y,z),radius-width*0.22,width*0.43,tire_mat,rot=(0,math.pi/2,0),major_segments=72,minor_segments=20)
    cylinder(name+'_RIM',(x + (0.012 if x > 0 else -0.012),y,z),radius*0.52,width*0.58,metal_mat,direction=(1,0,0),vertices=64,bevel=.008)
    torus(name+'_RIM_RING',(x + (0.03 if x > 0 else -0.03),y,z),radius*0.37,radius*0.035,metal_mat,rot=(0,math.pi/2,0),major_segments=48,minor_segments=12)
    cylinder(name+'_HUB',(x + (0.055 if x > 0 else -0.055),y,z),radius*0.15,width*0.72,MATS['black'],direction=(1,0,0),vertices=40,bevel=.006)


def coil(name, x, y, z, radius, height, mat, turns=5):
    pts=[]
    for i in range(61):
        t=i/60; a=2*math.pi*turns*t
        pts.append((x+radius*math.cos(a), y+radius*math.sin(a), z-height/2+height*t))
    return tube(name,pts,.012,mat,4)


def bolt(name, loc, radius=.012, mat=None, direction=(0,1,0)):
    return cylinder(name,loc,radius,radius*1.6,mat or MATS['metal'],direction=direction,vertices=24,bevel=.002)


def create_scene():
    global COL
    bpy.ops.wm.read_factory_settings(use_empty=True)
    COL=bpy.data.collections.new('BUBBLE_BUMPER_V068_AUTHORED')
    bpy.context.scene.collection.children.link(COL)
    MATS.update({
        'blue': material('Concept Blue',(0.006,0.045,0.32),0.25,.24),
        'blue_dark': material('Deep Blue',(0.003,0.012,0.09),0.30,.28),
        'yellow': material('Concept Yellow',(0.95,0.58,0.015),0.08,.25),
        'rubber': material('Smooth Rubber',(0.004,0.005,0.007),0.0,.74),
        'black': material('Cockpit Structure',(0.008,0.012,0.020),0.18,.36),
        'metal': material('Brushed Silver',(.42,.47,.54),0.72,.22),
        'metal_dark': material('Dark Mechanical Metal',(.055,.070,.095),0.70,.29),
        'face': material('Pilot Face',(.58,.67,.69),0.0,.32),
        'white': material('Eye White',(.96,.97,.91),0.0,.2),
        'visor': material('Dark Visor',(.008,.025,.070),0.35,.12),
        'suit': material('Pilot Suit Blue',(.008,.035,.16),0.0,.38),
        'ground': material('Neutral Ground',(.46,.49,.53),0,.88),
        'clay': material('Clay Proof',(.58,.60,.63),0,.62),
    })

    # Primary authored shell. Front nose and rear deck are continuous surfaces around an open cockpit.
    nose=loft_y('PRIMARY_NOSE_SHELL',[
        (1.02,0,.43,.11,.065),(0.88,0,.445,.19,.085),(0.66,0,.47,.285,.105),
        (0.42,0,.505,.34,.125),(0.28,0,.525,.34,.13)
    ],MATS['blue'],72)
    nose['role']='primary_shell_nose'
    # Side shoulder rails wrap the cockpit opening and transition into pods.
    for s in (-1,1):
        rail=loft_y('PRIMARY_SHOULDER_L' if s<0 else 'PRIMARY_SHOULDER_R',[
            (0.46,s*.22,.49,.075,.085),(0.28,s*.29,.515,.072,.095),
            (-0.02,s*.31,.525,.072,.10),(-0.32,s*.285,.515,.070,.095),(-0.49,s*.22,.49,.065,.08)
        ],MATS['blue'],56)
        rail['role']='continuous_cockpit_shoulder_transition'
    reardeck=loft_y('PRIMARY_REAR_DECK',[
        (-0.39,0,.515,.25,.12),(-0.54,0,.535,.27,.13),(-0.70,0,.55,.22,.12)
    ],MATS['blue_dark'],64)
    reardeck['role']='primary_shell_rear_termination'

    # Physical side pods: closed authored swept outer shell plus recessed inner blue volume.
    for s in (-1,1):
        pod=loft_y('SIDE_POD_SHELL_L' if s<0 else 'SIDE_POD_SHELL_R',[
            (0.43,s*.47,.32,.16,.11),(0.30,s*.52,.34,.17,.125),(0.04,s*.54,.35,.18,.135),
            (-0.24,s*.52,.34,.17,.125),(-0.46,s*.46,.31,.13,.105)
        ],MATS['yellow'],56)
        pod['role']='authored_pod_shell'
        inset=loft_y('SIDE_POD_RECESSED_BLUE_L' if s<0 else 'SIDE_POD_RECESSED_BLUE_R',[
            (0.31,s*.705,.33,.030,.055),(0.18,s*.735,.35,.034,.078),(-0.04,s*.742,.35,.036,.088),
            (-0.24,s*.720,.33,.032,.072),(-0.35,s*.675,.31,.026,.050)
        ],MATS['blue'],40)
        inset['role']='recessed_pod_inset'
        # Real inner mount/collar establishes pod-to-frame contact.
        tube('POD_INNER_MOUNT_FRONT_L' if s<0 else 'POD_INNER_MOUNT_FRONT_R',[(s*.30,.34,.40),(s*.18,.34,.43)],.022,MATS['metal_dark'])
        tube('POD_INNER_MOUNT_REAR_L' if s<0 else 'POD_INNER_MOUNT_REAR_R',[(s*.32,-.31,.40),(s*.20,-.38,.47)],.022,MATS['metal_dark'])
        for yy in (-.27,.25): bolt('POD_BOLT_%s_%s'%(s,yy),(s*.68,yy,.44),.013,MATS['metal'])

    # Open cockpit: raised rim, lowered well, seat and support structure.
    rounded_ring('COCKPIT_REAL_OPENING',.02,.585,.285,.40,.205,.305,MATS['black'],32)
    well=loft_y('COCKPIT_RECESSED_WELL',[(.32,0,.37,.19,.07),(.14,0,.355,.215,.08),(-.24,0,.37,.18,.075)],MATS['black'],56)
    well['role']='recessed_open_cockpit'
    uv_ellipsoid('SEAT_CUSHION',(0,-.08,.465),(.145,.245,.055),MATS['black'],48,24)
    uv_ellipsoid('SEAT_BACK',(0,-.29,.66),(.145,.07,.24),MATS['blue_dark'],48,24)
    tube('SEAT_LEFT_RAIL',[(-.16,-.30,.47),(-.16,.18,.48)],.018,MATS['metal_dark'])
    tube('SEAT_RIGHT_RAIL',[(.16,-.30,.47),(.16,.18,.48)],.018,MATS['metal_dark'])

    # Wheels and explicit suspension mounts.
    wheels=[('FL',-.58,.66,.25,.25,.22),('FR',.58,.66,.25,.25,.22),('RL',-.67,-.55,.263,.263,.30),('RR',.67,-.55,.263,.263,.30)]
    for name,x,y,z,r,w in wheels:
        create_wheel(name,x,y,z,r,w,MATS['rubber'],MATS['metal'])
        s=-1 if x<0 else 1
        tube('UPRIGHT_'+name,[(s*.39,y-.01,.39),(x,y,z)],.023,MATS['metal_dark'])
        tube('LOWER_ARM_'+name,[(s*.22,y+.04,.35),(x,y-.02,z-.05)],.022,MATS['metal'])
        tube('UPPER_ARM_'+name,[(s*.24,y-.05,.56),(x,y-.02,z+.06)],.018,MATS['metal_dark'])
    # Dampers and springs at the rear, visibly lateral in rear view.
    for s in (-1,1):
        coil('REAR_SPRING_L' if s<0 else 'REAR_SPRING_R',s*.49,-.57,.49,.045,.18,MATS['yellow'],5)
        tube('REAR_DAMPER_L' if s<0 else 'REAR_DAMPER_R',[(s*.49,-.57,.39),(s*.49,-.57,.64)],.023,MATS['metal'])

    # Front bumper: one deep U curve, split only by physical collars.
    bumper=[(-.40,.88,.30),(-.55,.92,.30),(-.66,1.00,.30),(-.69,1.10,.30),(-.62,1.18,.30),(-.43,1.22,.30),(0,1.24,.30),(.43,1.22,.30),(.62,1.18,.30),(.69,1.10,.30),(.66,1.00,.30),(.55,.92,.30),(.40,.88,.30)]
    tube('FRONT_BUMPER_U_CONTINUOUS',bumper,.058,MATS['blue'],6)['role']='true_external_u_with_returns'
    # Yellow concept segmentation is physical geometry, not a texture sticker.
    tube('BUMPER_YELLOW_CENTER',[(-.075,1.243,.30),(0,1.24,.30),(.075,1.243,.30)],.064,MATS['yellow'],6)
    tube('BUMPER_YELLOW_LEFT',[(-.63,1.00,.30),(-.69,1.10,.30),(-.63,1.17,.30)],.064,MATS['yellow'],6)
    tube('BUMPER_YELLOW_RIGHT',[(.63,1.00,.30),(.69,1.10,.30),(.63,1.17,.30)],.064,MATS['yellow'],6)
    for s in (-1,1):
        tube('BUMPER_SOCKET_L' if s<0 else 'BUMPER_SOCKET_R',[(s*.40,.88,.30),(s*.30,.76,.40)],.024,MATS['metal_dark'])
        cylinder('BUMPER_SOCKET_COLLAR_L' if s<0 else 'BUMPER_SOCKET_COLLAR_R',(s*.40,.88,.30),.075,.025,MATS['metal'],direction=(1,0,0),vertices=40)

    # Nose panel and front structure behind U.
    nose_panel=loft_y('NOSE_YELLOW_PANEL',[(1.00,0,.475,.07,.035),(.76,0,.495,.13,.045)],MATS['yellow'],48)
    nose_panel['role']='centered_nose_color_boundary'
    box('FRONT_NARROW_GRILLE',(0,.91,.39),(.16,.025,.065),MATS['metal_dark'],.018)
    for x in (-.10,-.05,0,.05,.10): box('FRONT_GRILLE_SLOT_'+str(x),(x,.878,.39),(.008,.012,.038),MATS['black'],.003)

    # Rear module: compact, layered, mechanically legible and confined between rear tyres.
    housing=loft_y('REAR_AUTHORED_HOUSING',[
        (-.61,0,.57,.20,.16),(-.73,0,.58,.23,.17),(-.86,0,.56,.19,.15)
    ],MATS['metal_dark'],56)
    housing['role']='compact_central_rear_housing'
    cylinder('REAR_CENTRAL_CIRCULAR_HOUSING',(0,-.90,.53),.115,.055,MATS['metal'],direction=(0,-1,0),vertices=64,bevel=.008)
    torus('REAR_CENTRAL_OUTLET',(0,-.94,.53),.078,.020,MATS['black'],rot=(math.pi/2,0,0),major_segments=48,minor_segments=12)
    # Exactly two exhausts, angled up and outward.
    for s in (-1,1):
        base=Vector((s*.17,-.76,.64)); end=Vector((s*.31,-1.00,.81)); direction=end-base
        cylinder('REAR_EXHAUST_L' if s<0 else 'REAR_EXHAUST_R',(base+end)/2,.082,direction.length,MATS['metal'],direction=direction,vertices=56,bevel=.006)
        torus('EXHAUST_LIP_L' if s<0 else 'EXHAUST_LIP_R',end,.065,.014,MATS['metal'],rot=(Vector((0,0,1)).rotation_difference(direction.normalized()).to_euler()),major_segments=48,minor_segments=12)
        bolt('EXHAUST_BOLT_L' if s<0 else 'EXHAUST_BOLT_R',base,.012,MATS['black'],direction=direction)
    # Rear transverse blue bar and yellow tips.
    tube('REAR_TRANSVERSE_BAR',[(-.57,-.91,.80),(0,-.93,.80),(.57,-.91,.80)],.043,MATS['blue'],6)
    for s in (-1,1):
        tube('REAR_BAR_YELLOW_TIP_L' if s<0 else 'REAR_BAR_YELLOW_TIP_R',[(s*.49,-.915,.80),(s*.62,-.90,.80)],.052,MATS['yellow'],6)
    # Lower separated grille with physical vertical bars.
    box('REAR_LOWER_GRILLE_FRAME',(0,-.955,.34),(.17,.025,.085),MATS['blue_dark'],.012)
    for i,x in enumerate((-.12,-.075,-.03,.03,.075,.12)):
        box('REAR_GRILLE_BAR_%02d'%i,(x,-.988,.34),(.010,.012,.065),MATS['metal_dark'],.003)
    for s in (-1,1):
        tube('REAR_BRACE_L' if s<0 else 'REAR_BRACE_R',[(s*.19,-.73,.48),(s*.42,-.87,.34)],.020,MATS['metal'])

    # Driver: connected seated forms, authored torso/pelvis and bent contact limbs.
    loft_z('PILOT_CONNECTED_TORSO',[(.50,0,-.10,.115,.105),(.59,0,-.08,.13,.12),(.72,0,-.03,.11,.11),(.80,0,.025,.085,.085)],MATS['suit'],48)
    loft_z('PILOT_CONNECTED_PELVIS',[(.47,0,-.13,.115,.11),(.52,0,-.11,.14,.12),(.58,0,-.08,.115,.105)],MATS['suit'],48)
    tube('PILOT_NECK',[(0,.045,.76),(0,.055,.855)],.050,MATS['suit'],6)
    # Helmet shell and colored band/face panel.
    uv_ellipsoid('PILOT_HELMET_SHELL',(0,.075,.925),(.16,.155,.175),MATS['blue'],56,32)
    uv_ellipsoid('PILOT_HELMET_YELLOW_BAND',(0,.130,.935),(.163,.028,.18),MATS['yellow'],48,24)
    uv_ellipsoid('PILOT_FACE_PLATE',(0,.210,.912),(.108,.020,.088),MATS['face'],48,24)
    uv_ellipsoid('PILOT_VISOR',(0,.230,.978),(.090,.012,.035),MATS['visor'],48,20)
    for s in (-1,1):
        uv_ellipsoid('PILOT_EYE_L' if s<0 else 'PILOT_EYE_R',(s*.044,.236,.935),(.025,.010,.030),MATS['white'],32,18)
        uv_ellipsoid('PILOT_PUPIL_L' if s<0 else 'PILOT_PUPIL_R',(s*.044,.247,.935),(.009,.006,.013),MATS['black'],24,14)
        # Bent arms visibly meet steering wheel.
        shoulder=(s*.105,.05,.75); elbow=(s*.17,.27,.69); wrist=(s*.10,.45,.665)
        tube('PILOT_ARM_L' if s<0 else 'PILOT_ARM_R',[shoulder,elbow,wrist],.032,MATS['suit'],6)
        uv_ellipsoid('PILOT_GLOVE_L' if s<0 else 'PILOT_GLOVE_R',wrist,(.040,.035,.032),MATS['yellow'],32,18)
        # Bent thighs and lower legs remain inside the cockpit envelope.
        hip=(s*.10,-.03,.53); knee=(s*.15,.18,.43); ankle=(s*.10,.36,.34)
        tube('PILOT_THIGH_L' if s<0 else 'PILOT_THIGH_R',[hip,knee],.043,MATS['suit'],6)
        tube('PILOT_SHIN_L' if s<0 else 'PILOT_SHIN_R',[knee,ankle],.032,MATS['suit'],6)
        box('PILOT_BOOT_L' if s<0 else 'PILOT_BOOT_R',(s*.10,.41,.315),(.045,.075,.025),MATS['black'],.012)
    torus('STEERING_WHEEL',(0,.47,.67),.105,.025,MATS['black'],rot=(math.pi/2,0,0),major_segments=56,minor_segments=16)
    cylinder('STEERING_HUB',(0,.47,.67),.036,.045,MATS['metal_dark'],direction=(0,1,0),vertices=40,bevel=.004)
    tube('STEERING_COLUMN',[(0,.47,.67),(0,.27,.565)],.019,MATS['metal_dark'],5)

    # A few premium physical break lines and fasteners on the shell.
    for s in (-1,1):
        tube('POD_LOWER_SEAM_L' if s<0 else 'POD_LOWER_SEAM_R',[(s*.64,.24,.31),(s*.66,-.18,.31)],.009,MATS['blue_dark'],4)
    tube('NOSE_CENTER_SEAM',[(0,.58,.57),(0,.90,.50)],.008,MATS['blue_dark'],4)

    # Ground for neutral proof only; excluded from asset collection by role.
    ground=box('PROOF_GROUND',(0,0,-.035),(2.2,2.2,.02),MATS['ground'],0)
    ground['role']='proof_only'
    configure_scene()
    sc=bpy.context.scene
    sc['asset']='The Bubble Bumper'
    sc['revision']='V068_AUTHORED_REPRESENTATION_RESET'
    sc['source_concept']='assets/the-bubble-bumper.jpg'
    sc['source_orthos']='assets/reference-orthographic/{top,front,rear,side}.jpg'
    sc['representation']='authored_primary_surfaces_hybrid_mechanical'
    sc['visual_gate']='pending'
    sc['sol_gate']='pending'
    sc['user_gate']='pending'
    return sc


def configure_scene():
    sc=bpy.context.scene
    sc.render.engine='BLENDER_EEVEE'
    sc.render.resolution_x=960; sc.render.resolution_y=720; sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG'
    sc.render.film_transparent=False
    sc.render.filepath=os.path.join(RENDER_DIR,'isometric.png')
    sc.world=bpy.data.worlds.new('BUBBLE_WORLD')
    sc.world.color=(.48,.50,.54)
    try: sc.view_settings.look='AgX - Medium High Contrast'
    except Exception: pass
    target=Vector((0,.18,.53))
    def area(name,loc,energy,size,color):
        d=bpy.data.lights.new(name,'AREA'); d.energy=energy; d.shape='DISK'; d.size=size; d.color=color
        o=bpy.data.objects.new(name,d); COL.objects.link(o); o.location=loc
        o.rotation_euler=(target-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    area('KEY',(-3.5,3.5,4.5),520,4.5,(1.0,.96,.90))
    area('FILL',(3.0,1.2,2.5),260,4.0,(.55,.68,1.0))
    area('RIM',(0,-4.0,3.0),320,3.5,(1.0,.80,.58))
    cams={
        'top':((0,0,5.0),(0,.10,.50),2.05),
        'side':((4.2,.05,1.18),(0,.08,.56),2.05),
        'front':((0,4.4,1.05),(0,.62,.56),1.68),
        'rear':((0,-4.4,1.12),(0,-.78,.58),1.68),
        'isometric':((3.65,4.0,2.65),(0,.08,.57),2.12),
    }
    for name,(loc,t,ortho) in cams.items():
        d=bpy.data.cameras.new('CAM_'+name.upper()); d.type='ORTHO'; d.ortho_scale=ortho
        c=bpy.data.objects.new('CAM_'+name.upper(),d); COL.objects.link(c); c.location=loc
        c.rotation_euler=(Vector(t)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
        sc['camera_'+name+'_ortho']=ortho
    sc.camera=bpy.data.objects['CAM_ISOMETRIC']


def render_all(sc):
    for name in ('top','side','front','rear','isometric'):
        sc.camera=bpy.data.objects['CAM_'+name.upper()]
        sc.render.filepath=os.path.join(RENDER_DIR,name+'.png')
        bpy.ops.render.render(write_still=True)


def main():
    sc=create_scene()
    bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
    render_all(sc)
    # Save again with the exact camera/render state used for evidence.
    bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
    print('BUBBLE_BUMPER_V068_OK',OUT,'OBJECTS',len(bpy.data.objects),'RENDERS',len([n for n in os.listdir(RENDER_DIR) if n.endswith('.png')]))

if __name__=='__main__':
    main()
