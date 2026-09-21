#!/usr/bin/env python3
"""Gate de DIRECIONALIDADE: mede o IoU entre FRONT e REAR do modelo e compara com o concept.
Um kart DIRECIONAL (bico em C na frente, motor/3 escapes/asa atras) tem IoU BAIXO.
IoU alto = o modelo e simetrico frente-tras = nao e um kart direcional.
Uso: python3 gate_direcionalidade.py <prefixo_dos_renders>   (ex: /tmp/GG_B129_)
"""
import sys, numpy as np
from PIL import Image
RAIZ="/mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/"
REF=RAIZ+"assets/reference-orthographic/"
def carrega(p):
    a=np.asarray(Image.open(p).convert("RGBA")); return a[:,:,3]>0
def norm(m,h=400):
    ys,xs=np.where(m)
    if not len(ys): return np.zeros((h,h),bool)
    c=m[ys.min():ys.max()+1, xs.min():xs.max()+1]
    im=Image.fromarray((c*255).astype(np.uint8)).resize((h,h))
    return np.asarray(im).astype(bool)
def iou(A,B): return (A&B).sum()/max(1,(A|B).sum())
def mascara_concept(v):
    im=np.asarray(Image.open(REF+"%s.jpg"%v).convert("L"))
    return im<245
if __name__=="__main__":
    pre=sys.argv[1] if len(sys.argv)>1 else "/tmp/GG_B129_"
    mf=norm(carrega(pre+"front.png")); mr=norm(carrega(pre+"rear.png"))
    cf=norm(mascara_concept("front")); cr=norm(mascara_concept("rear"))
    im_,ic=iou(mf,mr),iou(cf,cr)
    print("FRONT vs REAR — MODELO IoU %.3f | CONCEPT IoU %.3f"%(im_,ic))
    print("  (kart direcional tem IoU BAIXO; o concept esta em %.2f)"%ic)
    dif=im_-ic
    veredito="FALHA" if dif>0.15 else ("ALERTA" if dif>0.08 else "ok")
    print("  diferenca %+.3f  ->  %s"%(dif,veredito))
    sys.exit(1 if veredito=="FALHA" else 0)
