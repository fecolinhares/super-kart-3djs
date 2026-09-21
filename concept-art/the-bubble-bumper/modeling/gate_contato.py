#!/usr/bin/env python3
"""GATE DE CONTATO: mede INTERSECCAO VOLUMETRICA REAL entre pares de pecas (BVHTree.overlap).
overlap>0 = as malhas se cruzam (CONTATO). overlap==0 = flutuam (FALHA).
Regra 127: bbox sobreposto em 1 eixo NAO e contato — este gate e a prova objetiva.
Uso: blender -b arquivo.blend --python gate_contato.py
"""
import bpy, bmesh, sys, json, os
from mathutils.bvhtree import BVHTree
PARES=[("C_Col","C_Wheel"),("C_Col","C_Floor"),("P_GripL","C_Wheel"),("P_GripL","P_ArmL"),
       ("R_Header","R_Exh0"),("R_Header","R_Exh1"),("R_Header","R_Exh2"),("R_Header","R_Block"),
       ("R_WingLegL","R_WingBar"),("R_WingLegR","R_WingBar"),
       ("R_WingBar","R_EndplateL"),("R_WingBar","R_EndplateR"),
       ("C_PodMountL","SP_L"),("C_PodMountR","SP_R"),("C_PodMountL","C_Floor"),
       ("C_RimFL","W_FL"),("C_RimRL","W_RL"),("SP_L","C_Floor"),("SP_R","C_Floor"),
       ("P_Torso","SP_L"),("P_Helmet","P_Torso")]
def tree(o):
    bm=bmesh.new(); bm.from_mesh(o.data); bm.transform(o.matrix_world)
    t=BVHTree.FromBMesh(bm); bm.free(); return t
def main():
    falhas=[]; ok=0; aus=0
    for a,b in PARES:
        A=bpy.data.objects.get(a); B=bpy.data.objects.get(b)
        if not(A and B and A.type=="MESH" and B.type=="MESH"): aus+=1; continue
        n=len(tree(A).overlap(tree(B)))
        if n>0: ok+=1
        else: falhas.append("%s x %s"%(a,b))
    print("###CONTATO### contato=%d  flutuantes=%d  ausentes=%d  de %d pares"%(ok,len(falhas),aus,len(PARES)))
    for f in falhas: print("   FLUTUA:",f)
    return 0 if not falhas else 1
sys.exit(main())
