
"""Scorecard FRONT/REAR — perfil de LARGURA por linha, mesma metrologia validada do SIDE.
Uso: python3 scorecard_fr.py <variante>
"""
import sys, os, json
import numpy as np
from PIL import Image
from collections import deque
REF="/mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/assets/reference-orthographic/"
P="/opt/blender-runner/outputs/"
GATE=0.050
def flood(mask,seed):
    vis=np.zeros_like(mask,dtype=bool); q=deque([seed]); vis[seed]=True
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not vis[ny,nx]:
                vis[ny,nx]=True; q.append((ny,nx))
    return vis
def centro(m):
    ys,xs=np.where(m)
    if len(ys)==0: return 0,0
    cy,cx=int(np.median(ys)),int(np.median(xs))
    if not m[cy,cx]:
        d=np.hypot(ys-cy,xs-cx); cy,cx=int(ys[np.argmin(d)]),int(xs[np.argmin(d)])
    return cy,cx
def mask_concept(v):
    c=np.array(Image.open(REF+v+".jpg").convert("RGB")).astype(int)
    mx,mn=c.max(2),c.min(2); raw=((mx-mn)>45)|(mx<85)
    return flood(raw,centro(raw))
def width_prof(mask,runmin=8):
    ys,xs=np.where(mask); r0,r1,c0,c1=ys.min(),ys.max(),xs.min(),xs.max()
    A=mask[r0:r1+1,c0:c1+1]; Hh,Ww=A.shape
    w=np.full(Hh,np.nan)
    for j in range(Hh):
        row=A[j]; n=len(row); i=0
        while i<n:
            if row[i]:
                k=i
                while k<n and row[k]: k+=1
                if k-i>=runmin: break
                i=k
            else: i+=1
        if i<n:
            i2=n-1
            while i2>=0:
                if row[i2]:
                    k2=i2
                    while k2>=0 and row[k2]: k2-=1
                    if i2-k2>=runmin: break
                    i2=k2
                else: i2-=1
            if i2>i: w[j]=i2-i
    return w,Hh,Ww
def lm(mask,w,Hh,Ww):
    o={}; val=~np.isnan(w); idx=np.where(val)[0]
    if len(idx)==0: return o
    bot=idx[-1]; top=idx[0]
    def band(lo,hi):
        sel=[w[j] for j in idx if lo<=j<=hi and not np.isnan(w[j])]
        return float(np.median(sel)) if sel else 0.0
    rng=bot-top+1
    o["W_topo"]=band(top,top+int(0.15*rng))/Hh
    o["W_mid"]=band(top+int(0.40*rng),top+int(0.60*rng))/Hh
    o["W_base"]=band(bot-int(0.15*rng),bot)/Hh
    o["W_max"]=float(np.nanmax(w))/Hh
    o["W_max_z"]=float(np.nanargmax(w))/Hh
    # simetria: centro do contorno por linha vs centro da bbox
    ys,xs=np.where(mask); c0b,c1b=xs.min(),xs.max()
    dif=[]
    for j in idx:
        row=mask[ys.min()+j]
        ix=np.where(row)[0]
        if len(ix): dif.append(abs((ix.min()+ix.max())/2.0-(c0b+c1b)/2.0))
    o["assim_frac"]=float(np.median(dif))/ (c1b-c0b+1) if dif else 0.0
    return o
v=sys.argv[1]
out={}
for vista,nome in (("front","FRONT"),("rear","REAR")):
    mc=mask_concept(vista); wc,Hc,Wc=width_prof(mc)
    am=np.array(Image.open(P+v+"m-"+vista+".png").convert("RGBA"))[:,:,3]>128
    wm,Hm,Wm=width_prof(am)
    # AUTO-TESTE: a largura maxima tem de ser >0 e <H*2
    for nm,w,H in (("concept",wc,Hc),("modelo",wm,Hm)):
        mx=float(np.nanmax(w))
        if not (0<mx<2.5*H):
            print("ABORTADO: %s %s: largura max %.1f implausivel (H=%d)"%(nm,vista,mx,H)); sys.exit(2)
    C=lm(mc,wc,Hc,Wc); M=lm(am,wm,Hm,Wm)
    print("="*74); print("SCORECARD %s  variante %s"%(nome,v.upper())); print("="*74)
    print("%-12s %9s %9s %9s  %s"%("landmark","concept","modelo","erro","gate"))
    for k in C:
        if k not in M: continue
        e=abs(C[k]-M[k]); print("%-12s %9.4f %9.4f %9.4f  %s"%(k,C[k],M[k],e,"OK" if e<=GATE else "FALHA"))
    out[nome]={"concept":C,"modelo":M}
json.dump(out,open(os.path.dirname(os.path.abspath(__file__))+"/../contracts/scorecard-"+v+"-fr.json","w"),indent=2)
