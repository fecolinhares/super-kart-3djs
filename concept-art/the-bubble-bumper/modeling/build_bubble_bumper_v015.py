import bpy, math, os, argparse, json
from mathutils import Vector

ROOT=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(ROOT,'bubble-bumper-v015.blend')
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
    cu=bpy.data.curves.new(name+'_CURVE','CURVE'); cu.dimensions='3D'; cu.resolution_u=2
    cu.bevel_depth=radius; cu.bevel_resolution=3; cu.resolution_u=3
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
        mod=ob.modifiers.new('Soft authored edges','BEVEL'); mod.width=bevel; mod.segments=3
        bpy.context.view_layer.objects.active=ob; bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

def create_wheel(name, x,y,z, radius, width, material):
    return torus(name,(x,y,z),radius-width*.28,width*.38,material,rot=(0,math.pi/2,0))

def create_scene():
    global COL
    bpy.ops.wm.read_factory_settings(use_empty=True)
    COL=bpy.data.collections.new('BUBBLE_BUMPER_MASTER'); bpy.context.scene.collection.children.link(COL)
    MATS['body_blue']=mat('Body Blue',(0.025,0.22,0.72),0.15,.26)
    MATS['accent_yellow']=mat('Custom Yellow',(0.95,0.55,0.02),0.05,.3)
    MATS['rubber']=mat('Smooth Rubber',(0.008,0.010,0.014),0.0,.72)
    MATS['dark']=mat('Cockpit Dark',(0.018,0.025,0.035),0.05,.5)
    MATS['metal']=mat('Technical Silver',(0.16,0.19,0.24),0.8,.30)
    MATS['metal_dark']=mat('Technical Dark',(0.025,0.035,0.05),0.75,.34)
    MATS['glass']=mat('Cockpit Glass',(0.035,0.13,0.20),0.1,.12,emission=(0.01,0.03,0.05))
    MATS['pilot']=mat('Pilot Suit',(0.08,0.18,0.52),0.0,.42)
    MATS['pilot_yellow']=mat('Pilot Accent',(0.9,0.42,0.02),0.0,.42)
    MATS['light']=mat('Warm Lights',(1.0,.75,.28),0.0,.22,emission=(1.0,.25,.03))

    # V010 authored lower tub plus a real deck ring around the cockpit opening.
    body=loft_y('BODY_LOWER_TUB',[(.98,0,.31,.18,.08),(.72,0,.32,.30,.10),(.28,0,.33,.34,.11),(-.25,0,.35,.33,.12),(-.70,0,.38,.28,.13)],MATS['body_blue'],24)
    body['role']='lower_tub_supporting_authored_shell'; body['D']=.5
    # Authored deck surface: four longitudinal rails create a shell around an actual opening.
    deck_sections=[(.92,.20,.47,0.0),(.62,.34,.51,0.10),(.42,.405,.54,.17),(.15,.405,.55,.19),(-.18,.38,.55,.16),(-.45,.30,.52,0.0),(-.70,.26,.50,0.0)]
    dverts=[]; dfaces=[]
    for y,wo,z,wi in deck_sections:
        dverts += [(-wo,y,z),(-wi,y,z+.012),(wi,y,z+.012),(wo,y,z)]
    for j in range(len(deck_sections)-1):
        a=j*4; b=(j+1)*4
        dfaces += [(a,b,b+1,a+1),(a+2,b+2,b+3,a+3)]
        # Leave the inner edge open: this is the actual cockpit cavity.
    dfaces += [(0,1,2,3),((len(deck_sections)-1)*4,(len(deck_sections)-1)*4+3,(len(deck_sections)-1)*4+2,(len(deck_sections)-1)*4+1)]
    deck=obj_mesh('BODY_AUTHORED_DECK',dverts,dfaces,MATS['body_blue'],True); deck['role']='continuous_shell_with_excavated_cockpit'
    # rounded cockpit shoulder transitions into the side pods, not independent plates
    for s in (-1,1):
        tube('COCKPIT_SHOULDER_L' if s<0 else 'COCKPIT_SHOULDER_R',[(s*.20,.43,.53),(s*.31,.25,.54),(s*.39,-.10,.53)],.035,MATS['body_blue'])
    # rounded pods between axles; widest beside cockpit/hips
    for s in (-1,1):
        sections=[(.58,s*.41,.43,.10,.10),(.30,s*.44,.44,.16,.13),(-.18,s*.44,.45,.16,.14),(-.42,s*.39,.45,.10,.11)]
        pod=loft_y('SIDEPOD_L' if s<0 else 'SIDEPOD_R',sections,MATS['body_blue'],18)
        tube('POD_ACCENT_L' if s<0 else 'POD_ACCENT_R',[(s*.58,.65,.50),(s*.66,.25,.56),(s*.60,-.40,.56)],.018,MATS['accent_yellow'])
        tube('POD_RAIL_MOUNT_FRONT_L' if s<0 else 'POD_RAIL_MOUNT_FRONT_R',[(s*.57,.55,.50),(s*.45,.55,.48)],.018,MATS['metal_dark'])
        tube('POD_RAIL_MOUNT_REAR_L' if s<0 else 'POD_RAIL_MOUNT_REAR_R',[(s*.61,-.27,.56),(s*.45,-.27,.50)],.018,MATS['metal_dark'])
    # wheels: smooth, exposed, almost equal diameter
    for side in (-1,1):
        create_wheel('WHEEL_FL' if side<0 else 'WHEEL_FR',side*.61,.62,.29,.25,.25,MATS['rubber'])
        create_wheel('WHEEL_RL' if side<0 else 'WHEEL_RR',side*.625,-.60,.30,.2625,.30,MATS['rubber'])
    # One continuous horseshoe path: both returns travel into side-frame hardpoints.
    bumper_pts=[(-.55,.30,.20),(-.65,.50,.20),(-.70,.80,.20),(-.55,1.05,.20),(0,1.10,.20),(.55,1.05,.20),(.70,.80,.20),(.65,.50,.20),(.55,.30,.20)]
    tube("BUMPER_U",bumper_pts,.06,MATS["body_blue"])
    sphere("U_HARDPOINT_FRONT_L",(.55,.30,.20),.008,MATS["dark"])
    sphere("U_HARDPOINT_FRONT_R",(-.55,.30,.20),.008,MATS["dark"])
    sphere("U_HARDPOINT_REAR_L",(.40,1.05,.20),.008,MATS["dark"])
    sphere("U_HARDPOINT_REAR_R",(-.40,1.05,.20),.008,MATS["dark"])
    for s in (-1,1):
        tube('BUMPER_YELLOW_L' if s<0 else 'BUMPER_YELLOW_R',[(s*.70,.92,.41),(s*.57,1.16,.42)],.050,MATS['accent_yellow'])
    tube('BUMPER_YELLOW_CENTER',[(-.12,1.27,.42),(0,1.28,.42),(.12,1.27,.42)],.050,MATS['accent_yellow'])
    tube('BUMPER_HARDPOINT_L',[(-.60,.45,.42),(-.51,.34,.43),(-.43,.28,.44)],.040,MATS['metal_dark'])
    tube('BUMPER_HARDPOINT_R',[(.60,.45,.42),(.51,.34,.43),(.43,.28,.44)],.040,MATS['metal_dark'])
    tube('BUMPER_NOSE_BRIDGE',[(-.20,1.20,.43),(0,1.25,.45),(.20,1.20,.43)],.035,MATS['metal_dark'])
    # short rounded nose above bumper
    nose=loft_y('NOSE',[(.75,0,.49,.16,.10),(.98,0,.50,.22,.12),(1.18,0,.48,.14,.08)],MATS['body_blue'],18)
    box('NOSE_PANEL',(0,1.17,.49),(.10,.018,.055),MATS['accent_yellow'],.012)
    # open cockpit / seat: compact oval well and rounded coaming, not a flat plate
    ellipsoid('COCKPIT_WELL',(0,.10,.475),(.19,.27,.015),MATS['dark'],24,10)
    # Single recessed oval well; the seat is the only internal raised mass.
    box('COCKPIT_FLOOR',(0,.12,.465),(.17,.24,.012),MATS['dark'],.012)
    seat=ellipsoid('SEAT',(0,.05,.515),(.16,.24,.052),MATS['dark'],18,10)
    # steering chain is longitudinal and visually explicit: wheel -> hub/column -> dash/chassis
    torus('STEERING_WHEEL',(0,.72,.64),.115,.032,MATS['dark'],rot=(math.pi/2,0,0))
    tube('STEERING_COLUMN',[(0,.72,.64),(0,.48,.53),(0,.28,.48)],.018,MATS['metal_dark'])
    tube('STEERING_DASH_MOUNT',[(0,.28,.48),(0,.20,.46)],.026,MATS['metal_dark'])
    # explicit pelvis anchors the pilot inside the recessed seat
    ellipsoid('PILOT_PELVIS',(0,.04,.525),(.13,.16,.065),MATS['pilot'],16,10)
    torso=ellipsoid('PILOT_TORSO',(0,.03,.59),(.10,.11,.13),MATS['pilot'],16,10)
    helmet=ellipsoid('PILOT_HELMET',(0,.16,.77),(.095,.10,.10),MATS['pilot'],18,10)
    visor=ellipsoid('PILOT_VISOR',(0,.055,.78),(.068,.014,.032),MATS['glass'],16,8)
    for s in (-1,1):
        tube('PILOT_ARM_L' if s<0 else 'PILOT_ARM_R',[(s*.085,.06,.66),(s*.16,.42,.63),(s*.10,.70,.62)],.020,MATS['pilot_yellow'])
        tube('PILOT_THIGH_L' if s<0 else 'PILOT_THIGH_R',[(s*.08,.02,.53),(s*.10,.26,.48),(s*.09,.42,.43)],.032,MATS['pilot'])
    # rear mechanical module
    # Rear housing: compact, with clear circle, grille, low bar, and two side exits.
    # We'll create a housing loft that is more integrated.
    housing=loft_y('REAR_HOUSING',[(-.44,0,.55,.20,.12),(-.66,0,.58,.23,.15),(-.84,0,.55,.19,.13)],MATS['metal'],18)
    housing['role']='rear_housing_integrated'
    # Circle/grille at the rear face.
    circle('REAR_GRILLE',(-.84,0,.55),.12,MATS['dark'],24)
    # Low bar
    tube('REAR_LOW_BAR',[(-.70,0,.50),(-.90,0,.50)],.020,MATS['metal_dark'])
    # Two side exits: we'll create tubes that exit the housing to the sides.
    # Left exit
    tube('REAR_EXIT_L',[(-.84,0,.55),(-.90,-.20,.55),(-.90,-.40,.55)],.015,MATS['metal'])
    # Right exit
    tube('REAR_EXIT_R',[(-.84,0,.55),(-.90,.20,.55),(-.90,.40,.55)],.015,MATS['metal'])
    # Add spheres to make exits explicit.
    sphere('EXIT_POINT_L',(-.90,-.40,.55),.008,MATS['metal'])
    sphere('EXIT_POINT_R',(-.90,.40,.55),.008,MATS['metal'])

    # Suspension: visible and anchored.
    # Front suspension: wishbone-like tubes with explicit mounting spheres.
    # We already have hardpoints for the U; now add wishbones.
    # Front left wishbone
    tube('FRONT_WISHBONE_L',[(.45,.0,.38),(.30,.10,.35),(.20,.00,.32)],.012,MATS['metal'])
    tube('FRONT_UPPER_ARM_L',[(.45,.0,.38),(.40,.15,.40),(.30,.10,.38)],.012,MATS['metal'])
    # Front right wishbone (mirrored)
    tube('FRONT_WISHBONE_R',[(-.45,.0,.38),(-.30,.10,.35),(-.20,.00,.32)],.012,MATS['metal'])
    tube('FRONT_UPPER_ARM_R',[(-.45,.0,.38),(-.40,.15,.40),(-.30,.10,.38)],.012,MATS['metal'])
    # Rear suspension: simple trailing arms attached to housing and wheel mounts.
    # We'll create simple tubes from housing to wheel centers.
    # Rear left
    tube('REAR_ARM_L',[(-.55,.0,.62),(-.45,-.10,.55),(-.35,-.15,.50)],.012,MATS['metal'])
    tube('REAR_ARM_R',[(-.55,.0,.62),(-.45,.10,.55),(-.35,.15,.50)],.012,MATS['metal'])
    # Add mounting spheres for suspension.
    sphere('REAR_SUSP_MOUNT_L',(.55,.0,.62),.008,MATS['metal_dark'])
    sphere('REAR_SUSP_MOUNT_R',(-.55,.0,.62),.008,MATS['metal_dark'])
    sphere('FRONT_SUSP_MOUNT_L',(.45,.0,.38),.008,MATS['metal_dark'])
    sphere('FRONT_SUSP_MOUNT_R',(-.45,.0,.38),.008,MATS['metal_dark'])
    # presentation floor
    box('GROUND',(0,0,-.035),(2,2,.02),MATS['dark'],.0)
    # metadata
    sc=bpy.context.scene; sc['asset']='The Bubble Bumper'; sc['revision']='BLOCKOUT_011_OPEN_DECK_SHELL'; sc['D_tire_m']=.5; sc['source_concept']='concept-art/the-bubble-bumper/assets/the-bubble-bumper.jpg'; sc['custom_channels']='yellow,blue'; sc['visual_gate']='coder_pending'; sc['sol_gate']='pending'; sc['user_gate']='pending'
    return sc

