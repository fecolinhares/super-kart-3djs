# GATES — Bubble Bumper: fidelidade ao concept

**PERGUNTA (rule one):** o modelo 3D deve ser a versão 3D do concept art — mesma forma,
mesmas proporções, mesmas peças, mesma leitura em todas as vistas.
Todo gate abaixo é uma medida dessa pergunta.

Baseline medido: **W233** = IoU media 0.809 · **pior região 0.680** (FRONT/CAPACETE)
· P10 media 0.743 · perfil 7.4% · frontal 11.5% · traseira 10.7% · cor Δ7 · 0 non-manifold

QA executável: `cd modeling && python3 qa_bb.py <versao>`
Checker: `cd modeling && node ~/.hermes/profiles/coder/skills/unlazy/scripts/gate-check.mjs GATES.md`

---

- [x] G1: QA tecnico aprovado no build (0 non-manifold, >=95% quads)
  EVIDENCE: W250 aprovado=true, verts=86212, non_manifold=0, pct_quads=98.4, valence4 96.8 (log job 20260919-045200-b3f7c5)

- [ ] G2: pior regiao (menor IoU parte x vista) >= 0.780  [baseline W233 0.684 -> W250 0.705]
  CHECK: python3 qa_bb.py W250 | grep ^IOU_MENOR_REGIAO
  EXPECT: IOU_MENOR_REGIAO=0\.[789]

- [ ] G3: media das 10 piores regioes >= 0.800  [baseline W233 0.740 -> W250 0.745]
  CHECK: python3 qa_bb.py W250 | grep ^IOU_P10_MEDIA
  EXPECT: IOU_P10_MEDIA=0\.[89]

- [ ] G4: IoU de silhueta media >= 0.830  [baseline W233 0.809 -> W250 0.811]
  CHECK: python3 qa_bb.py W250 | grep ^IOU_MEDIA
  EXPECT: IOU_MEDIA=0\.8[3-9]

- [ ] G5: erro do perfil lateral <= 6.5%  [baseline W233 7.4 -> W250 7.3]
  CHECK: python3 qa_bb.py W250 | grep ^PERFIL_LAT_PCT
  EXPECT: PERFIL_LAT_PCT=[0-6]\.[0-9]

- [ ] G6: erro da vista frontal <= 9.5%  [baseline W233 11.5 -> W250 11.1]
  CHECK: python3 qa_bb.py W250 | grep ^FRONTAL_PCT
  EXPECT: FRONTAL_PCT=[0-9]\.[0-9]

- [ ] G7: erro da vista traseira <= 9.5%  [baseline W233 10.7 -> W250 10.5]
  CHECK: python3 qa_bb.py W250 | grep ^TRASEIRA_PCT
  EXPECT: TRASEIRA_PCT=[0-9]\.[0-9]

- [ ] G8: desvio de cor por canal <= 5  [baseline W233 7 -> W250 6]
  CHECK: python3 qa_bb.py W250 | grep ^COR_MAXDELTA
  EXPECT: COR_MAXDELTA=[0-5]

- [ ] G9: TOP/ASA >= 0.780 (planta traseira: asa fina, nao chapa)  [baseline W233 0.684 -> W250 0.705]
  CHECK: python3 qa_bb.py W250 | grep ^IOU_TOP_ASA
  EXPECT: IOU_TOP_ASA=0\.[789]

- [ ] G10: TOP/BICO_U >= 0.780 (planta dianteira)  [baseline W233 0.693 -> W250 0.716]
  CHECK: python3 qa_bb.py W250 | grep ^IOU_TOP_BICO_U
  EXPECT: IOU_TOP_BICO_U=0\.[789]

- [ ] G11: FRONT/PARACH >= 0.780 (para-choque visto de frente)  [baseline W233 0.702 -> W250 0.706]
  CHECK: python3 qa_bb.py W250 | grep ^IOU_FRONT_PARACH
  EXPECT: IOU_FRONT_PARACH=0\.[789]

- [ ] G12: SIDE/TRASEIRA >= 0.780 (silhueta traseira de perfil)  [baseline W233 0.708 -> W250 0.708]
  CHECK: python3 qa_bb.py W250 | grep ^IOU_SIDE_TRASEIRA
  EXPECT: IOU_SIDE_TRASEIRA=0\.[789]

- [ ] G13: auditor independente sem contexto do autor confirma fidelidade
  EVIDENCE: pending

- [ ] G14: modelo, builder, ficha, gates e provas commitados no repo
  EVIDENCE: pending

<!--
HISTORICO (nao apagar): W184 7.1/22.7/18.8/0.786 -> W202 5.9/8.9/6.7/0.821 -> W233 7.4/11.5/10.7/0.809.
CORRECAO DE INSTRUMENTO (importante): ate W233 as regioes de FRONT/REAR do qa_bb usavam faixas no eixo
ERRADO (colunas = largura, nao altura). Isso fazia FRONT_CAPACETE marcar 0.680 constante em 4 geometrias
diferentes — probe quebrado, nao achado. Com o eixo correto, FRONT_CAPACETE = 0.984 (o MELHOR, nao o pior)
e o pior real e TOP_ASA 0.684. Regra: metrica que nao responde a uma mudanca real de geometria esta quebrada.
As notas do critico de visao oscilaram 3-8 na mesma peca enquanto as metricas melhoravam: nota = ruido.
Gate impossivel: usar linha propria "ABANDON: G<n> <motivo>".
-->
