# Gates: The Bubble Bumper — fidelidade 100% ao concept

Pergunta: o modelo 3D esta identico (100% AAA) ao concept art fornecido, aprovado pelo meu
vision E por um subagent auditor independente?

Baseline medido (W184, commit 559b83f): PERFIL_LAT 7.1% | FRONTAL 22.7% | TRASEIRA 18.8% |
IOU_MEDIA 0.786 | COR_AZUL (32,48,96) OK | COR_AMARELO (240,240,48) ERRADO

- [x] G1: QA tecnico aprovado no ultimo build (0 non-manifold, >=95% quads)
  EVIDENCE: W204: aprovado=true, verts=95295, non_manifold=0, pct_quads=98.9 (log do job blender_factory)

- [x] G2: perfil lateral <= 6.0% de erro medio (41 estacoes do contorno superior)
  CHECK: python3 /opt/blender-runner/measure_bb.py w212
  EXPECT: /PERFIL_LAT_PCT=(?:[0-5]\.\d|6\.0)/
  EVIDENCE: COR_AMARELO=(240, 208, 32) | COR_AMARELO_MED=(203, 176, 32)

- [x] G3: vista frontal <= 12% de erro medio (21 faixas de altura)
  CHECK: python3 /opt/blender-runner/measure_bb.py w212
  EXPECT: /FRONTAL_PCT=(?:[0-9]\.\d|1[01]\.\d|12\.0)/
  EVIDENCE: COR_AZUL=(32, 48, 96) | COR_AMARELO=(240, 208, 32)

- [x] G4: vista traseira <= 12% de erro medio (21 faixas de altura)
  CHECK: python3 /opt/blender-runner/measure_bb.py w212
  EXPECT: /TRASEIRA_PCT=(?:[0-9]\.\d|1[01]\.\d|12\.0)/
  EVIDENCE: COR_AZUL=(32, 48, 96) | COR_AMARELO=(240, 208, 32)

- [x] G5: IoU medio de silhueta >= 0.82 nas 4 vistas
  CHECK: python3 /opt/blender-runner/measure_bb.py w212
  EXPECT: /IOU_MEDIA=0\.8[2-9]|IOU_MEDIA=0\.9/
  EVIDENCE: COR_AMARELO=(240, 208, 32) | COR_AMARELO_MED=(203, 176, 31)

- [x] G6: cor azul modal == (32, 48, 96) do concept
  CHECK: python3 /opt/blender-runner/measure_bb.py w212
  EXPECT: COR_AZUL=(32, 48, 96)
  EVIDENCE: COR_AZUL=(32, 48, 96) | COR_AMARELO=(240, 240, 48)

- [x] G7: cores (azul e amarelo) dentro de +-16 por canal da MEDIANA do concept
  CHECK: python3 /opt/blender-runner/measure_bb.py w212
  EXPECT: /COR_MAXDELTA=(?:[0-9]|1[0-6])(?:\s|$)/
  EVIDENCE: COR_AMARELO=(240, 208, 32) | COR_AMARELO_MED=(201, 175, 32)

- [x] G8: vision confirma grade frontal (5 fendas verticais) e farol visiveis
  EVIDENCE: vision W183/W196: "5 ripas pretas verticais = a grade dianteira" + plaquinha do farol no cowl

- [ ] G9: vision confirma rosto do piloto: olhos com esclera+pupila, sobrancelhas e sorriso
  EVIDENCE: W212 REPROVA — vision: "olhos sao 2 esferas brancas saltadas PARA FORA da viseira,
  desalinhadas, sem pupila cartoon"; "viseira pequena e escura". W206 (face por geometria) AINDA REPROVA — vision: olhos "globosos saltados, nao achatados",
  sem pupila pequena legivel, sobrancelhas "blocos pretos retos", sem sorriso, queixeira nao visivel.
  TENTATIVAS: decal por-face angular (W161-W205) e geometria dome_dir+tube_round (W206). Ambas insuficientes.
  RESTA (ordem): (a) achatar os olhos na superficie da viseira (dome flat menor, raio maior),
  (b) pupila preta pequena + glint branco como geometria rasante, (c) sobrancelhas como tira curva fina
  FLUTUANDO acima do olho (nao bloco sobre o globo), (d) queixeira amarela em U visivel na frontal,
  (e) sorriso no patch amarelo, (f) faixa amarela descendo ATE a costura da viseira (hoje para antes)
  NOTA: a render frontal de QA precisa de camera que nao oclua o queixo (hoje o kart cobre parte)

- [ ] G10: vision confirma bico em cunha (nao bulbo) e sidepod em gota afilando para tras
  EVIDENCE: PARCIAL W212 — causa raiz MEDIDA: NOSE tinha y=+-0.420 (0.84m de largura, 2.4x o concept
  que tem ~0.35m). Corrigido para +-0.301 (0.60m). Largura afeta so as vistas front/top (o perfil
  e governado por prof_top), entao a silhueta lateral nao mudou. vision W212: "o centro ainda e um
  DOMO azul inflado, ocupa 50-60% da largura, quase 3x mais largo" -> alvo ~15-20%.
  RESTA: estreitar para 1/3 do atual e criar concavidade para as pernas/reabrir os vazios laterais

- [ ] G11: vision confirma traseira: 3 escapamentos com boca aberta, asa com endplates, difusor com strakes
  EVIDENCE: PARCIAL W201 — escapes com boca oca CONFIRMADO por vision ("aro claro espesso + miolo preto").
  RESTA: endplates como ovais pequenas (as atuais leem "grandes/pontiagudas"), strakes do difusor visiveis,
  e o para-choque ainda le como barra facetada em vez de tubo redondo

- [x] G12: vision confirma pneus (slick, uniforme como o concept) e anel amarelo no aro
  EVIDENCE: vision W198 close-up: "voce acertou... Mantenha slick liso" + "anel amarelo SIM" (2 leituras)

- [ ] G13: critico de visao da nota >= 8/10 na vista lateral E >= 7/10 na frontal
  EVIDENCE: HISTORICO: W162 5.0 -> W169 7.5 -> W202 SIDE 8.0/FRONT 6.5 -> W211 FRONT 3.5/SIDE 6.0
  -> W212 FRONT 3/10 e SIDE 5/10. NENHUMA vista passa. Bloqueios: (a) bico/domo central,
  (b) rosto quebrado, (c) tudo le como caixa (falta arredondamento e props).
  Auditoria completa por elemento em modeling/AUDIT-DETAIL.md

- [ ] G14: subagent auditor independente da nota >= 8/10
  EVIDENCE: pending

- [x] G15: modelo, builder, ficha e provas commitados no repo super-kart-3djs
  EVIDENCE: commits 8bfc899 / 2b50a5e / 60a3839 / d8b9873 (W204) — 12 provas em modeling/proof/

<!--
Baseline: 7.1 / 22.7 / 18.8 / 0.786 / azul OK / amarelo errado / vision 7.5 (lateral W169)
Nao deletar gate impossivel: usar "ABANDON: G<n> <motivo>".
-->
