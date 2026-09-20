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
ovr=dict(BASE); ovr.update(EP_OVERRIDES); ovr['v']=VER
g=dict(globals()); g['OVR']=ovr
exec(compile(SRC,'bb_'+VER,'exec'),g)
R=g.get('R',{})
print(VER,'| QA=',R.get('qa',{}).get('aprovado'),'| z_range=',R.get('z_range'),'| ERRO=',R.get('ERRO'))
