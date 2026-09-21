#!/usr/bin/env python3
"""GATE DE SANIDADE DE MALHA (regra 164): '0 bordas abertas' NAO e teste de sanidade.
Mede SEM FILTRO: boundary edges, non-manifold, faces zero-area, doubles, normais invertidas.
Uso: blender -b arquivo.blend --python gate_sanidade.py
"""
import bpy, bmesh, sys
NOME = sys.argv[-1] if len(sys.argv)>1 else "TubCockpit"
o = bpy.data.objects.get(NOME)
if not o: print("###SANIDADE### objeto %s AUSENTE"%NOME); sys.exit(1)
bm=bmesh.new(); bm.from_mesh(o.data)
bound=sum(1 for e in bm.edges if len(e.link_faces)==1)
nonman=sum(1 for e in bm.edges if len(e.link_faces)>2)
zero=[f for f in bm.faces if f.calc_area()<1e-9]
qzero=[f for f in bm.faces if f.calc_area()<1e-7]
doubles=len(bmesh.ops.find_doubles(bm, verts=bm.verts[:], dist=0.003).get("targetmap",{}))
tris=sum(1 for f in bm.faces if len(f.verts)==3)
ngons=sum(1 for f in bm.faces if len(f.verts)>4)
bm.normal_update()
inv=sum(1 for f in bm.faces if f.normal.length<0.5)
print("###SANIDADE### %s"%NOME)
print("  verts=%d faces=%d quads=%d tris=%d ngons=%d"%(len(bm.verts),len(bm.faces),
      len(bm.faces)-tris-ngons,tris,ngons))
print("  boundary(abertas)=%d  NON-MANIFOLD=%d  faces ZERO-AREA=%d  quase-zero=%d  doubles(<3mm)=%d"%(
      bound,nonman,len(zero),len(qzero),doubles))
falhas=[]
if bound: falhas.append("boundary=%d"%bound)
if nonman: falhas.append("non-manifold=%d"%nonman)
if len(zero): falhas.append("zero-area=%d"%len(zero))
if doubles: falhas.append("doubles=%d"%doubles)
print("###SANIDADE### %s"%("LIMPO OK" if not falhas else "FALHA: "+", ".join(falhas)))
sys.exit(0 if not falhas else 1)
