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

# patch 5: encurtamento dos escapamentos em x (os 3 tubos diferem em Y e se projetam no MESMO x na vista
# lateral -> fundem num run continuo; o concept deixa -0.66..-0.92 VAZIO em z~0.62)
old5="    exb=P.get('exh_x',XRE+0.041)"
new5="    exb=P.get('exh_x',XRE+0.041)+P.get('exh_short',0.0)"
if old5 in SRC:
    SRC=SRC.replace(old5,new5,1)

# patch 6: escapamentos L/R encurtados em X (o CENTRAL mantem o extremo exb -> x_range preservado).
# Os L/R diferem do central so em Y, entao na vista lateral projetam no MESMO x e fundem num run continuo;
# o concept deixa x -0.66..-0.92 vazio em z~0.62.
old6="        pt=((exb,sy*0.240,0.472+_edz),(XR-0.20,sy*0.185,0.420+_edz),(EXC-0.16,sy*0.110,0.392+_edz))"
new6="        _lr=P.get('exh_lr_short',0.0); pt=((exb+_lr,sy*0.240,0.472+_edz),(XR-0.20+_lr*0.5,sy*0.185,0.420+_edz),(EXC-0.16,sy*0.110,0.392+_edz))"
if old6 in SRC:
    SRC=SRC.replace(old6,new6,1)

# patch 7: DUCT com deslocamento em X (o duct ocupa x -0.582..-0.690 = exatamente o vao1 do concept em t0.54)
old7="abt=sweep('Airbox_Duct',[(-0.462,0,0.774+P.get('abt_dz',0.0)),(-0.575,0,0.704+P.get('abt_dz',0.0)),(-0.668,0,0.628+P.get('abt_dz',0.0))],P.get('abt_r',0.054),18)"
new7="abt=sweep('Airbox_Duct',[(-0.462,0,0.774+P.get('abt_dz',0.0)),(-0.575+P.get('abt_dx',0.0)*0.5,0,0.704+P.get('abt_dz',0.0)),(-0.668+P.get('abt_dx',0.0),0,0.628+P.get('abt_dz',0.0))],P.get('abt_r',0.054),18)"
if old7 in SRC:
    SRC=SRC.replace(old7,new7,1)

# patch 8: hastes (Airbox_Strut / Wing_Pylon) encurtadas para baixo — elas se fundem com a asa em z
old8a="sp=sweep('Airbox_Strut_'+('L' if sy>0 else 'R'),[(XRE+0.345,sy*0.078,0.596),(XRE+0.330,sy*0.090,0.430)],0.028,14)"
new8a="sp=sweep('Airbox_Strut_'+('L' if sy>0 else 'R'),[(XRE+0.345,sy*0.078,0.596+P.get('strut_dz',0.0)),(XRE+0.330,sy*0.090,0.430)],0.028,14)"
if old8a in SRC:
    SRC=SRC.replace(old8a,new8a,1)

# patch 9: Airbox de x -0.830 (o box 'Airbox' com half-extent 0.100 HARDCODED) — ocupa vao2 inteiro em t0.54
old9="ab=box('Airbox',(XRE+0.360,0,0.585),(0.100,0.118,0.078),bevel=0.032,segs=4)"
new9="ab=box('Airbox',(XRE+0.360+P.get('ab2_dx',0.0),0,0.585),(P.get('ab2_x',0.100),0.118,0.078),bevel=0.032,segs=4)"
if old9 in SRC:
    SRC=SRC.replace(old9,new9,1)

# patch 10: frente dos escapamentos em X (o material em -0.77..-0.84 e o residuo do vao t0.54)
old10a="ex= tube_round('Exh_C',[(EXC-0.16,0,0.340+P.get('exh_dz',0.130))"
if old10a in SRC:
    pass

old9b="ab2=box('Airbox_Top',(XRE+0.360,0,0.655),(0.082,0.094,0.030),bevel=0.016,segs=3)"
new9b="ab2=box('Airbox_Top',(XRE+0.360+P.get('ab2_dx',0.0),0,0.655),(P.get('ab2_x2',0.082),0.094,0.030),bevel=0.016,segs=3)"
if old9b in SRC:
    SRC=SRC.replace(old9b,new9b,1)
# patch 10: frente dos escapamentos em X (residuo do vao t0.54 em -0.77..-0.84)
old10a="tube_round('Exh_C',[(EXC-0.16,0.0,0.340+_edz),(XR-0.20,0.0,0.382+_edz),(exb,0.0,0.412+_edz)]"
new10a="tube_round('Exh_C',[(EXC-0.16+P.get('exh_fx',0.0),0.0,0.340+_edz),(XR-0.20,0.0,0.382+_edz),(exb,0.0,0.412+_edz)]"
if old10a in SRC:
    SRC=SRC.replace(old10a,new10a,1)