def lights_and_camera():
    sc=bpy.context.scene; sc.world=bpy.data.worlds.new('BUBBLE_WORLD'); sc.render.engine='BLENDER_EEVEE'; sc.render.resolution_x=960; sc.render.resolution_y=720; sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG'; sc.render.film_transparent=False
    sc.world.color=(.018,.022,.030)
    target=Vector((0,.10,.48))
    def light(name,loc,energy,size,color):
        d=bpy.data.lights.new(name,'AREA'); d.energy=energy; d.shape='DISK'; d.size=size; d.color=color
        o=bpy.data.objects.new(name,d); COL.objects.link(o); o.location=loc; o.rotation_euler=(target-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    light('KEY',(-3,3,4),1000,4,(1.0,.95,.90)); light('FILL',(3,1,2.5),800,3,(.45,.65,1.0)); light('RIM',(0,-4,2.5),1100,3,(1.0,.32,.20))
    cams={
      'top':((0,0,5.0),(0,.0,.40),3.40),
      'profile':((-4.0,.05,1.0),(0,.05,.48),2.40),
      'front':((0,4.0,1.0),(0,.35,.45),1.80),
      'rear':((0,-4.0,1.0),(0,-.35,.55),1.80),
      'isometric':((-3.6,3.8,2.7),(0,.05,.52),2.20),
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