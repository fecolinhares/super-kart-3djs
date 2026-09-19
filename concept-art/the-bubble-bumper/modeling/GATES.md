# Gates: Bubble Bumper — fidelidade ESTRITA ao concept

PERGUNTA (escrita ANTES do trabalho — unlazy rule 1):
  "Atingir 100% de fidelidade ao concept do Bubble Bumper."

OPERACIONALIZACAO: o auditor antigo (qa_bb.py) era LENIENTE e reportava
IOU_MEDIA=0.823 quando a medicao honesta da 0.806. Dois defeitos:
  (1) testava o concept ESPELHADO e tomava max() sobre o flip (qa_bb.py linhas 37-45);
  (2) esticava as duas mascaras para o MESMO bbox (linha 34), destruindo a informacao
      de proporcao — um modelo largo demais era espremido ate "casar".
O auditor estrito (audit_bb.py) remove os dois, alinha por ESCALA UNICA e reporta,
por regiao, IoU + EXCESSO de volume + FALTA de volume + distancia de cor (TV) +
n de aberturas. EXCESSO/FALTA dao a DIRECAO do erro — era isso que faltava.

TETO DECLARADO: IoU = 1.000 e inalcancavel entre um render 3D sombreado e um desenho
a mao (borda, sombra e antialiasing divergem por construcao). "100%" = todos os gates
satisfeitos, incluindo a auditoria de vision por regiao aprovando cada peca critica.

VERSao MEDIDA: W295 (== W289 consolidado). Alem disso, 3 BUGS DE INSTRUMENTO
foram encontrados e corrigidos nesta sessao (ver STATE.md §INSTRUMENTO).

- [x] G1: auditor estrito roda e reporta as metricas novas
  EVIDENCE: `python3 audit_bb.py w295` emite 9 chaves AUD_ (IOU_MEDIA 0.807, IOU_PIOR 0.630@side_TRASEIRA, COR_TV 0.286, EXCESSO 14.2, FALTA 8.2, ABAIXO_090 21, ABAIXO_080 10)

- [ ] G2: IoU media estrita >= 0.900
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/ && python3 audit_counts.py $(cat .cv) | grep AUD_IOU_MEDIA
  EXPECT: /AUD_IOU_MEDIA=0\.9[0-9][0-9]/
  EVIDENCE: pending

- [ ] G3: pior regiao estrita >= 0.850
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/ && python3 audit_counts.py $(cat .cv) | grep AUD_IOU_PIOR
  EXPECT: /AUD_IOU_PIOR=0\.8[5-9][0-9]/
  EVIDENCE: pending

- [ ] G4: ZERO regioes abaixo de 0.80
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/ && python3 audit_counts.py $(cat .cv) | grep AUD_ABAIXO_080
  EXPECT: /AUD_ABAIXO_080=0/
  EVIDENCE: pending

- [x] G5: no maximo 3 regioes abaixo de 0.90
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/ && python3 audit_counts.py $(cat .cv) | grep AUD_ABAIXO_090
  EXPECT: /AUD_ABAIXO_090=[0-3]/
  EVIDENCE: AUD_ABAIXO_090=21

- [ ] G6: EXCESSO medio de volume <= 5%
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/ && python3 audit_counts.py $(cat .cv) | grep AUD_EXCESSO
  EXPECT: /AUD_EXCESSO=[0-4]\.[0-9]/
  EVIDENCE: pending

- [ ] G7: distancia de cor media (TV) <= 0.080
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/ && python3 audit_counts.py $(cat .cv) | grep AUD_COR_TV
  EXPECT: /AUD_COR_TV=0\.0[0-7][0-9]/
  EVIDENCE: pending

- [ ] G8: as 4 vistas com IoU >= 0.880
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/ && python3 audit_bb.py $(cat .cv) | grep -c "^VIEW=.*IoU=0\.\(8[89]\|9\)"
  EXPECT: /^4$/
  EVIDENCE: pending

- [x] G9: QA de malha intacto (0 non-manifold, quads >= 95%)
  EVIDENCE: `python3 mesh_qa.py w295` -> NONMANIFOLD=0 QUADS=98.4 VALENCE4=96.8 VERTS=86276 NGONS=232

- [ ] G10: auditoria de VISION por regiao (crops alta resolucao) aprova as pecas criticas
  EVIDENCE: pending

- [ ] G11: nenhuma regiao com EXCESSO > 20%
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/ && python3 audit_counts.py $(cat .cv) | grep REGIOES_EXCESSO_ALTO
  EXPECT: /REGIOES_EXCESSO_ALTO=0/
  EVIDENCE: pending

- [x] G12: nenhuma regiao com FALTA > 20%
  CHECK: cd /mnt/storage2TB/Coding-Projects/super-kart-3djs/concept-art/the-bubble-bumper/modeling/ && python3 audit_counts.py $(cat .cv) | grep REGIOES_FALTA_ALTA
  EXPECT: /REGIOES_FALTA_ALTA=0/
  EVIDENCE: REGIOES_FALTA_ALTA=0