old10b="(EXC-0.16,sy*0.110,0.392+_edz)"
new10b="(EXC-0.16+P.get('exh_fx',0.0),sy*0.110,0.392+_edz)"
if old10b in SRC:
    SRC=SRC.replace(old10b,new10b,1)
# patch 11: z PROPRIO do escapamento CENTRAL (desacopla do exh_dz global que baixa os 3 juntos)
old11a="(EXC-0.16+P.get('exh_fx',0.0),0.0,0.340+_edz),(XR-0.20,0.0,0.382+_edz),(exb,0.0,0.412+_edz)"
new11a="(EXC-0.16+P.get('exh_fx',0.0),0.0,0.340+_edz+P.get('exh_c_dz',0.0)),(XR-0.20,0.0,0.382+_edz+P.get('exh_c_dz',0.0)),(exb,0.0,0.412+_edz+P.get('exh_c_dz',0.0))"
if old11a in SRC:
    SRC=SRC.replace(old11a,new11a,1)
# patch 12: RAIO proprio dos escapamentos L/R (o topo 0.667 e o ocupante da banda -0.77..-0.84)
old12="d('Exh_'+st,list(pt)[::-1],0.080,26)"
new12="d('Exh_'+st,list(pt)[::-1],P.get('exh_lr_r',0.080),26)"
if old12 in SRC:
    SRC=SRC.replace(old12,new12,1)
# patch 13: Z proprio dos escapamentos L/R (unica alavanca com efeito PROVADO na banda -0.77..-0.84)
old13a="0.472+_edz)"
new13a="0.472+_edz+P.get('exh_lr_dz',0.0))"
if old13a in SRC:
    SRC=SRC.replace(old13a,new13a,1)
old13b="0.420+_edz)"
new13b="0.420+_edz+P.get('exh_lr_dz',0.0))"
if old13b in SRC:
    SRC=SRC.replace(old13b,new13b,1)
old13c="sy*0.110,0.392+_edz)"
new13c="sy*0.110,0.392+_edz+P.get('exh_lr_dz',0.0))"
if old13c in SRC:
    SRC=SRC.replace(old13c,new13c,1)
# patch 14: TRANSLACAO RIGIDA em X pos-escala (compensa deslocamento do x_range sem tocar comprimento/z_range)
old14="    R['target_length']=_tl"
new14="""    _xt=P.get('xtrans',0.0)
    if _xt:
        for o in FINS: o.data.transform(Matrix.Translation((_xt,0.0,0.0)))
    R['xtrans']=_xt
    R['target_length']=_tl"""
if old14 in SRC:
    SRC=SRC.replace(old14,new14,1)
# patch 15: DELECAO controlada por material+faixa, ANTES do passe de mascara canonico
old15="# --- passe de MASCARA"
new15="""# --- DELECAO CONTROLADA (patch 15): esconde faces por material e faixa, no pipeline canonico ---
_dm=P.get('del_mat'); _dz=P.get('del_z'); _dx=P.get('del_x')
if _dm and _dz and _dx:
    import bmesh as _bm
    _n=0
    for _o in FINS:
        if _o.type!='MESH': continue
        _ms=[m.name for m in _o.data.materials]
        if _dm not in _ms: continue
        _i=_ms.index(_dm)
        _b=_bm.new(); _b.from_mesh(_o.data); _b.faces.ensure_lookup_table()
        _k=[]
        for _f in _b.faces:
            if _f.material_index!=_i: continue
            _zs=[_v.co.z for _v in _f.verts]; _xs=[_v.co.x for _v in _f.verts]
            if min(_zs)<=_dz[1] and max(_zs)>=_dz[0] and min(_xs)>=_dx[0] and max(_xs)<=_dx[1]:
                _k.append(_f)
        if _k:
            _bm.ops.delete(_b, geom=_k, context='FACES'); _b.to_mesh(_o.data); _n+=len(_k)
        _b.free()
    R['del_mat']=_dm; R['del_n']=_n
# --- passe de MASCARA"""
if old15 in SRC:
    SRC=SRC.replace(old15,new15,1)

old8b="py=tube_round('Wing_Pylon_'+('L' if sy>0 else 'R'),[(wx1+0.075,sy*0.150,wz-0.030),(wx1+0.130,sy*0.150,0.512)],0.036,14)"
new8b="py=tube_round('Wing_Pylon_'+('L' if sy>0 else 'R'),[(wx1+0.075,sy*0.150,wz-0.030+P.get('strut_dz',0.0)),(wx1+0.130,sy*0.150,0.512)],0.036,14)"
if old8b in SRC:
    SRC=SRC.replace(old8b,new8b,1)
ovr=dict(BASE); ovr.update(EP_OVERRIDES); ovr['v']=VER
g=dict(globals()); g['OVR']=ovr
exec(compile(SRC,'bb_'+VER,'exec'),g)
R=g.get('R',{})
print(VER,'| QA=',R.get('qa',{}).get('aprovado'),'| z_range=',R.get('z_range'),'| ERRO=',R.get('ERRO'))
