import bpy, mathutils
objs=[]
for o in bpy.data.objects:
    if o.type!="MESH": continue
    bb=[o.matrix_world@mathutils.Vector(v) for v in o.bound_box]
    objs.append((o.name,min(v.x for v in bb),max(v.x for v in bb),min(v.y for v in bb),max(v.y for v in bb)))
X0=min(a for _,a,_,_,_ in objs); X1=max(b for _,_,b,_,_ in objs); L=X1-X0
Z0=min(min(v.z for v in bb) for bb in [[o.matrix_world@mathutils.Vector(c) for c in o.bound_box] for o in bpy.data.objects if o.type=="MESH"])
Z1=max(max(v.z for v in bb) for bb in [[o.matrix_world@mathutils.Vector(c) for c in o.bound_box] for o in bpy.data.objects if o.type=="MESH"])
H=Z1-Z0
print("###PERFIL2###")
print("  L=%.3f H=%.3f"%(L,H))
for k in range(0,101,8):
    x=X1-L*k/100.0
    ys=[]
    for n,a,b,y0,y1 in objs:
        if a<=x<=b: ys += [y0,y1]
    larg=(max(ys)-min(ys)) if ys else 0.0
    print("  %3d%% %.3f"%(k,larg/H))   # normalizado pela ALTURA (mesmo do concept)
