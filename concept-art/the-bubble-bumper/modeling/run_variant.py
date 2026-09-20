import json, os
BASE=json.load(open("/mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/BASE_PARAMS.json"))
SRC=open("/tmp/bb25.py").read()
old="        zt=prof_top(xf)*H*0.88"
new=("        _k0=P.get('nose_top_k',0.88); _k1=P.get('nose_top_k2',1.00)\n"
     "        _u=max(0.0,min(1.0,(xf-P.get('nose_k_x0',0.10))/P.get('nose_k_ramp',0.06)))\n"
     "        zt=prof_top(xf)*H*(_k0+(_k1-_k0)*_u)")
assert old in SRC, "patch do nariz nao encontrou o alvo"
SRC=SRC.replace(old,new,1)

# patch 2: endplate com parametro PROPRIO (cap_s e compartilhado com o capacete)
old2="        _cs=P.get('cap_s',(0.085,0.042,0.085)); ep.scale=_cs"
new2="        _cs=P.get('ep_s',P.get('cap_s',(0.085,0.042,0.085))); ep.scale=_cs"
if old2 in SRC:
    SRC=SRC.replace(old2,new2,1)

# patch 3: airbox com meia-largura x parametrizavel (0.058 faz as 3 caixas se SOBREPOREM -> barra solida)
old3="ab=box('Airbox%d'%j,(xx,0,zz),(0.058,ry_,rz_),bevel=0.020,segs=3)"
new3="ab=box('Airbox%d'%j,(xx,0,zz),(P.get('ab_x',0.058),ry_,rz_),bevel=0.020,segs=3)"
if old3 in SRC:
    SRC=SRC.replace(old3,new3,1)

# patch 4: Airbox_Duct com deslocamento z e raio parametrizaveis (o duct em z 0.774 fecha o vao que o
# concept deixa aberto em imagem 0.69-0.73 na linha t 0.66)
old4="abt=sweep('Airbox_Duct',[(-0.462,0,0.774),(-0.575,0,0.704),(-0.668,0,0.628)],0.054,18)"
new4="abt=sweep('Airbox_Duct',[(-0.462,0,0.774+P.get('abt_dz',0.0)),(-0.575,0,0.704+P.get('abt_dz',0.0)),(-0.668,0,0.628+P.get('abt_dz',0.0))],P.get('abt_r',0.054),18)"
if old4 in SRC:
    SRC=SRC.replace(old4,new4,1)
ovr=dict(BASE); ovr.update(EP_OVERRIDES); ovr['v']=VER
g=dict(globals()); g['OVR']=ovr
exec(compile(SRC,'bb_'+VER,'exec'),g)
R=g.get('R',{})
print(VER,'| QA=',R.get('qa',{}).get('aprovado'),'| z_range=',R.get('z_range'),'| ERRO=',R.get('ERRO'))
