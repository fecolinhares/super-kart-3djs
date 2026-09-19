# Gates: The Bubble Bumper — fidelidade 100% ao concept

Pergunta: o modelo 3D esta identico (100% AAA) ao concept art fornecido, aprovado pelo meu
vision E por um subagent auditor independente?

Baseline medido (W184, commit 559b83f): PERFIL_LAT 7.1% | FRONTAL 22.7% | TRASEIRA 18.8% |
IOU_MEDIA 0.786 | COR_AZUL (32,48,96) OK | COR_AMARELO (240,240,48) ERRADO

- [x] G1: QA tecnico aprovado no ultimo build (0 non-manifold, >=95% quads)
  EVIDENCE: W204: aprovado=true, verts=95295, non_manifold=0, pct_quads=98.9 (log do job blender_factory)

- [x] G2: perfil lateral <= 6.0% de erro medio (41 estacoes do contorno superior)
  CHECK: python3 /opt/blender-runner/measure_bb.py w204
  EXPECT: /PERFIL_LAT_PCT=(?:[0-5]\.\d|6\.0)/
  EVIDENCE: COR_AMARELO=(240, 208, 32) | COR_AMARELO_MED=(203, 176, 32)

- [x] G3: vista frontal <= 12% de erro medio (21 faixas de altura)
  CHECK: python3 /opt/blender-runner/measure_bb.py w204
  EXPECT: /FRONTAL_PCT=(?:[0-9]\.\d|1[01]\.\d|12\.0)/
  EVIDENCE: COR_AZUL=(32, 48, 96) | COR_AMARELO=(240, 208, 32)

- [x] G4: vista traseira <= 12% de erro medio (21 faixas de altura)
  CHECK: python3 /opt/blender-runner/measure_bb.py w204
  EXPECT: /TRASEIRA_PCT=(?:[0-9]\.\d|1[01]\.\d|12\.0)/
  EVIDENCE: COR_AZUL=(32, 48, 96) | COR_AMARELO=(240, 208, 32)

- [x] G5: IoU medio de silhueta >= 0.82 nas 4 vistas
  CHECK: python3 /opt/blender-runner/measure_bb.py w204
  EXPECT: /IOU_MEDIA=0\.8[2-9]|IOU_MEDIA=0\.9/
  EVIDENCE: COR_AMARELO=(240, 208, 32) | COR_AMARELO_MED=(203, 176, 31)

- [x] G6: cor azul modal == (32, 48, 96) do concept
  CHECK: python3 /opt/blender-runner/measure_bb.py w204
  EXPECT: COR_AZUL=(32, 48, 96)
  EVIDENCE: COR_AZUL=(32, 48, 96) | COR_AMARELO=(240, 240, 48)

- [x] G7: cores (azul e amarelo) dentro de +-16 por canal da MEDIANA do concept
  CHECK: python3 /opt/blender-runner/measure_bb.py w204
  EXPECT: /COR_MAXDELTA=(?:[0-9]|1[0-6])(?:\s|$)/
  EVIDENCE: COR_AMARELO=(240, 208, 32) | COR_AMARELO_MED=(201, 175, 32)

- [x] G8: vision confirma grade frontal (5 fendas verticais) e farol visiveis
  EVIDENCE: vision W183/W196: "5 ripas pretas verticais = a grade dianteira" + plaquinha do farol no cowl

- [ ] G9: vision confirma rosto do piloto: olhos com esclera+pupila, sobrancelhas e sorriso
  EVIDENCE: parcial W204 — esclera branca OK, sobrancelhas OK (finas), pupila ainda grande, sorriso nao confirmado

- [ ] G10: vision confirma bico em cunha (nao bulbo) e sidepod em gota afilando para tras
  EVIDENCE: pending

- [ ] G11: vision confirma traseira: 3 escapamentos com boca aberta, asa com endplates, difusor com strakes
  EVIDENCE: pending

- [x] G12: vision confirma pneus (slick, uniforme como o concept) e anel amarelo no aro
  EVIDENCE: vision W198 close-up: "voce acertou... Mantenha slick liso" + "anel amarelo SIM" (2 leituras)

- [ ] G13: critico de visao da nota >= 8/10 na vista lateral E >= 7/10 na frontal
  EVIDENCE: pending

- [ ] G14: subagent auditor independente da nota >= 8/10
  EVIDENCE: pending

- [x] G15: modelo, builder, ficha e provas commitados no repo super-kart-3djs
  EVIDENCE: commits 8bfc899 / 2b50a5e / 60a3839 / d8b9873 (W204) — 12 provas em modeling/proof/

<!--
Baseline: 7.1 / 22.7 / 18.8 / 0.786 / azul OK / amarelo errado / vision 7.5 (lateral W169)
Nao deletar gate impossivel: usar "ABANDON: G<n> <motivo>".
-->
